import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — PayCrew" },
      {
        name: "description",
        content:
          "Cadastro dos clientes contratantes da agência, com dados de contato e histórico de eventos realizados.",
      },
      { property: "og:title", content: "Clientes — PayCrew" },
      {
        property: "og:description",
        content: "Contratantes da agência e seus eventos, em um cadastro só.",
      },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  return (
    <AppShell titulo="Clientes" descricao="Etapa 2 — ainda não liberada">
      <EtapaPendente
        etapa="Etapa 2 · Cadastros"
        descricao="CRUD de clientes ligado a GET/POST /clientes. Liberado assim que a fundação for validada contra a API real."
        dependencias={["cors"]}
      />
    </AppShell>
  );
}
