import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/fechamento")({
  head: () => ({
    meta: [
      { title: "Fechamento de horas — PayCrew" },
      {
        name: "description",
        content:
          "Cálculo de horas trabalhadas, extras e descontos por freelancer, com aprovação ou contestação antes de gerar o pagamento.",
      },
      { property: "og:title", content: "Fechamento de horas — PayCrew" },
      {
        property: "og:description",
        content:
          "Revise horas, extras e descontos do evento e aprove o valor de cada freelancer.",
      },
    ],
  }),
  component: FechamentoPage,
});

function FechamentoPage() {
  return (
    <AppShell
      titulo="Fechamento de horas"
      descricao="Etapa 6 — ainda não liberada"
    >
      <EtapaPendente
        etapa="Etapa 6 · Fechamento e aprovação"
        descricao="Os cálculos vêm prontos do fechamento_service no backend; o frontend só exibe e envia aprovação ou contestação."
        dependencias={["listar-fechamentos", "contestacao"]}
      />
    </AppShell>
  );
}
