/**
 * Ações do time de suporte da PayCrew: reprocessar um Pix que falhou e
 * reconferir uma cobrança de qualquer agência. Sempre verifica o papel de
 * plataforma antes de usar o cliente administrativo.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autorizar(supabase: any, userId: string) {
  const { data } = await supabase
    .from("plataforma_usuarios")
    .select("papel")
    .eq("user_id", userId);
  const papeis = ((data ?? []) as { papel: string }[]).map((r) => r.papel);
  if (!papeis.includes("suporte") && !papeis.includes("admin_master"))
    throw new Error("Acesso restrito à equipe PayCrew.");
  return papeis;
}

/** Recoloca o pagamento na fila e tenta o Pix de novo. */
export const reenviarPixSuporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pagamentoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await autorizar(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pagamento } = await supabaseAdmin
      .from("pagamentos")
      .select("id, fechamentos(escalas(equipes(eventos(empresa_id)))))")
      .eq("id", data.pagamentoId)
      .maybeSingle();
    await supabaseAdmin
      .from("pagamentos")
      .update({ status: "pendente", erro: null })
      .eq("id", data.pagamentoId);
    const { enviarPix } = await import("./pagamentos.server");
    const resultado = await enviarPix(supabaseAdmin, data.pagamentoId);
    const fechamento = pagamento?.fechamentos as unknown as { escalas?: { equipes?: { eventos?: { empresa_id?: string } } } } | null;
    await supabaseAdmin.from("logs_auditoria").insert({
      empresa_id: fechamento?.escalas?.equipes?.eventos?.empresa_id ?? null,
      ator_id: context.userId,
      ator_contexto: "suporte",
      acao: "pix_reprocessado",
      recurso_tipo: "pagamento",
      recurso_id: data.pagamentoId,
      resultado: "sucesso",
      detalhes: {},
    });
    return resultado;
  });

/** Confere no Asaas se a cobrança de qualquer agência já foi paga. */
export const conferirCobrancaSuporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await autorizar(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cobranca } = await supabaseAdmin
      .from("cobrancas")
      .select("id, empresa_id, valor, status, parceiro_cobranca_id, descricao")
      .eq("id", data.id)
      .maybeSingle();
    if (!cobranca) throw new Error("Cobrança não encontrada.");
    if (cobranca.status === "pago") return { status: "pago" as const };
    if (!cobranca.parceiro_cobranca_id) throw new Error("Cobrança sem registro no parceiro.");

    const { obterCobrancaAsaas } = await import("./asaas.server");
    const remota = await obterCobrancaAsaas(cobranca.parceiro_cobranca_id);
    if (!["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(remota.status))
      return { status: remota.status };

    const { data: taxaPendente } = await supabaseAdmin
      .from("taxas_plataforma")
      .select("id, valor")
      .eq("cobranca_id", cobranca.id)
      .eq("status", "pendente")
      .maybeSingle();

    const valorCredito = taxaPendente
      ? Math.max(0, Number(cobranca.valor) - Number(taxaPendente.valor))
      : Number(cobranca.valor);

    await supabaseAdmin
      .from("cobrancas")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", cobranca.id);

    await supabaseAdmin.from("movimentos_saldo").insert({
      empresa_id: cobranca.empresa_id,
      tipo: "credito",
      valor: valorCredito,
      descricao: `Cobrança paga — ${cobranca.descricao}`,
      cobranca_id: cobranca.id,
    });

    await supabaseAdmin
      .from("fundings")
      .update({
        status: "available",
        valor_disponivel: valorCredito,
        referencia_parceiro: cobranca.parceiro_cobranca_id,
      })
      .eq("cobranca_id", cobranca.id)
      .eq("status", "pending");

    await supabaseAdmin.from("logs_auditoria").insert({
      empresa_id: cobranca.empresa_id,
      ator_id: context.userId,
      ator_contexto: "suporte",
      acao: "cobranca_conferida",
      recurso_tipo: "cobranca",
      recurso_id: cobranca.id,
      resultado: "sucesso",
      detalhes: { status: "pago" },
    });

    if (taxaPendente)
      await supabaseAdmin
        .from("taxas_plataforma")
        .update({ status: "cobrada" })
        .eq("id", taxaPendente.id);

    return { status: "pago" as const };
  });
