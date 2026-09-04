/**
 * Webhook do Asaas. Confirma cobranças pagas (credita o saldo da agência) e
 * o resultado das transferências Pix aos freelancers.
 *
 * O Asaas envia o cabeçalho `asaas-access-token` com o valor configurado no
 * painel; ele é a autenticação desta rota pública.
 */

import { createFileRoute } from "@tanstack/react-router";

type EventoAsaas = {
  event?: string;
  payment?: { id?: string; externalReference?: string; value?: number };
  transfer?: { id?: string; externalReference?: string; failReason?: string };
};

const PAGAS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED_IN_CASH",
]);

export const Route = createFileRoute("/api/public/webhooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const esperado = process.env["ASAAS_WEBHOOK_TOKEN"];
        const recebido = request.headers.get("asaas-access-token");
        if (!esperado || recebido !== esperado) {
          return new Response("Unauthorized", { status: 401 });
        }

        let corpo: EventoAsaas;
        try {
          corpo = (await request.json()) as EventoAsaas;
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const evento = corpo.event ?? "";

        if (PAGAS.has(evento) && corpo.payment?.id) {
          const { data: cobranca } = await supabaseAdmin
            .from("cobrancas")
            .select("id, empresa_id, valor, status, descricao")
            .eq("parceiro_cobranca_id", corpo.payment.id)
            .maybeSingle();

          if (cobranca && cobranca.status !== "pago") {
            await supabaseAdmin
              .from("cobrancas")
              .update({ status: "pago", pago_em: new Date().toISOString() })
              .eq("id", cobranca.id);

            await supabaseAdmin.from("movimentos_saldo").insert({
              empresa_id: cobranca.empresa_id,
              tipo: "credito",
              valor: cobranca.valor,
              descricao: `Cobrança paga — ${cobranca.descricao}`,
              cobranca_id: cobranca.id,
            });
          }
        }

        if (evento === "PAYMENT_OVERDUE" && corpo.payment?.id) {
          await supabaseAdmin
            .from("cobrancas")
            .update({ status: "vencido" })
            .eq("parceiro_cobranca_id", corpo.payment.id);
        }

        if (evento === "TRANSFER_FAILED" && corpo.transfer?.externalReference) {
          const pagamentoId = corpo.transfer.externalReference;
          const { data: pagamento } = await supabaseAdmin
            .from("pagamentos")
            .select("id, valor, fechamento_id")
            .eq("id", pagamentoId)
            .maybeSingle();

          if (pagamento) {
            await supabaseAdmin
              .from("pagamentos")
              .update({
                status: "falhou",
                erro: corpo.transfer.failReason ?? "Transferência recusada pelo banco.",
              })
              .eq("id", pagamento.id);

            // Estorna o débito de saldo do Pix que não saiu.
            const { data: movimento } = await supabaseAdmin
              .from("movimentos_saldo")
              .select("empresa_id")
              .eq("pagamento_id", pagamento.id)
              .eq("tipo", "debito")
              .maybeSingle();

            if (movimento) {
              await supabaseAdmin.from("movimentos_saldo").insert({
                empresa_id: movimento.empresa_id,
                tipo: "credito",
                valor: pagamento.valor,
                descricao: "Estorno de Pix recusado",
                pagamento_id: pagamento.id,
              });
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
