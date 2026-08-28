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
import { Switch } from "@/components/ui/switch";
import { useSessao } from "@/hooks/use-sessao";
import { supabase } from "@/integrations/supabase/client";
import { formatarCpf, soDigitos, type Freelancer } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/freelancers")({
  head: () => ({
    meta: [
      { title: "Freelancers — PayCrew" },
      {
        name: "description",
        content:
          "Cadastro de freelancers da agência com CPF, função e chave Pix usada no pagamento após o fechamento do evento.",
      },
      { property: "og:title", content: "Freelancers — PayCrew" },
      {
        property: "og:description",
        content: "Equipe freelancer da agência: dados, função e chave Pix.",
      },
    ],
  }),
  component: Freelancers,
});

function FormFreelancer({
  freelancer,
  onFechar,
}: {
  freelancer?: Freelancer;
  onFechar: () => void;
}) {
  const { empresaId } = useSessao();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(freelancer?.nome ?? "");
  const [cpf, setCpf] = useState(formatarCpf(freelancer?.cpf ?? ""));
  const [telefone, setTelefone] = useState(freelancer?.telefone ?? "");
  const [funcao, setFuncao] = useState(freelancer?.funcao ?? "");
  const [chavePix, setChavePix] = useState(freelancer?.chave_pix ?? "");
  const [ativo, setAtivo] = useState(freelancer?.ativo ?? true);

  const salvar = useMutation({
    mutationFn: async () => {
      const digitos = soDigitos(cpf);
      if (digitos.length !== 11) throw new Error("CPF deve ter 11 dígitos.");
      const payload = {
        nome: nome.trim(),
        cpf: digitos,
        telefone: telefone.trim() || null,
        funcao: funcao.trim() || null,
        chave_pix: chavePix.trim(),
        ativo,
      };
      const { error } = freelancer
        ? await supabase.from("freelancers").update(payload).eq("id", freelancer.id)
        : await supabase
            .from("freelancers")
            .insert({ ...payload, empresa_id: empresaId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
      toast.success(freelancer ? "Freelancer atualizado." : "Freelancer cadastrado.");
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
        <Label htmlFor="f-nome">Nome</Label>
        <Input id="f-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="f-cpf">CPF</Label>
          <Input
            id="f-cpf"
            required
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatarCpf(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-tel">Telefone</Label>
          <Input
            id="f-tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="f-funcao">Função</Label>
          <Input
            id="f-funcao"
            placeholder="Garçom, recepção, montagem…"
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-pix">Chave Pix</Label>
          <Input
            id="f-pix"
            required
            value={chavePix}
            onChange={(e) => setChavePix(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <Label htmlFor="f-ativo" className="text-sm font-normal">
          Disponível para escala
        </Label>
        <Switch id="f-ativo" checked={ativo} onCheckedChange={setAtivo} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={salvar.isPending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function Freelancers() {
  const [busca, setBusca] = useState("");
  const [soAtivos, setSoAtivos] = useState(true);
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Freelancer | null>(null);

  const q = useQuery({
    queryKey: ["freelancers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancers")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const termo = busca.trim().toLowerCase();
  const lista = (q.data ?? []).filter(
    (f) =>
      (!soAtivos || f.ativo) &&
      (f.nome.toLowerCase().includes(termo) ||
        (f.funcao ?? "").toLowerCase().includes(termo) ||
        f.cpf.includes(soDigitos(termo))),
  );

  return (
    <AppShell
      titulo="Freelancers"
      descricao="Equipe disponível para escala"
      acoes={
        <Dialog open={novo} onOpenChange={setNovo}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Novo freelancer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo freelancer</DialogTitle>
            </DialogHeader>
            <FormFreelancer onFechar={() => setNovo(false)} />
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nome, função ou CPF"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={soAtivos} onCheckedChange={setSoAtivos} />
          Somente ativos
        </label>
      </div>

      {q.isPending ? (
        <LoadingBloco />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo="Nenhum freelancer"
          descricao="Cadastre a equipe para poder escalar nos eventos."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {lista.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {f.nome}
                  {!f.ativo ? (
                    <span className="ml-2 text-xs text-muted-foreground">inativo</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[f.funcao, formatarCpf(f.cpf), f.chave_pix]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditando(f)}>
                <Pencil className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(editando)} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar freelancer</DialogTitle>
          </DialogHeader>
          {editando ? (
            <FormFreelancer freelancer={editando} onFechar={() => setEditando(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
