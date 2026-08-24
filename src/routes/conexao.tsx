import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";

import { api } from "@/api/endpoints";
import { API_BASE_URL, isApiConfigured } from "@/api/config";
import { queryKeys } from "@/api/keys";
import { PENDENCIAS_BACKEND } from "@/api/pendencias";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingBloco } from "@/components/states";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/conexao")({
  head: () => ({
    meta: [
      { title: "Conexão com a API — PayCrew" },
      {
        name: "description",
        content:
          "Diagnóstico da conexão entre o frontend PayCrew e a API FastAPI: URL configurada, health check e pendências de backend.",
      },
      { property: "og:title", content: "Conexão com a API — PayCrew" },
      {
        property: "og:description",
        content:
          "Verifique a URL configurada, o health check do FastAPI e as pendências que bloqueiam as próximas etapas.",
      },
    ],
  }),
  component: ConexaoPage,
});

function ConexaoPage() {
  const [latencia, setLatencia] = useState<number | null>(null);

  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const inicio = performance.now();
      const resultado = await api.health();
      setLatencia(Math.round(performance.now() - inicio));
      return resultado;
    },
    retry: false,
    enabled: isApiConfigured(),
  });

  const origem = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell
      titulo="Conexão com a API"
      descricao="Validação da fundação antes de avançar para os cadastros"
      acoes={
        <Button
          size="sm"
          variant="outline"
          onClick={() => health.refetch()}
          disabled={!isApiConfigured() || health.isFetching}
        >
          <RefreshCw className="size-3.5" /> Testar
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Configuração
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">VITE_API_BASE_URL</dt>
              <dd className="break-all text-right font-medium">
                {isApiConfigured() ? API_BASE_URL : "não definida"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Origem do frontend</dt>
              <dd className="break-all text-right font-medium">{origem}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Latência do /health</dt>
              <dd className="font-medium">
                {latencia !== null ? `${latencia} ms` : "—"}
              </dd>
            </div>
          </dl>

          {!isApiConfigured() ? (
            <p className="mt-3 rounded-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
              Defina <code>VITE_API_BASE_URL</code> com a URL do FastAPI (ex.:{" "}
              <code>http://localhost:8000</code>) para o frontend conectar.
              Nenhuma URL é hardcoded.
            </p>
          ) : null}
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            GET /health
          </h2>
          <div className="mt-3">
            {!isApiConfigured() ? (
              <p className="text-sm text-muted-foreground">
                Aguardando a URL da API.
              </p>
            ) : health.isPending ? (
              <LoadingBloco linhas={2} />
            ) : health.isError ? (
              <ErrorState
                error={health.error}
                onRetry={() => health.refetch()}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-sm bg-status-ok px-3 py-2 text-sm text-status-ok-foreground">
                <CheckCircle2 className="size-4" />
                API respondeu: {health.data?.status}
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Se o teste falhar mesmo com a API no ar, o FastAPI precisa liberar
            esta origem no <code>CORSMiddleware</code>. O frontend não contorna
            CORS.
          </p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">
          Pendências do backend
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Levantadas lendo <code>app/main.py</code>, <code>app/routers/*</code>{" "}
          e <code>app/schemas/*</code>. Nada aqui é contornado no frontend.
        </p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {PENDENCIAS_BACKEND.map((p) => (
            <li
              key={p.id}
              className="rounded-md border border-border bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <XCircle
                  className={
                    p.gravidade === "bloqueante"
                      ? "mt-0.5 size-4 shrink-0 text-destructive"
                      : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                  }
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.titulo}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.detalhe}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bloqueia: {p.etapaBloqueada}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
