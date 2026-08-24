import { cn } from "@/lib/utils";
import {
  StatusEscala,
  StatusEvento,
  StatusFechamento,
  StatusPagamento,
  StatusPonto,
} from "@/api/types";

type Tom = "neutro" | "pendente" | "ok" | "ativo" | "erro" | "pago";

const TOM_CLASSES: Record<Tom, string> = {
  neutro: "bg-status-neutro text-status-neutro-foreground",
  pendente: "bg-status-pendente text-status-pendente-foreground",
  ok: "bg-status-ok text-status-ok-foreground",
  ativo: "bg-status-ativo text-status-ativo-foreground",
  erro: "bg-status-erro text-status-erro-foreground",
  pago: "bg-status-pago text-status-pago-foreground",
};

/** Rótulo e tom por status real do backend. Nenhum status inventado. */
const MAPA: Record<string, { rotulo: string; tom: Tom }> = {
  // Evento
  [StatusEvento.PLANEJAMENTO]: { rotulo: "Planejamento", tom: "neutro" },
  [StatusEvento.ESCALA]: { rotulo: "Escala", tom: "neutro" },
  [StatusEvento.CONFIRMACOES]: { rotulo: "Confirmações", tom: "pendente" },
  [StatusEvento.PRONTO]: { rotulo: "Pronto", tom: "ok" },
  [StatusEvento.EM_EXECUCAO]: { rotulo: "Em execução", tom: "ativo" },
  [StatusEvento.ENCERRANDO]: { rotulo: "Encerrando", tom: "ativo" },
  [StatusEvento.FECHAMENTO]: { rotulo: "Fechamento", tom: "pendente" },
  [StatusEvento.PAGAMENTO]: { rotulo: "Pagamento", tom: "pendente" },
  [StatusEvento.CONCLUIDO]: { rotulo: "Concluído", tom: "pago" },
  [StatusEvento.ARQUIVADO]: { rotulo: "Arquivado", tom: "neutro" },
  [StatusEvento.CANCELADO]: { rotulo: "Cancelado", tom: "erro" },
  // Escala
  [StatusEscala.CONVIDADO]: { rotulo: "Convidado", tom: "pendente" },
  [StatusEscala.CONFIRMADO]: { rotulo: "Confirmado", tom: "ok" },
  [StatusEscala.RECUSADO]: { rotulo: "Recusado", tom: "erro" },
  [StatusEscala.SUBSTITUIDO]: { rotulo: "Substituído", tom: "neutro" },
  // Ponto / Pagamento (valores "pendente", "aprovado" e "recusado" são
  // compartilhados entre enums do backend — um único rótulo serve para todos)
  [StatusPonto.PENDENTE]: { rotulo: "Pendente", tom: "pendente" },
  [StatusPonto.APROVADO]: { rotulo: "Aprovado", tom: "ok" },
  // Fechamento
  [StatusFechamento.PENDENTE_APROVACAO]: {
    rotulo: "Pendente de aprovação",
    tom: "pendente",
  },
  [StatusFechamento.CONTESTADO]: { rotulo: "Contestado", tom: "erro" },
  // Pagamento
  [StatusPagamento.AGENDADO]: { rotulo: "Agendado", tom: "ativo" },
  [StatusPagamento.EXECUTADO]: { rotulo: "Pago", tom: "pago" },
  [StatusPagamento.FALHOU]: { rotulo: "Falhou", tom: "erro" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const info = MAPA[status] ?? { rotulo: status, tom: "neutro" as Tom };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium leading-tight",
        TOM_CLASSES[info.tom],
        className,
      )}
    >
      {info.rotulo}
    </span>
  );
}
