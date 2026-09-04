/**
 * Fluxo financeiro real: saldo da agência, cobranças (aporte ou cliente),
 * taxa da plataforma e Pix de saída para o freelancer via Asaas.
 *
 * Regra do dinheiro: o Pix só sai contra saldo disponível. O saldo entra por
 * aporte da agência ou por cobrança paga pelo cliente do evento.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const arredonda = (n: number) => Math.round(n * 100) / 100;

const cobrancaSchema = z.object({
  tipo: z.enum(["aporte_agencia", "cobranca_cliente"]),
  clienteId: z.string().uuid().nullable().optional(),
  eventoId: z.string().uuid().nullable().optional(),
  valor: z.number().positive().max(1_000_000),
  forma: z.enum(["pix", "boleto", "cartao"]),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().min(3).max(200),
});

/** Cria a cobrança no Asaas e guarda link/Pix copia-e-cola. */
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

    const { data: empresa } = await supabase
      .from("empresas")
      .select("nome, cnpj, email_cobranca")
      .eq("id", empresaId)
      .maybeSingle();
    if (!empresa) throw new Error("Agência não encontrada.");

    let nome = empresa.nome;
    let documento = empresa.cnpj;
    let email = empresa.email_cobranca;
    let telefone: string | null = null;
    let clienteId: string | null = null;

    if (data.tipo === "cobranca_cliente") {
      if (!data.clienteId) throw new Error("Selecione o cliente do evento.");
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id, nome, cpf_cnpj, email, telefone")
        .eq("id", data.clienteId)
        .maybeSingle();
      if (!cliente) throw new Error("Cliente não encontrado.");
      if (!cliente.cpf_cnpj)
        throw new Error("Cadastre o CPF/CNPJ do cliente antes de cobrar.");
      nome = cliente.nome;
      documento = cliente.cpf_cnpj;
      email = cliente.email;
      telefone = cliente.telefone;
      clienteId = cliente.id;
    }

    const documentoLimpo = (documento ?? "").replace(/\D+/g, "");
    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14)
      throw new Error("CPF/CNPJ inválido para emitir a cobrança.");

    const { data: registro, error: erroInsert } = await supabase
      .from("cobrancas")
      .insert({
        empresa_id: empresaId,
        tipo: data.tipo,
        cliente_id: clienteId,
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
        nome,
        cpfCnpj: documentoLimpo,
        email,
        telefone,
        referenciaExterna: clienteId ?? empresaId,
      });

      if (clienteId) {
        await supabase
          .from("clientes")
          .update({ parceiro_cliente_id: clienteAsaasId })
          .eq("id", clienteId);
      }

      const cobranca = await criarCobrancaAsaas({
        clienteAsaasId,
        valor: data.valor,
        forma: data.forma,
        vencimento: data.vencimento,
        descricao: data.descricao,
        referenciaExterna: registro.id,
      });

      const pix =
        data.forma === "pix" ? await obterPixCopiaCola(cobranca.id) : null;

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

    await supabase
      .from("cobrancas")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", cobranca.id);

    await supabase.from("movimentos_saldo").insert({
      empresa_id: cobranca.empresa_id,
      tipo: "credito",
      valor: cobranca.valor,
      descricao: `Cobrança paga — ${cobranca.descricao}`,
      cobranca_id: cobranca.id,
    });

    return { status: "pago" as const };
  });

/**
 * Garante a taxa da plataforma conforme o modelo da agência:
 * - percentual_evento / assinatura_percentual: uma taxa por evento, sobre o
 *   total dos fechamentos aprovados;
 * - taxa_fixa_pix: uma taxa por Pix enviado.
 */
