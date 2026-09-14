/**
 * Cobrança ao cliente do evento e Pix de saída ao freelancer.
 * O preço da PayCrew vem do plano da agência (função preco_efetivo),
 * nunca de valores editáveis pela própria agência.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const arredonda = (n: number) => Math.round(n * 100) / 100;

const cobrancaSchema = z.object({
  clienteId: z.string().uuid(),
  eventoId: z.string().uuid().nullable().optional(),
  valor: z.number().positive().max(1_000_000),
  forma: z.enum(["pix", "boleto", "cartao"]),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().min(3).max(200),
});

/** Cria a cobrança do cliente do evento no Asaas, com split da taxa. */
export const criarCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cobrancaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", userId)
      .maybeSingle();
    const empresaId = usuario?.empresa_id;
    if (!empresaId) throw new Error("Usuário sem agência.");

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, cpf_cnpj, email, telefone")
      .eq("id", data.clienteId)
      .maybeSingle();
    if (!cliente) throw new Error("Cliente não encontrado.");
    if (!cliente.cpf_cnpj)
      throw new Error("Cadastre o CPF/CNPJ do cliente antes de cobrar.");

    const documentoLimpo = cliente.cpf_cnpj.replace(/\D+/g, "");
    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14)
      throw new Error("CPF/CNPJ inválido para emitir a cobrança.");

    const { precoEfetivo } = await import("./pagamentos.server");
    const preco = await precoEfetivo(supabase, empresaId);

    const { data: registro, error: erroInsert } = await supabase
      .from("cobrancas")
      .insert({
        empresa_id: empresaId,
        tipo: "cobranca_cliente",
        cliente_id: cliente.id,
        evento_id: data.eventoId ?? null,
        descricao: data.descricao,
        valor: data.valor,
        forma: data.forma,
        vencimento: data.vencimento,
        status: "rascunho",
      })
      .select("id")
      .single();
    if (erroInsert || !registro) throw new Error(erroInsert?.message ?? "Falha ao registrar.");

    try {
      const { garantirClienteAsaas, criarCobrancaAsaas, obterPixCopiaCola } = await import(
        "./asaas.server"
      );
      const clienteAsaasId = await garantirClienteAsaas({
        nome: cliente.nome,
        cpfCnpj: documentoLimpo,
        email: cliente.email,
        telefone: cliente.telefone,
        referenciaExterna: cliente.id,
      });

      await supabase
        .from("clientes")
        .update({ parceiro_cliente_id: clienteAsaasId })
        .eq("id", cliente.id);

      const masterWalletId = process.env["ASAAS_MASTER_WALLET_ID"];
      const usaPercentual =
        preco &&
        !preco.em_trial &&
        (preco.modelo === "percentual_evento" ||
          preco.modelo === "assinatura_percentual") &&
        preco.percentual > 0;

      const split =
        masterWalletId && usaPercentual
          ? [{ walletId: masterWalletId, percentualValue: preco!.percentual }]
          : undefined;

      const cobranca = await criarCobrancaAsaas({
        clienteAsaasId,
        valor: data.valor,
        forma: data.forma,
        vencimento: data.vencimento,
        descricao: data.descricao,
        referenciaExterna: registro.id,
        ...(split ? { split } : {}),
      });

      if (split?.length && preco) {
        const valorTaxa = arredonda((data.valor * preco.percentual) / 100);
        if (valorTaxa > 0) {
          await supabase.from("taxas_plataforma").insert({
            empresa_id: empresaId,
            evento_id: data.eventoId ?? null,
            cobranca_id: registro.id,
            modelo: preco.modelo as
              | "percentual_evento"
              | "taxa_fixa_pix"
              | "assinatura_percentual",
            base_calculo: data.valor,
            valor: valorTaxa,
            status: "pendente",
          });
        }
      }

      const pix = data.forma === "pix" ? await obterPixCopiaCola(cobranca.id) : null;

      await supabase
        .from("cobrancas")
        .update({
          status: "aguardando_pagamento",
          parceiro_cobranca_id: cobranca.id,
          link_pagamento: cobranca.invoiceUrl ?? cobranca.bankSlipUrl ?? null,
          pix_copia_cola: pix,
        })
        .eq("id", registro.id);

      return { id: registro.id, link: cobranca.invoiceUrl ?? null, pix };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha no parceiro de pagamento.";
      await supabase.from("cobrancas").update({ erro: mensagem }).eq("id", registro.id);
      throw new Error(mensagem);
    }
  });

/** Consulta o Asaas e credita o saldo quando a cobrança já foi paga. */
export const sincronizarCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cobranca } = await supabase
      .from("cobrancas")
      .select("id, empresa_id, valor, status, parceiro_cobranca_id, descricao")
      .eq("id", data.id)
      .maybeSingle();
    if (!cobranca) throw new Error("Cobrança não encontrada.");
    if (cobranca.status === "pago") return { status: "pago" as const };
    if (!cobranca.parceiro_cobranca_id) throw new Error("Cobrança sem registro no parceiro.");

    const { obterCobrancaAsaas } = await import("./asaas.server");
    const remota = await obterCobrancaAsaas(cobranca.parceiro_cobranca_id);
    const pago = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(remota.status);
    if (!pago) return { status: remota.status };

    const { data: taxaPendente } = await supabase
      .from("taxas_plataforma")
      .select("id, valor")
      .eq("cobranca_id", cobranca.id)
      .eq("status", "pendente")
      .maybeSingle();

    const valorCredito = taxaPendente
      ? Math.max(0, Number(cobranca.valor) - Number(taxaPendente.valor))
      : Number(cobranca.valor);

    await supabase
      .from("cobrancas")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", cobranca.id);

    await supabase.from("movimentos_saldo").insert({
      empresa_id: cobranca.empresa_id,
      tipo: "credito",
      valor: valorCredito,
      descricao: `Cobrança paga — ${cobranca.descricao}`,
      cobranca_id: cobranca.id,
    });

    if (taxaPendente) {
      await supabase
        .from("taxas_plataforma")
        .update({ status: "cobrada" })
        .eq("id", taxaPendente.id);
    }

    return { status: "pago" as const };
  });

/** Envia o Pix ao freelancer contra o saldo da agência. */
export const executarPagamentoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pagamentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enviarPix } = await import("./pagamentos.server");
    return enviarPix(context.supabase, data.pagamentoId);
  });
