import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingBloco } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dataHora, lista, moeda, um } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — PayCrew" },
      {
        name: "description",
        content:
          "Fila de pagamentos Pix simulados: agende, execute e reexecute pagamentos dos freelancers.",
      },
      { property: "og:title", content: "Financeiro — PayCrew" },
      {
        property: "og:description",
        content: "Totais a pagar, agendados, executados e falhos da agência.",
      },
    ],
  }),
  component: Financeiro,
});

function txidSimulado() {
  return `SIM${crypto.randomUUID().replace(/-/g, "").slice(0, 30).toUpperCase()}`;
}

function Financeiro() {
  const queryClient = useQueryClient();

  const fila = useQuery({
    queryKey: ["financeiro"],
    queryFn: async () => {
      const { data: fechamentos, error } = await supabase
        .from("fechamentos")
        .select(
          "id, valor_calculado, status, escala:escalas(valor_combinado, tipo_valor, freelancer:freelancers(nome, chave_pix), equipe:equipes(nome, evento:eventos(nome))), pagamentos(*)",
        )
        .eq("status", "aprovado")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return fechamentos;
    },
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    queryClient.invalidateQueries({ queryKey: ["painel"] });
  };

  const gerar = useMutation({
    mutationFn: async (fechamentoId: string) => {
      const f = fila.data?.find((x) => x.id === fechamentoId);
      if (!f) throw new Error("Fechamento não encontrado.");
      if (lista(f.pagamentos).length > 0) throw new Error("Já existe pagamento para este fechamento.");
      const { error } = await supabase.from("pagamentos").insert({
        fechamento_id: f.id,
        valor: f.valor_calculado,
        status: "pendente",
        chave_idempotencia: crypto.randomUUID(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento criado na fila.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agendar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pagamentos")
        .update({ status: "agendado", data_agendada: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  /** Simula a execução do Pix: grava txid e comprovante fictícios. */
  const executar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "executado",
          executado_em: new Date().toISOString(),
          txid_parceiro: txidSimulado(),
          comprovante_url: null,
          erro: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pix (simulado) executado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tentarNovamente = useMutation({
    mutationFn: async (id: string) => {
      const { data: atual } = await supabase
        .from("pagamentos")
        .select("tentativas")
        .eq("id", id)
        .single();
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "pendente",
          erro: null,
          tentativas: (atual?.tentativas ?? 0) + 1,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const pagamentos = (fila.data ?? []).flatMap((f) => lista(f.pagamentos));
  const soma = (status: string) =>
    pagamentos.filter((p) => p.status === status).reduce((s, p) => s + Number(p.valor), 0);
  const aGerar = (fila.data ?? []).filter((f) => lista(f.pagamentos).length === 0);

  return (
    <AppShell
      titulo="Financeiro"
      descricao="Pix simulado — sem provedor externo; pronto para trocar depois"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["A pagar", soma("pendente") + aGerar.reduce((s, f) => s + Number(f.valor_calculado), 0)],
            ["Agendado", soma("agendado")],
            ["Executado", soma("executado")],
            ["Falhou", soma("falhou")],
          ] as [string, number][]
        ).map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-md border border-border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">{rotulo}</p>
            <p className="tabular-nums text-lg font-semibold">{moeda(valor)}</p>
          </div>
        ))}
      </div>

      {fila.isPending ? (
        <LoadingBloco />
      ) : fila.isError ? (
        <ErrorState error={fila.error} onRetry={() => fila.refetch()} />
      ) : fila.data.length === 0 ? (
        <EmptyState
          titulo="Nada a pagar"
          descricao="Fechamentos aprovados aparecem aqui para gerar o pagamento."
        />
      ) : (
        <ul className="space-y-2">
          {fila.data.map((f) => {
            const p = um(f.pagamentos);
            const escala = um(f.escala);
            const freelancer = um(escala?.freelancer);
            const equipe = um(escala?.equipe);
            const evento = um(equipe?.evento);
            return (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{freelancer?.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {evento?.nome} · {equipe?.nome} · Pix: {freelancer?.chave_pix ?? "—"}
                  </p>
                  {p?.txid_parceiro ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      txid: {p.txid_parceiro}
                      {p.executado_em ? ` · ${dataHora(p.executado_em)}` : ""}
                    </p>
                  ) : null}
                  {p?.erro ? (
                    <p className="mt-0.5 text-xs text-destructive">{p.erro}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-sm font-semibold">
                    {moeda(f.valor_calculado)}
                  </span>
                  {p ? (
                    <>
                      <StatusBadge status={p.status} />
                      {p.status === "pendente" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => agendar.mutate(p.id)}
                        >
                          <CalendarClock className="size-4" /> Agendar
                        </Button>
                      ) : null}
                      {p.status === "pendente" || p.status === "agendado" ? (
                        <Button size="sm" onClick={() => executar.mutate(p.id)}>
                          <Play className="size-4" /> Executar Pix
                        </Button>
                      ) : null}
                      {p.status === "falhou" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => tentarNovamente.mutate(p.id)}
                        >
                          <RotateCcw className="size-4" /> Tentar de novo
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gerar.isPending}
                      onClick={() => gerar.mutate(f.id)}
                    >
                      Gerar pagamento
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
