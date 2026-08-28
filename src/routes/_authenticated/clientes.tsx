import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingBloco } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessao } from "@/hooks/use-sessao";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — PayCrew" },
      {
        name: "description",
        content:
          "Cadastro de clientes da agência: contratantes dos eventos atendidos pelas equipes freelancers.",
      },
      { property: "og:title", content: "Clientes — PayCrew" },
      {
        property: "og:description",
        content: "Gerencie os contratantes dos eventos da sua agência.",
      },
    ],
  }),
  component: Clientes,
});

function FormCliente({
  cliente,
  onFechar,
}: {
  cliente?: Cliente;
  onFechar: () => void;
}) {
  const { empresaId } = useSessao();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? "");

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        observacoes: observacoes.trim() || null,
      };
      const { error } = cliente
        ? await supabase.from("clientes").update(payload).eq("id", cliente.id)
        : await supabase
            .from("clientes")
            .insert({ ...payload, empresa_id: empresaId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(cliente ? "Cliente atualizado." : "Cliente cadastrado.");
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="cliente-nome">Nome</Label>
        <Input
          id="cliente-nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cliente-obs">Observações</Label>
        <Textarea
          id="cliente-obs"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={salvar.isPending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function Clientes() {
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const q = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const lista = (q.data ?? []).filter((c) =>
    c.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  return (
    <AppShell
      titulo="Clientes"
      descricao="Contratantes dos eventos"
      acoes={
        <Dialog open={novo} onOpenChange={setNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
            </DialogHeader>
            <FormCliente onFechar={() => setNovo(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      <Input
        placeholder="Buscar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {q.isPending ? (
        <LoadingBloco />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo="Nenhum cliente"
          descricao="Cadastre o contratante para vincular aos eventos."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                {c.observacoes ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {c.observacoes}
                  </p>
                ) : null}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditando(c)}>
                <Pencil className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(editando)} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editando ? (
            <FormCliente cliente={editando} onFechar={() => setEditando(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
