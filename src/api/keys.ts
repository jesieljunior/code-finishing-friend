/**
 * Chaves de cache do TanStack Query, por entidade.
 *
 * Regra de invalidação após mutation:
 *  - escala alterada  -> escalas, equipes do evento, evento
 *  - ponto registrado -> pontos da escala, equipes do evento
 *  - fechamento       -> fechamentos, evento, pagamentos
 *  - pagamento        -> pagamentos, relatório do evento
 */

import type { StatusPagamento, UUID } from "./types";

export const queryKeys = {
  health: ["health"] as const,

  empresa: (empresaId: UUID) => ["empresa", empresaId] as const,
  configuracoes: (empresaId: UUID) =>
    ["empresa", empresaId, "configuracoes"] as const,

  clientes: (empresaId: UUID) => ["clientes", { empresaId }] as const,
  cliente: (clienteId: UUID) => ["cliente", clienteId] as const,

  freelancers: (empresaId: UUID) => ["freelancers", { empresaId }] as const,
  freelancer: (freelancerId: UUID) => ["freelancer", freelancerId] as const,

  evento: (eventoId: UUID) => ["evento", eventoId] as const,
  equipesDoEvento: (eventoId: UUID) =>
    ["evento", eventoId, "equipes"] as const,

  escala: (escalaId: UUID) => ["escala", escalaId] as const,

  fechamento: (fechamentoId: UUID) => ["fechamento", fechamentoId] as const,

  pagamentos: (status?: StatusPagamento) => ["pagamentos", { status }] as const,
  pagamento: (pagamentoId: UUID) => ["pagamento", pagamentoId] as const,

  relatorioEvento: (eventoId: UUID) => ["relatorio", eventoId] as const,
};