async function garantirTaxa(
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth>> extends never
    ? never
    : { from: (t: string) => any },
  args: { empresaId: string; eventoId: string | null; pagamentoId: string; valorPix: number },
) {
  const { data: config } = await supabase
    .from("configuracoes")
    .select("modelo_cobranca, percentual_plataforma, taxa_fixa_pix")
    .eq("empresa_id", args.empresaId)
    .maybeSingle();
  if (!config) return null;

  if (config.modelo_cobranca === "taxa_fixa_pix") {
    const valor = arredonda(Number(config.taxa_fixa_pix));
    if (valor <= 0) return null;
    const { data } = await supabase
      .from("taxas_plataforma")
      .insert({
        empresa_id: args.empresaId,
        pagamento_id: args.pagamentoId,
        modelo: config.modelo_cobranca,
        base_calculo: args.valorPix,
        valor,
        status: "cobrada",
      })
      .select("id, valor")
      .maybeSingle();
    return data ?? null;
  }

  if (!args.eventoId) return null;

  const { data: jaExiste } = await supabase
    .from("taxas_plataforma")
    .select("id")
    .eq("evento_id", args.eventoId)
    .maybeSingle();
  if (jaExiste) return null;

  const { data: fechamentos } = await supabase
    .from("fechamentos")
    .select("valor_calculado, status, escalas!inner(equipes!inner(evento_id))")
    .eq("escalas.equipes.evento_id", args.eventoId)
    .eq("status", "aprovado");

  const base = (fechamentos ?? []).reduce(
    (s: number, f: { valor_calculado: number }) => s + Number(f.valor_calculado),
    0,
  );
  const valor = arredonda((base * Number(config.percentual_plataforma)) / 100);
  if (valor <= 0) return null;

  const { data } = await supabase
    .from("taxas_plataforma")
    .insert({
      empresa_id: args.empresaId,
      evento_id: args.eventoId,
      modelo: config.modelo_cobranca,
      base_calculo: base,
      valor,
      status: "cobrada",
    })
    .select("id, valor")
    .maybeSingle();
  return data ?? null;
}

/** Envia o Pix ao freelancer: valida saldo, debita, cobra a taxa e transfere. */
export const executarPagamentoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pagamentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: pagamento } = await supabase
      .from("pagamentos")
      .select(
        "id, valor, status, fechamento_id, fechamentos(escala_id, escalas(freelancers(nome, chave_pix), equipes(evento_id, eventos(nome, empresa_id))))",
      )
      .eq("id", data.pagamentoId)
      .maybeSingle();
    if (!pagamento) throw new Error("Pagamento não encontrado.");
    if (pagamento.status === "executado") throw new Error("Pagamento já executado.");

    const fechamento: any = Array.isArray(pagamento.fechamentos)
      ? pagamento.fechamentos[0]
      : pagamento.fechamentos;
    const escala: any = Array.isArray(fechamento?.escalas)
      ? fechamento.escalas[0]
      : fechamento?.escalas;
    const freelancer: any = Array.isArray(escala?.freelancers)
      ? escala.freelancers[0]
      : escala?.freelancers;
    const equipe: any = Array.isArray(escala?.equipes) ? escala.equipes[0] : escala?.equipes;
    const evento: any = Array.isArray(equipe?.eventos) ? equipe.eventos[0] : equipe?.eventos;

    const chavePix: string | undefined = freelancer?.chave_pix;
    const empresaId: string | undefined = evento?.empresa_id;
    if (!chavePix) throw new Error("Freelancer sem chave Pix cadastrada.");
    if (!empresaId) throw new Error("Não foi possível identificar a agência do pagamento.");

    const valor = Number(pagamento.valor);
    const { data: saldo } = await supabase.rpc("saldo_empresa", { _empresa_id: empresaId });
    if (Number(saldo ?? 0) < valor)
      throw new Error(
        `Saldo insuficiente: disponível R$ ${Number(saldo ?? 0).toFixed(2)}, necessário R$ ${valor.toFixed(2)}. Faça um aporte ou receba a cobrança do cliente.`,
      );

    try {
      const { transferirPix } = await import("./asaas.server");
      const transferencia = await transferirPix({
        valor,
        chavePix,
        descricao: `PayCrew — ${freelancer?.nome ?? "freelancer"} · ${evento?.nome ?? "evento"}`,
        referenciaExterna: pagamento.id,
      });

      await supabase
        .from("pagamentos")
        .update({
          status: "executado",
          executado_em: new Date().toISOString(),
          txid_parceiro: transferencia.id,
          parceiro_transferencia_id: transferencia.id,
          chave_pix_destino: chavePix,
          erro: null,
        })
        .eq("id", pagamento.id);

      await supabase.from("movimentos_saldo").insert({
        empresa_id: empresaId,
        tipo: "debito",
        valor,
        descricao: `Pix para ${freelancer?.nome ?? "freelancer"}`,
        pagamento_id: pagamento.id,
      });

      const taxa = await garantirTaxa(supabase as never, {
        empresaId,
        eventoId: equipe?.evento_id ?? null,
        pagamentoId: pagamento.id,
        valorPix: valor,
      });

      if (taxa) {
        await supabase.from("movimentos_saldo").insert({
          empresa_id: empresaId,
          tipo: "debito",
          valor: taxa.valor,
          descricao: "Taxa PayCrew",
          taxa_id: taxa.id,
        });
      }

      return { ok: true, txid: transferencia.id, taxa: taxa?.valor ?? 0 };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha ao enviar o Pix.";
      await supabase
        .from("pagamentos")
        .update({ status: "falhou", erro: mensagem })
        .eq("id", pagamento.id);
      throw new Error(mensagem);
    }
  });
