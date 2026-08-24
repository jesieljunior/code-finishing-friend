import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — PayCrew" },
      {
        name: "description",
        content:
          "Relatório consolidado por evento: custo da equipe, horas trabalhadas, ocorrências e situação dos pagamentos.",
      },
      { property: "og:title", content: "Relatórios — PayCrew" },
      {
        property: "og:description",
        content:
          "Custo real por evento, horas da equipe e situação dos pagamentos.",
      },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  return (
    <AppShell titulo="Relatórios" descricao="Etapa 8 — ainda não liberada">
      <EtapaPendente
        etapa="Etapa 8 · Relatórios"
        descricao="Alimentado por GET /relatorios/evento/{id}. Depende de listar eventos para escolher o período."
        dependencias={["listar-eventos"]}
      />
    </AppShell>
  );
}
