/**
 * Endpoints reais existentes no FastAPI (app/main.py + app/routers/*).
 * Nada aqui é inventado. Endpoints ausentes estão em src/api/pendencias.ts.
 */

import { request } from "./client";
import type {
  ClienteCreate,
  ClienteRead,
  ClienteUpdate,
  ConfiguracaoRead,
  ConfiguracaoUpdate,
  EmpresaCreate,
  EmpresaRead,
  EmpresaUpdate,
  EquipeComResumo,
  EquipeCreate,
  EquipeRead,
  EscalaCreate,
  EscalaRead,
  EscalaSubstituir,
  EventoCreate,
  EventoRead,
  EventoUpdate,
  FechamentoAprovar,
  FechamentoRead,
  FreelancerCreate,
  FreelancerRead,
  FreelancerUpdate,
  PagamentoAgendar,
  PagamentoRead,
  PontoAprovar,
  PontoRead,
  RelatorioEvento,
  StatusPagamento,
  CheckRequest,
  UUID,
} from "./types";

export interface HealthResponse {
  status: string;
}

export const api = {
  // GET /health
  health: () => request<HealthResponse>("/health"),

  empresas: {
    criar: (body: EmpresaCreate) =>
      request<EmpresaRead>("/empresas", { method: "POST", body }),
    obter: (empresaId: UUID) => request<EmpresaRead>(`/empresas/${empresaId}`),
    atualizar: (empresaId: UUID, body: EmpresaUpdate) =>
      request<EmpresaRead>(`/empresas/${empresaId}`, { method: "PATCH", body }),
    configuracoes: (empresaId: UUID) =>
      request<ConfiguracaoRead>(`/empresas/${empresaId}/configuracoes`),
    atualizarConfiguracoes: (empresaId: UUID, body: ConfiguracaoUpdate) =>
      request<ConfiguracaoRead>(`/empresas/${empresaId}/configuracoes`, {
        method: "PATCH",
        body,
      }),
  },

  clientes: {
    listar: (empresaId: UUID) =>
      request<ClienteRead[]>("/clientes", { query: { empresa_id: empresaId } }),
    criar: (body: ClienteCreate) =>
      request<ClienteRead>("/clientes", { method: "POST", body }),
    obter: (clienteId: UUID) => request<ClienteRead>(`/clientes/${clienteId}`),
    atualizar: (clienteId: UUID, body: ClienteUpdate) =>
      request<ClienteRead>(`/clientes/${clienteId}`, { method: "PATCH", body }),
  },

  freelancers: {
    listar: (empresaId: UUID) =>
      request<FreelancerRead[]>("/freelancers", {
        query: { empresa_id: empresaId },
      }),
    criar: (body: FreelancerCreate) =>
      request<FreelancerRead>("/freelancers", { method: "POST", body }),
    obter: (freelancerId: UUID) =>
      request<FreelancerRead>(`/freelancers/${freelancerId}`),
    atualizar: (freelancerId: UUID, body: FreelancerUpdate) =>
      request<FreelancerRead>(`/freelancers/${freelancerId}`, {
        method: "PATCH",
        body,
      }),
  },

  eventos: {
    criar: (body: EventoCreate) =>
      request<EventoRead>("/eventos", { method: "POST", body }),
    obter: (eventoId: UUID) => request<EventoRead>(`/eventos/${eventoId}`),
    atualizar: (eventoId: UUID, body: EventoUpdate) =>
      request<EventoRead>(`/eventos/${eventoId}`, { method: "PATCH", body }),
    marcarPronto: (eventoId: UUID) =>
      request<EventoRead>(`/eventos/${eventoId}/marcar-pronto`, {
        method: "POST",
      }),
    encerrar: (eventoId: UUID) =>
      request<EventoRead>(`/eventos/${eventoId}/encerrar`, { method: "POST" }),
    arquivar: (eventoId: UUID) =>
      request<EventoRead>(`/eventos/${eventoId}/arquivar`, { method: "POST" }),
    cancelar: (eventoId: UUID) =>
      request<EventoRead>(`/eventos/${eventoId}/cancelar`, { method: "POST" }),
    criarEquipe: (eventoId: UUID, body: EquipeCreate) =>
      request<EquipeRead>(`/eventos/${eventoId}/equipes`, {
        method: "POST",
        body,
      }),
    listarEquipes: (eventoId: UUID) =>
      request<EquipeComResumo[]>(`/eventos/${eventoId}/equipes`),
  },

  escalas: {
    criar: (body: EscalaCreate) =>
      request<EscalaRead>("/escalas", { method: "POST", body }),
    obter: (escalaId: UUID) => request<EscalaRead>(`/escalas/${escalaId}`),
    confirmar: (escalaId: UUID) =>
      request<EscalaRead>(`/escalas/${escalaId}/confirmar`, { method: "POST" }),
    recusar: (escalaId: UUID) =>
      request<EscalaRead>(`/escalas/${escalaId}/recusar`, { method: "POST" }),
    substituir: (escalaId: UUID, body: EscalaSubstituir) =>
      request<EscalaRead>(`/escalas/${escalaId}/substituir`, {
        method: "POST",
        body,
      }),
  },

  operacao: {
    checkin: (body: CheckRequest) =>
      request<PontoRead>("/checkin", { method: "POST", body }),
    checkout: (body: CheckRequest) =>
      request<PontoRead>("/checkout", { method: "POST", body }),
    aprovarPonto: (pontoId: UUID, body: PontoAprovar) =>
      request<PontoRead>(`/pontos/${pontoId}/aprovar`, {
        method: "POST",
        body,
      }),
  },

  fechamento: {
    fecharEvento: (eventoId: UUID) =>
      request<FechamentoRead[]>(`/fechar-evento/${eventoId}`, {
        method: "POST",
      }),
    obter: (fechamentoId: UUID) =>
      request<FechamentoRead>(`/fechamentos/${fechamentoId}`),
    aprovar: (fechamentoId: UUID, body: FechamentoAprovar) =>
      request<FechamentoRead>(`/fechamentos/${fechamentoId}/aprovar`, {
        method: "POST",
        body,
      }),
  },

  pagamentos: {
    listar: (status?: StatusPagamento) =>
      request<PagamentoRead[]>("/pagamentos", { query: { status } }),
    obter: (pagamentoId: UUID) =>
      request<PagamentoRead>(`/pagamentos/${pagamentoId}`),
    agendar: (pagamentoId: UUID, body: PagamentoAgendar) =>
      request<PagamentoRead>(`/pagamentos/${pagamentoId}/agendar`, {
        method: "POST",
        body,
      }),
  },

  relatorios: {
    doEvento: (eventoId: UUID) =>
      request<RelatorioEvento>(`/relatorios/${eventoId}`),
  },
};
