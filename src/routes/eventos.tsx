import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — PayCrew" },
      {
        name: "description",
        content:
          "Crie e acompanhe eventos da agência no PayCrew: equipes, funções, escala e o ciclo de status até o fechamento.",
      },
      { property: "og:title", content: "Eventos — PayCrew" },
      {
        property: "og:description",
        content:
          "Eventos, equipes e escalas da agência em um fluxo único, do rascunho ao fechamento.",
      },
    ],
  }),
  component: EventosPage,
});

function EventosPage() {
  return (
    <AppShell titulo="Eventos" descricao="Etapa 3 — ainda não liberada">
      <EtapaPendente
        etapa="Etapa 3 · Eventos e equipes"
        descricao="Será construída depois que a fundação estiver validada contra a API real."
        dependencias={["listar-eventos", "usuarios"]}
      />
    </AppShell>
  );
}
