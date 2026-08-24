/**
 * Tipos espelhando os schemas reais do FastAPI (app/schemas/*, app/models/enums.py).
 * NÃO inventar campos aqui. Se a UI precisar de um dado que não existe,
 * registrar a pendência em src/api/pendencias.ts e solicitar no backend.
 */

export type UUID = string;
/** Decimal do Pydantic é serializado como string no JSON do FastAPI. */
export type DecimalString = string;
export type ISODateTime = string;

// ---------- enums (app/models/enums.py) ----------

export const PapelUsuario = {
  ADMIN: "admin",
  COORDENADOR: "coordenador",
  FINANCEIRO: "financeiro",
  SUPERVISOR: "supervisor",
} as const;
export type PapelUsuario = (typeof PapelUsuario)[keyof typeof PapelUsuario];

export const StatusEvento = {
  PLANEJAMENTO: "planejamento",
  ESCALA: "escala",
  CONFIRMACOES: "confirmacoes",
  PRONTO: "pronto",
  EM_EXECUCAO: "em_execucao",
  ENCERRANDO: "encerrando",
  FECHAMENTO: "fechamento",
  PAGAMENTO: "pagamento",
  CONCLUIDO: "concluido",
  ARQUIVADO: "arquivado",
  CANCELADO: "cancelado",
} as const;
export type StatusEvento = (typeof StatusEvento)[keyof typeof StatusEvento];

/** Ordem oficial (ORDEM_STATUS_EVENTO no backend). CANCELADO fica fora. */
export const ORDEM_STATUS_EVENTO: StatusEvento[] = [
  StatusEvento.PLANEJAMENTO,
  StatusEvento.ESCALA,
  StatusEvento.CONFIRMACOES,
  StatusEvento.PRONTO,
  StatusEvento.EM_EXECUCAO,
  StatusEvento.ENCERRANDO,
  StatusEvento.FECHAMENTO,
  StatusEvento.PAGAMENTO,
  StatusEvento.CONCLUIDO,
  StatusEvento.ARQUIVADO,
];

export const TipoValor = { DIARIA: "diaria", HORA: "hora" } as const;
export type TipoValor = (typeof TipoValor)[keyof typeof TipoValor];

export const StatusEscala = {
  CONVIDADO: "convidado",
  CONFIRMADO: "confirmado",
  RECUSADO: "recusado",
  SUBSTITUIDO: "substituido",
} as const;
export type StatusEscala = (typeof StatusEscala)[keyof typeof StatusEscala];

export const TipoPonto = {
  ENTRADA: "entrada",
  SAIDA: "saida",
  INICIO_INTERVALO: "inicio_intervalo",
  FIM_INTERVALO: "fim_intervalo",
} as const;
export type TipoPonto = (typeof TipoPonto)[keyof typeof TipoPonto];

export const MetodoCheck = {
  QRCODE: "qrcode",
  SELFIE: "selfie",
  MANUAL: "manual",
} as const;
export type MetodoCheck = (typeof MetodoCheck)[keyof typeof MetodoCheck];

export const StatusPonto = {
  PENDENTE: "pendente",
  APROVADO: "aprovado",
  RECUSADO: "recusado",
} as const;
export type StatusPonto = (typeof StatusPonto)[keyof typeof StatusPonto];

export const StatusFechamento = {
  PENDENTE_APROVACAO: "pendente_aprovacao",
  APROVADO: "aprovado",
  CONTESTADO: "contestado",
} as const;
export type StatusFechamento =
  (typeof StatusFechamento)[keyof typeof StatusFechamento];

export const StatusPagamento = {
  PENDENTE: "pendente",
  AGENDADO: "agendado",
  EXECUTADO: "executado",
  FALHOU: "falhou",
} as const;
export type StatusPagamento =
  (typeof StatusPagamento)[keyof typeof StatusPagamento];

// ---------- base ----------

export interface TimestampRead {
  criado_em: ISODateTime;
  atualizado_em: ISODateTime;
}

// ---------- empresa / usuario / configuracao ----------

export interface EmpresaRead extends TimestampRead {
  id: UUID;
  nome: string;
  cnpj: string;
  subconta_parceiro_id: string | null;
  ativa: boolean;
}

export interface EmpresaCreate {
  nome: string;
  cnpj: string;
}

export interface EmpresaUpdate {
  nome?: string;
  ativa?: boolean;
}

export interface UsuarioRead extends TimestampRead {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
}

export interface ConfiguracaoRead extends TimestampRead {
  id: UUID;
  empresa_id: UUID;
  checkin_exige_selfie: boolean;
  checkin_exige_gps: boolean;
  escala_exige_confirmacao_presenca: boolean;
  substituicao_habilitada: boolean;
  ocorrencias_habilitadas: boolean;
}

export interface ConfiguracaoUpdate {
  checkin_exige_selfie?: boolean;
  checkin_exige_gps?: boolean;
  escala_exige_confirmacao_presenca?: boolean;
  substituicao_habilitada?: boolean;
  ocorrencias_habilitadas?: boolean;
}

