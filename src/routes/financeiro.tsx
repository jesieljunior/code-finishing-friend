import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro e Pix — PayCrew" },
      {
        name: "description",
        content:
          "Fila de pagamentos aos freelancers, agendamento e acompanhamento do Pix simulado, com comprovante por pagamento.",
      },
      { property: "og:title", content: "Financeiro e Pix — PayCrew" },
      {
        property: "og:description",
        content:
          "Agende e acompanhe os pagamentos das equipes com status vindos direto do backend.",
      },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  return (
    <AppShell
      titulo="Financeiro e Pix"
      descricao="Etapa 7 — ainda não liberada"
    >
      <EtapaPendente
        etapa="Etapa 7 · Pagamentos"
        descricao="Pix simulado. Os status exibidos serão exatamente os do enum do backend, sem estados inventados."
        dependencias={["status-pagamento", "aprovacao-financeira"]}
      />
    </AppShell>
  );
}
