import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingBloco } from "@/components/states";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/use-sessao";
import type { Configuracao } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da agência — PayCrew" },
      {
        name: "description",
        content:
          "Defina as regras da operação: selfie e GPS no check-in, confirmação de presença, substituição de freelancer e ocorrências.",
      },
      { property: "og:title", content: "Configurações da agência — PayCrew" },
      {
        property: "og:description",
        content: "Regras de check-in, confirmação, substituição e ocorrências.",
      },
    ],
  }),
  component: Configuracoes,
});

const CAMPOS: {
  chave: keyof Pick<
    Configuracao,
    | "checkin_exige_selfie"
    | "checkin_exige_gps"
    | "escala_exige_confirmacao_presenca"
    | "substituicao_habilitada"
    | "ocorrencias_habilitadas"
  >;
  titulo: string;
  descricao: string;
}[] = [
  {
    chave: "checkin_exige_selfie",
    titulo: "Selfie no check-in",
    descricao: "O freelancer precisa enviar uma foto ao registrar o ponto.",
  },
  {
    chave: "checkin_exige_gps",
    titulo: "Localização no check-in",
    descricao: "O ponto só é aceito com a localização do dispositivo.",
  },
  {
    chave: "escala_exige_confirmacao_presenca",
    titulo: "Exigir confirmação de presença",
    descricao: "O evento só fica pronto quando a equipe confirmar a escala.",
  },
  {
    chave: "substituicao_habilitada",
    titulo: "Permitir substituição",
    descricao: "Coordenação pode trocar um freelancer que recusou ou faltou.",
  },
  {
    chave: "ocorrencias_habilitadas",
    titulo: "Registro de ocorrências",
    descricao: "Supervisores podem registrar ocorrências durante o evento.",
  },
];

function Configuracoes() {
  const { empresaId } = useSessao();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ["configuracoes", empresaId],
    enabled: Boolean(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("empresa_id", empresaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (patch: Partial<Configuracao>) => {
      const { error } = await supabase
        .from("configuracoes")
        .update(patch)
        .eq("empresa_id", empresaId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
      toast.success("Configuração atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo="Configurações"
      descricao="Regras que valem para toda a operação da agência"
    >
      {q.isPending ? (
        <LoadingBloco />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data ? (
        <ul className="max-w-2xl divide-y divide-border rounded-md border border-border bg-card">
          {CAMPOS.map((campo) => (
            <li
              key={campo.chave}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{campo.titulo}</p>
                <p className="text-xs text-muted-foreground">{campo.descricao}</p>
              </div>
              <Switch
                checked={q.data[campo.chave]}
                disabled={salvar.isPending}
                onCheckedChange={(v) => salvar.mutate({ [campo.chave]: v })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