// ---------- cliente ----------

export interface ClienteRead extends TimestampRead {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  observacoes: string | null;
}

export interface ClienteCreate {
  empresa_id: UUID;
  nome: string;
  observacoes?: string | null;
}

export interface ClienteUpdate {
  nome?: string;
  observacoes?: string | null;
}

// ---------- freelancer ----------

export interface FreelancerRead extends TimestampRead {
  id: UUID;
  empresa_id: UUID;
  nome: string;
  cpf: string;
  telefone: string | null;
  chave_pix: string;
  funcao: string | null;
  ativo: boolean;
}

export interface FreelancerCreate {
  empresa_id: UUID;
  nome: string;
  cpf: string;
  chave_pix: string;
  telefone?: string | null;
  funcao?: string | null;
}

export interface FreelancerUpdate {
  nome?: string;
  telefone?: string | null;
  chave_pix?: string;
  funcao?: string | null;
  ativo?: boolean;
}

// ---------- evento / equipe ----------

export interface EventoRead extends TimestampRead {
  id: UUID;
  empresa_id: UUID;
  cliente_id: UUID | null;
  nome: string;
  local: string | null;
  data_inicio: ISODateTime;
  data_fim: ISODateTime | null;
  status: StatusEvento;
  qr_code_token: string;
}

export interface EventoCreate {
  empresa_id: UUID;
  cliente_id?: UUID | null;
  nome: string;
  local?: string | null;
  data_inicio: ISODateTime;
  data_fim?: ISODateTime | null;
}

export interface EventoUpdate {
  nome?: string;
  cliente_id?: UUID | null;
  local?: string | null;
  data_inicio?: ISODateTime;
  data_fim?: ISODateTime | null;
}

export interface EquipeRead extends TimestampRead {
  id: UUID;
  evento_id: UUID;
  nome: string;
  supervisor_id: UUID | null;
}

export interface EquipeComResumo extends EquipeRead {
  total_membros: number;
  total_chegaram: number;
  total_pendentes: number;
}

export interface EquipeCreate {
  evento_id: UUID;
  nome: string;
  supervisor_id?: UUID | null;
}

// ---------- escala ----------

export interface EscalaRead extends TimestampRead {
  id: UUID;
  equipe_id: UUID;
  freelancer_id: UUID;
  valor_combinado: DecimalString;
  tipo_valor: TipoValor;
  status: StatusEscala;
  convite_enviado_em: ISODateTime | null;
  confirmado_em: ISODateTime | null;
  substituido_por_id: UUID | null;
}

export interface EscalaCreate {
  equipe_id: UUID;
  freelancer_id: UUID;
  valor_combinado: DecimalString | number;
  tipo_valor: TipoValor;
}

export interface EscalaSubstituir {
  novo_freelancer_id: UUID;
}

// ---------- operação ----------

export interface PontoRead extends TimestampRead {
  id: UUID;
  escala_id: UUID;
  tipo: TipoPonto;
  metodo: MetodoCheck;
  registrado_em: ISODateTime;
  foto_url: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  device_hash: string | null;
  status: StatusPonto;
  aprovado_por_id: UUID | null;
  aprovado_em: ISODateTime | null;
}

export interface CheckRequest {
  escala_id: UUID;
  metodo: MetodoCheck;
  qr_code_token?: string | null;
  foto_url?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  device_hash?: string | null;
}

export interface PontoAprovar {
  aprovado: boolean;
  motivo_recusa?: string | null;
}

export interface OcorrenciaRead extends TimestampRead {
  id: UUID;
  escala_id: UUID;
  descricao: string;
  registrado_por_id: UUID;
}

// ---------- fechamento ----------

export interface FechamentoRead extends TimestampRead {
  id: UUID;
  escala_id: UUID;
  horas_trabalhadas: DecimalString;
  valor_calculado: DecimalString;
  status: StatusFechamento;
  aprovado_por_id: UUID | null;
  aprovado_em: ISODateTime | null;
}

export interface FechamentoAprovar {
  aprovado: boolean;
  motivo_contestacao?: string | null;
}

// ---------- pagamento ----------

export interface PagamentoRead extends TimestampRead {
  id: UUID;
  fechamento_id: UUID;
  valor: DecimalString;
  status: StatusPagamento;
  data_agendada: ISODateTime | null;
  executado_em: ISODateTime | null;
  txid_parceiro: string | null;
  comprovante_url: string | null;
  erro: string | null;
  tentativas: number;
}

export interface PagamentoAgendar {
  data_agendada: ISODateTime;
}

// ---------- relatório ----------

export interface RelatorioEvento {
  evento_id: UUID;
  evento_nome: string;
  total_escalados: number;
  total_fechamentos: number;
  total_pagamentos_executados: number;
  total_pagamentos_pendentes: number;
  valor_total_calculado: DecimalString;
  valor_total_pago: DecimalString;
}
