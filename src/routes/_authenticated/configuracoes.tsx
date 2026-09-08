import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingBloco } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/use-sessao";
import {
  DESCRICAO_MODELO_COBRANCA,
  ROTULO_MODELO_COBRANCA,
  moeda,
  type Configuracao,
  type ModeloCobranca,
} from "@/lib/dominio";


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
                checked={q.data?.[campo.chave] ?? false}
                disabled={salvar.isPending}
                onCheckedChange={(v) => salvar.mutate({ [campo.chave]: v })}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {q.data ? (
        <PlanoCobranca
          config={q.data}
          salvando={salvar.isPending}
          onSalvar={(patch) => salvar.mutate(patch)}
        />
      ) : null}
    </AppShell>
  );
}

const MODELOS: ModeloCobranca[] = [
  "percentual_evento",
  "taxa_fixa_pix",
  "assinatura_percentual",
];

function PlanoCobranca({
  config,
  salvando,
  onSalvar,
}: {
  config: Configuracao;
  salvando: boolean;
  onSalvar: (patch: Partial<Configuracao>) => void;
}) {
  const [percentual, setPercentual] = useState(String(config.percentual_plataforma));
  const [taxaPix, setTaxaPix] = useState(String(config.taxa_fixa_pix));
  const [mensalidade, setMensalidade] = useState(String(config.mensalidade));

  const numero = (v: string) => Number(v.replace(",", "."));
  const modelo = config.modelo_cobranca;

  return (
    <section className="mt-6 max-w-2xl rounded-md border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Plano da plataforma</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Como o PayCrew cobra pela operação financeira da sua agência.
      </p>

      <ul className="space-y-2">
        {MODELOS.map((m) => (
          <li key={m}>
            <button
              type="button"
              disabled={salvando}
              onClick={() => onSalvar({ modelo_cobranca: m })}
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                modelo === m
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <p className="text-sm font-medium">{ROTULO_MODELO_COBRANCA[m]}</p>
              <p className="text-xs text-muted-foreground">
                {DESCRICAO_MODELO_COBRANCA[m]}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="perc">Percentual por evento (%)</Label>
          <Input
            id="perc"
            inputMode="decimal"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            onBlur={() => onSalvar({ percentual_plataforma: numero(percentual) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpix">Taxa fixa por Pix (R$)</Label>
          <Input
            id="tpix"
            inputMode="decimal"
            value={taxaPix}
            onChange={(e) => setTaxaPix(e.target.value)}
            onBlur={() => onSalvar({ taxa_fixa_pix: numero(taxaPix) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mens">Mensalidade (R$)</Label>
          <Input
            id="mens"
            inputMode="decimal"
            value={mensalidade}
            onChange={(e) => setMensalidade(e.target.value)}
            onBlur={() => onSalvar({ mensalidade: numero(mensalidade) })}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {modelo === "percentual_evento"
          ? `Hoje: ${percentual}% do total do evento, cobrado uma vez por evento.`
          : modelo === "taxa_fixa_pix"
            ? `Hoje: ${moeda(numero(taxaPix))} a cada Pix enviado.`
            : `Hoje: ${moeda(numero(mensalidade))} por mês + ${percentual}% por evento.`}
      </p>
    </section>
  );
}

