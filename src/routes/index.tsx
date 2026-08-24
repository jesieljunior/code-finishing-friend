import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { isApiConfigured, API_BASE_URL } from "@/api/config";
import { queryKeys } from "@/api/keys";
import { useAuth } from "@/auth/AuthProvider";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingBloco } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ORDEM_STATUS_EVENTO } from "@/api/types";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayCrew — Operação e pagamento de equipes de eventos" },
      {
        name: "description",
        content:
          "Painel do PayCrew: acompanhe eventos, escalas, operação em campo, fechamento de horas e pagamentos das equipes freelancers da sua agência.",
      },
      {
        property: "og:title",
        content: "PayCrew — Operação e pagamento de equipes de eventos",
      },
      {
        property: "og:description",
        content:
          "Do cadastro do evento ao Pix do freelancer: escala, check-in, fechamento de horas e pagamento em um só lugar.",
      },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const { sessao, carregado } = useAuth();

  const empresa = useQuery({
    queryKey: sessao ? queryKeys.empresa(sessao.empresaId) : ["empresa", "—"],
    queryFn: () => api.empresas.obter(sessao!.empresaId),
    enabled: Boolean(sessao) && isApiConfigured(),
    retry: false,
  });

  const config = useQuery({
    queryKey: sessao
      ? queryKeys.configuracoes(sessao.empresaId)
      : ["configuracoes", "—"],
    queryFn: () => api.empresas.configuracoes(sessao!.empresaId),
    enabled: Boolean(sessao) && isApiConfigured(),
    retry: false,
  });

  return (
    <AppShell
      titulo="Visão geral"
      descricao="Fundação conectada ao FastAPI — etapas seguintes liberadas após validação"
    >
      {!isApiConfigured() ? (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">
            Falta a URL da API
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina <code>VITE_API_BASE_URL</code> apontando para o FastAPI do
            PayCrew. Enquanto isso nenhuma tela busca dados.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/conexao">Abrir diagnóstico</Link>
          </Button>
        </div>
      ) : !carregado ? (
        <LoadingBloco linhas={3} />
      ) : !sessao ? (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">
            Defina a sessão de trabalho
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            O backend ainda não tem autenticação. Informe o UUID da empresa e o
            papel no botão do topo para o frontend saber o que consultar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Agência</h2>
            <div className="mt-3">
              {empresa.isPending ? (
                <LoadingBloco linhas={2} />
              ) : empresa.isError ? (
                <ErrorState
                  error={empresa.error}
                  onRetry={() => empresa.refetch()}
                />
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{empresa.data?.nome}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">CNPJ</dt>
                    <dd className="font-medium">{empresa.data?.cnpj}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Situação</dt>
                    <dd className="font-medium">
                      {empresa.data?.ativa ? "Ativa" : "Inativa"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Regras da operação
            </h2>
            <div className="mt-3">
              {config.isPending ? (
                <LoadingBloco linhas={3} />
              ) : config.isError ? (
                <ErrorState
                  error={config.error}
                  onRetry={() => config.refetch()}
                />
              ) : config.data ? (
                <dl className="space-y-2 text-sm">
                  {(
                    [
                      ["Check-in exige selfie", config.data.checkin_exige_selfie],
                      ["Check-in exige GPS", config.data.checkin_exige_gps],
                      [
                        "Escala exige confirmação",
                        config.data.escala_exige_confirmacao_presenca,
                      ],
                      ["Substituição habilitada", config.data.substituicao_habilitada],
                      ["Ocorrências habilitadas", config.data.ocorrencias_habilitadas],
                    ] as [string, boolean][]
                  ).map(([label, valor]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{valor ? "Sim" : "Não"}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </section>
        </div>
      )}

      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Ciclo do evento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estados exatamente como o backend define em{" "}
          <code>ORDEM_STATUS_EVENTO</code>. O frontend não cria uma máquina de
          estados própria.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ORDEM_STATUS_EVENTO.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <StatusBadge status="cancelado" />
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        API: {isApiConfigured() ? API_BASE_URL : "não configurada"}
      </p>
    </AppShell>
  );
}
