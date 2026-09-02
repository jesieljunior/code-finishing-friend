import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingBloco } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/use-sessao";
import {
  hora,
  ROTULO_METODO,
  ROTULO_TIPO_PONTO,
  type TipoPonto,
} from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/operacao/$eventoId")({
  head: () => ({
    meta: [
      { title: "Ponto da equipe — PayCrew" },
      {
        name: "description",
        content:
          "Aprove ou recuse os registros de ponto, lance ponto manual e registre ocorrências da equipe em campo.",
      },
      { property: "og:title", content: "Ponto da equipe — PayCrew" },
      {
        property: "og:description",
        content: "Conferência de presença e ponto durante o evento.",
      },
    ],
  }),
  component: OperacaoEvento,
});

const TIPOS: TipoPonto[] = ["entrada", "inicio_intervalo", "fim_intervalo", "saida"];

function OperacaoEvento() {
  const { eventoId } = Route.useParams();
  const queryClient = useQueryClient();
  const { sessao } = useSessao();
  const [manual, setManual] = useState<{ escalaId: string; nome: string } | null>(null);
  const [ocorrencia, setOcorrencia] = useState<{ escalaId: string; nome: string } | null>(
    null,
  );

  const evento = useQuery({
    queryKey: ["evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, nome, status, local")
        .eq("id", eventoId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Evento não encontrado.");
      return data;
    },
  });

  const equipes = useQuery({
    queryKey: ["operacao", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select(
          "id, nome, escalas(id, status, freelancers(nome, funcao), pontos(id, tipo, metodo, registrado_em, status), ocorrencias(id, descricao, criado_em))",
        )
        .eq("evento_id", eventoId)
        .order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["operacao", eventoId] });
    queryClient.invalidateQueries({ queryKey: ["painel"] });
  };

  const decidirPonto = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "aprovado" | "recusado";
    }) => {
      const { error } = await supabase
        .from("pontos")
        .update({
          status,
          aprovado_por_id: sessao?.usuario.id ?? null,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  if (evento.isPending) {
    return (
      <AppShell titulo="Operação">
        <LoadingBloco />
      </AppShell>
    );
  }
  if (evento.isError) {
    return (
      <AppShell titulo="Operação">
        <ErrorState error={evento.error} onRetry={() => evento.refetch()} />
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={evento.data.nome}
      descricao={`Ponto e ocorrências${evento.data.local ? ` · ${evento.data.local}` : ""}`}
      acoes={<StatusBadge status={evento.data.status} />}
    >
      {equipes.isPending ? (
        <LoadingBloco />
      ) : equipes.isError ? (
        <ErrorState error={equipes.error} onRetry={() => equipes.refetch()} />
      ) : equipes.data.length === 0 ? (
        <EmptyState
          titulo="Sem equipes"
          descricao="Monte a equipe e a escala na tela do evento."
        />
      ) : (
        <div className="space-y-4">
          {equipes.data.map((q) => (
            <section key={q.id} className="rounded-md border border-border bg-card">
              <h2 className="border-b border-border px-4 py-2 text-sm font-semibold">
                {q.nome}
              </h2>
              <ul className="divide-y divide-border">
                {q.escalas
                  .filter((es) => es.status !== "substituido" && es.status !== "recusado")
                  .map((es) => (
                    <li key={es.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {es.freelancers?.nome}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {es.freelancers?.funcao ?? "sem função definida"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={es.status} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setManual({
                                escalaId: es.id,
                                nome: es.freelancers?.nome ?? "",
                              })
                            }
                          >
                            <Plus className="size-4" /> Ponto manual
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setOcorrencia({
                                escalaId: es.id,
                                nome: es.freelancers?.nome ?? "",
                              })
                            }
                          >
                            Ocorrência
                          </Button>
                        </div>
                      </div>

                      {es.pontos.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {[...es.pontos]
                            .sort(
                              (a, b) =>
                                new Date(a.registrado_em).getTime() -
                                new Date(b.registrado_em).getTime(),
                            )
                            .map((p) => (
                              <li
                                key={p.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-muted/50 px-2 py-1.5 text-xs"
                              >
                                <span className="font-medium">
                                  {ROTULO_TIPO_PONTO[p.tipo]}{" "}
                                  <span className="font-normal text-muted-foreground">
                                    {hora(p.registrado_em)} · {ROTULO_METODO[p.metodo]}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <StatusBadge status={p.status} />
                                  {p.status === "pendente" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7"
                                        onClick={() =>
                                          decidirPonto.mutate({
                                            id: p.id,
                                            status: "aprovado",
                                          })
                                        }
                                      >
                                        <Check className="size-3.5" /> Aprovar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7"
                                        onClick={() =>
                                          decidirPonto.mutate({
                                            id: p.id,
                                            status: "recusado",
                                          })
                                        }
                                      >
                                        <X className="size-3.5" />
                                      </Button>
                                    </>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Nenhum ponto registrado.
                        </p>
                      )}

                      {es.ocorrencias.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {es.ocorrencias.map((o) => (
                            <li
                              key={o.id}
                              className="rounded-sm border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground"
                            >
                              {o.descricao}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(manual)} onOpenChange={(o) => !o && setManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ponto manual — {manual?.nome}</DialogTitle>
          </DialogHeader>
          {manual ? (
            <FormPontoManual
              escalaId={manual.escalaId}
              onFechar={() => setManual(null)}
              onSalvo={invalidar}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(ocorrencia)} onOpenChange={(o) => !o && setOcorrencia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocorrência — {ocorrencia?.nome}</DialogTitle>
          </DialogHeader>
          {ocorrencia ? (
            <FormOcorrencia
              escalaId={ocorrencia.escalaId}
              usuarioId={sessao?.usuario.id ?? null}
              onFechar={() => setOcorrencia(null)}
              onSalvo={invalidar}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function FormPontoManual({
  escalaId,
  onFechar,
  onSalvo,
}: {
  escalaId: string;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [tipo, setTipo] = useState<TipoPonto>("entrada");
  const [quando, setQuando] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16),
  );

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pontos").insert({
        escala_id: escalaId,
        tipo,
        metodo: "manual",
        registrado_em: new Date(quando).toISOString(),
        status: "aprovado",
        aprovado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ponto lançado.");
      onSalvo();
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="pm-tipo">Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPonto)}>
          <SelectTrigger id="pm-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_TIPO_PONTO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pm-quando">Data e hora</Label>
        <input
          id="pm-quando"
          type="datetime-local"
          required
          value={quando}
          onChange={(e) => setQuando(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Lançamento manual entra já aprovado, sob responsabilidade do supervisor.
      </p>
      <DialogFooter>
        <Button type="submit" disabled={salvar.isPending}>
          Lançar ponto
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormOcorrencia({
  escalaId,
  usuarioId,
  onFechar,
  onSalvo,
}: {
  escalaId: string;
  usuarioId: string | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ocorrencias").insert({
        escala_id: escalaId,
        registrado_por_id: usuarioId,
        descricao: descricao.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência registrada.");
      onSalvo();
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="oc-desc">O que aconteceu</Label>
        <Textarea
          id="oc-desc"
          required
          rows={4}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Atraso, saída antecipada, troca de posto…"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={salvar.isPending}>
          Registrar
        </Button>
      </DialogFooter>
    </form>
  );
}
