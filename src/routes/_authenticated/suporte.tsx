import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingBloco } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessao } from "@/hooks/use-sessao";
import { dataHora, moeda } from "@/lib/dominio";
import {
  conferirCobrancaSuporte,
  listarDadosSuporte,
  reenviarPixSuporte,
} from "@/lib/suporte.functions";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte PayCrew" },
      {
        name: "description",
        content:
          "Atendimento às agências: consultar cobranças e pagamentos de todas as contas e reprocessar Pix que falhou.",
      },
      { property: "og:title", content: "Suporte PayCrew" },
      {
        property: "og:description",
        content: "Consulta de cobranças e reprocessamento de pagamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Suporte,
});

function Suporte() {
  const { ehEquipePlataforma, isPending } = useSessao();

  if (isPending) {
    return (
      <AppShell titulo="Suporte PayCrew">
        <LoadingBloco />
      </AppShell>
    );
  }

  if (!ehEquipePlataforma) {
    return (
      <AppShell titulo="Suporte PayCrew">
        <EmptyState
          titulo="Área restrita"
          descricao="Somente a equipe da PayCrew tem acesso a esta página."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="Suporte PayCrew"
      descricao="Cobranças e pagamentos de todas as agências"
    >
      <Tabs defaultValue="cobrancas">
        <TabsList>
          <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>
        <TabsContent value="cobrancas" className="mt-4">
          <Cobrancas />
        </TabsContent>
        <TabsContent value="pagamentos" className="mt-4">
          <Pagamentos />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Cobrancas() {
  const queryClient = useQueryClient();
  const conferirFn = useServerFn(conferirCobrancaSuporte);
  const listarFn = useServerFn(listarDadosSuporte);

  const q = useQuery({
    queryKey: ["suporte", "cobrancas"],
    queryFn: async () => {
      const dados = await listarFn();
      return dados.cobrancas;
    },
  });

  const conferir = useMutation({
    mutationFn: (id: string) => conferirFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success(r.status === "pago" ? "Pagamento confirmado." : `Status: ${r.status}`);
      queryClient.invalidateQueries({ queryKey: ["suporte"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isPending) return <LoadingBloco />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.length === 0)
    return <EmptyState titulo="Sem cobranças" descricao="Nada emitido até agora." />;

  return (
    <ul className="space-y-2">
      {q.data.map((c) => (
        <li
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {(c.empresas as { nome: string } | null)?.nome ?? "—"} · {c.descricao}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {c.tipo === "aporte_agencia" ? "Recarga de saldo" : "Cobrança de cliente"} ·{" "}
              {dataHora(c.criado_em)}
            </p>
            {c.erro ? <p className="text-xs text-destructive">{c.erro}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-sm font-semibold">{moeda(c.valor)}</span>
            <StatusBadge status={c.status} />
            {c.status !== "pago" && c.parceiro_cobranca_id ? (
              <Button
                size="sm"
                variant="outline"
                disabled={conferir.isPending}
                onClick={() => conferir.mutate(c.id)}
              >
                <RefreshCw className="size-4" /> Conferir
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Pagamentos() {
  const queryClient = useQueryClient();
  const reenviarFn = useServerFn(reenviarPixSuporte);
  const listarFn = useServerFn(listarDadosSuporte);

  const q = useQuery({
    queryKey: ["suporte", "pagamentos"],
    queryFn: async () => {
      const dados = await listarFn();
      return dados.pagamentos;
    },
  });

  const reenviar = useMutation({
    mutationFn: (id: string) => reenviarFn({ data: { pagamentoId: id } }),
    onSuccess: () => {
      toast.success("Pix reenviado.");
      queryClient.invalidateQueries({ queryKey: ["suporte"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isPending) return <LoadingBloco />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.length === 0)
    return <EmptyState titulo="Sem pagamentos" descricao="Nenhum Pix gerado até agora." />;

  return (
    <ul className="space-y-2">
      {q.data.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{moeda(p.valor)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dataHora(p.criado_em)}
              {p.txid_parceiro ? ` · ${p.txid_parceiro}` : ""}
            </p>
            {p.erro ? <p className="text-xs text-destructive">{p.erro}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={p.status} />
            {p.status === "falhou" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={reenviar.isPending}
                onClick={() => reenviar.mutate(p.id)}
              >
                <RotateCcw className="size-4" /> Reenviar Pix
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
