import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { EtapaPendente } from "@/components/etapa-pendente";

export const Route = createFileRoute("/operacao")({
  head: () => ({
    meta: [
      { title: "Operação em campo — PayCrew" },
      {
        name: "description",
        content:
          "Check-in e check-out por QR Code, selfie e GPS, presença da equipe em tempo real e registro de ocorrências no dia do evento.",
      },
      { property: "og:title", content: "Operação em campo — PayCrew" },
      {
        property: "og:description",
        content:
          "Painel mobile do supervisor: quem chegou, quem atrasou, ocorrências e aprovação de pontos.",
      },
    ],
  }),
  component: OperacaoPage,
});

function OperacaoPage() {
  return (
    <AppShell
      titulo="Operação em campo"
      descricao="Etapa 5 — ainda não liberada"
    >
      <EtapaPendente
        etapa="Etapa 5 · Check-in, check-out e ocorrências"
        descricao="Tela mobile-first do supervisor. Depende de leitura de pontos e de um destino para a selfie."
        dependencias={["listar-pontos", "ocorrencias-endpoint", "upload-foto"]}
      />
    </AppShell>
  );
}
