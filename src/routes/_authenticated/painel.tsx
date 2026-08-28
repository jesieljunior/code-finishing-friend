import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingBloco } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dataHora, moeda } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel da agência — PayCrew" },
      {
        name: "description",
        content:
          "Acompanhe eventos em andamento, pontos aguardando aprovação, fechamentos e pagamentos pendentes da sua agência.",
      },
      { property: "og:title", content: "Painel da agência — PayCrew" },
      {
        property: "og:description",
        content:
          "Visão geral da operação: eventos, pontos, fechamentos e pagamentos pendentes.",
      },
    ],
  }),
  component: Painel,
});

async function carregar() {
  const [eventos, pontos, fechamentos, pagamentos] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, nome, local, data_inicio, status")
      .not("status", "in", "(concluido,arquivado,cancelado)")
      .order("data_inicio", { ascending: true })
      .limit(8),
    supabase.from("pontos").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase
      .from("fechamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente_aprovacao"),
    supabase.from("pagamentos").select("valor, status"),
  ]);

  if (eventos.error) throw eventos.error;
  if (pagamentos.error) throw pagamentos.error;

  const aPagar = (pagamentos.data ?? [])
    .filter((p) => p.status === "pendente" || p.status === "agendado")
    .reduce((s, p) => s + Number(p.valor), 0);
  const pago = (pagamentos.data ?? [])
    .filter((p) => p.status === "executado")
    .reduce((s, p) => s + Number(p.valor), 0);

  return {
    eventos: eventos.data ?? [],
    pontosPendentes: pontos.count ?? 0,
    fechamentosPendentes: fechamentos.count ?? 0,
    aPagar,
    pago,
  };
}

function Cartao({
  titulo,
  valor,
  to,
}: {
  titulo: string;
  valor: string | number;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {valor}
      </p>
    </Link>
  );
}

function Painel() {
  const q = useQuery({ queryKey: ["painel"], queryFn: carregar });

  return (
    <AppShell titulo="Painel" descricao="O que precisa de atenção agora">
      {q.isPending ? (
        <LoadingBloco linhas={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cartao
              titulo="Eventos em andamento"
              valor={q.data.eventos.length}
              to="/eventos"
            />
            <Cartao
              titulo="Pontos a aprovar"
              valor={q.data.pontosPendentes}
              to="/operacao"
            />
            <Cartao
              titulo="Fechamentos a aprovar"
              valor={q.data.fechamentosPendentes}
              to="/fechamento"
            />
            <Cartao titulo="A pagar" valor={moeda(q.data.aPagar)} to="/financeiro" />
          </div>

          <section className="mt-6 rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Próximos eventos</h2>
              <Button asChild size="sm" variant="outline">
                <Link to="/eventos">Ver todos</Link>
              </Button>
            </div>
            {q.data.eventos.length === 0 ? (
              <EmptyState
                titulo="Nenhum evento ativo"
                descricao="Crie um evento para montar a equipe e iniciar a operação."
                acao={
                  <Button asChild size="sm">
                    <Link to="/eventos">Criar evento</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {q.data.eventos.map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/eventos/$eventoId"
                      params={{ eventoId: e.id }}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {dataHora(e.data_inicio)}
                          {e.local ? ` · ${e.local}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="mt-4 text-xs text-muted-foreground">
            Total já pago pela agência: {moeda(q.data.pago)}
          </p>
        </>
      )}
    </AppShell>
  );
}
