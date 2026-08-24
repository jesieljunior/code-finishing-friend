import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/freelancers")({
  head: () => ({
    meta: [
      { title: "Freelancers — PayCrew" },
      {
        name: "description",
        content:
          "Banco de freelancers da agência: dados pessoais, funções, valor hora e chave Pix para o pagamento após o evento.",
      },
      { property: "og:title", content: "Freelancers — PayCrew" },
      {
        property: "og:description",
        content:
          "Cadastro de freelancers com funções, valor hora e chave Pix.",
      },
    ],
  }),
  component: FreelancersPage,
});

function FreelancersPage() {
  return (
    <AppShell titulo="Freelancers" descricao="Etapa 2 — ainda não liberada">
      <EtapaPendente
        etapa="Etapa 2 · Cadastros"
        descricao="CRUD de freelancers ligado a GET/POST /freelancers, incluindo chave Pix e funções."
        dependencias={["cors"]}
      />
    </AppShell>
  );
}
