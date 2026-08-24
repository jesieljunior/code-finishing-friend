import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { isApiConfigured } from "@/api/config";
import { queryKeys } from "@/api/keys";
import { useAuth } from "@/auth/AuthProvider";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingBloco } from "@/components/states";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da agência — PayCrew" },
      {
        name: "description",
        content:
          "Regras da operação da agência: exigência de selfie e GPS no check-in, confirmação de presença, substituições e ocorrências.",
      },
      { property: "og:title", content: "Configurações da agência — PayCrew" },
      {
        property: "og:description",
        content:
          "Defina como sua agência opera: selfie, GPS, confirmação de presença e substituições.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { sessao } = useAuth();

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
      titulo="Configurações da agência"
      descricao="Leitura das regras vindas de GET /empresas/{id}/configuracoes"
    >
      {!sessao ? (
        <p className="text-sm text-muted-foreground">
          Defina a sessão de trabalho no topo para carregar as configurações.
        </p>
      ) : config.isPending ? (
        <LoadingBloco linhas={5} />
      ) : config.isError ? (
        <ErrorState error={config.error} onRetry={() => config.refetch()} />
      ) : config.data ? (
        <dl className="max-w-xl divide-y divide-border rounded-md border border-border bg-card">
          {(
            [
              ["Check-in exige selfie", config.data.checkin_exige_selfie],
              ["Check-in exige GPS", config.data.checkin_exige_gps],
              [
                "Escala exige confirmação de presença",
                config.data.escala_exige_confirmacao_presenca,
              ],
              ["Substituição habilitada", config.data.substituicao_habilitada],
              [
                "Ocorrências habilitadas",
                config.data.ocorrencias_habilitadas,
              ],
            ] as [string, boolean][]
          ).map(([label, valor]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{valor ? "Sim" : "Não"}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="mt-4 max-w-xl text-xs text-muted-foreground">
        Edição destas regras depende de um endpoint de atualização no FastAPI —
        hoje só existe leitura.
      </p>
    </AppShell>
  );
}
