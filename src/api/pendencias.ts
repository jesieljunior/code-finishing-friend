/**
 * Pendências de backend identificadas ao ler app/main.py, app/routers/*
 * e app/schemas/*. Nada disso é contornado no frontend: as telas que
 * dependem destes itens ficam bloqueadas até o FastAPI expor o contrato.
 */

export interface Pendencia {
  id: string;
  titulo: string;
  detalhe: string;
  etapaBloqueada: string;
  gravidade: "bloqueante" | "importante" | "divergencia";
}

export const PENDENCIAS_BACKEND: Pendencia[] = [
  {
    id: "cors",
    titulo: "CORSMiddleware não registrado no FastAPI",
    detalhe:
      "app/main.py não adiciona CORSMiddleware. Sem liberar a origem do preview e da produção, o navegador bloqueia toda chamada. O frontend não contorna CORS.",
    etapaBloqueada: "Etapa 1 → 2",
    gravidade: "bloqueante",
  },
  {
    id: "auth",
    titulo: "Sem autenticação",
    detalhe:
      "Não existem /auth/login, /auth/me nem middleware de sessão. Papel e usuário hoje chegam por parâmetro (ex.: supervisor_id, aprovado_por_id), o que é apenas compatibilidade temporária.",
    etapaBloqueada: "Todas",
    gravidade: "bloqueante",
  },
  {
    id: "listar-eventos",
    titulo: "Falta GET /eventos",
    detalhe:
      "Existe apenas GET /eventos/{id}. A lista de eventos por empresa não tem endpoint.",
    etapaBloqueada: "Etapa 3",
    gravidade: "bloqueante",
  },
  {
    id: "listar-escalas",
    titulo: "Falta listagem de escalas",
    detalhe:
      "Existe apenas GET /escalas/{id}. Falta listar escalas por equipe, evento ou freelancer.",
    etapaBloqueada: "Etapas 4, 5 e 6",
    gravidade: "bloqueante",
  },
  {
    id: "listar-pontos",
    titulo: "Falta listagem de pontos e ocorrências",
    detalhe:
      "Só há POST /checkin, POST /checkout e POST /pontos/{id}/aprovar. Sem leitura, a visão de presentes/ausentes/atrasados e a fila de aprovação não têm fonte.",
    etapaBloqueada: "Etapa 5",
    gravidade: "bloqueante",
  },
  {
    id: "ocorrencias-endpoint",
    titulo: "Ocorrências têm schema, mas não têm rota",
    detalhe:
      "OcorrenciaCreate/OcorrenciaRead existem em app/schemas/operacao.py, porém nenhum router expõe criação ou listagem de ocorrências.",
    etapaBloqueada: "Etapa 5",
    gravidade: "bloqueante",
  },
  {
    id: "listar-fechamentos",
    titulo: "Falta listagem de fechamentos por evento",
    detalhe:
      "POST /fechar-evento/{evento_id} retorna a lista uma vez, mas não há GET /eventos/{id}/fechamentos para reabrir a tela depois.",
    etapaBloqueada: "Etapa 6",
    gravidade: "bloqueante",
  },
  {
    id: "upload-foto",
    titulo: "Selfie exige foto_url, não há upload",
    detalhe:
      "CheckRequest aceita foto_url (string). Não existe endpoint de upload de imagem, então o frontend precisa de um destino para a selfie.",
    etapaBloqueada: "Etapa 5",
    gravidade: "bloqueante",
  },
  {
    id: "usuarios",
    titulo: "Falta listagem de usuários e empresas",
    detalhe:
      "Schemas UsuarioCreate/UsuarioRead existem, mas não há rotas de usuário. Sem isso não é possível escolher supervisor de equipe pela interface nem identificar a agência sem digitar o UUID.",
    etapaBloqueada: "Etapas 2 e 3",
    gravidade: "bloqueante",
  },
  {
    id: "status-pagamento",
    titulo: "Divergência de nomenclatura no pagamento",
    detalhe:
      "O fluxo descrito no produto usa 'processando' e 'pago'. O enum do backend é pendente | agendado | executado | falhou. O frontend exibe os estados reais do backend; nenhum estado é inventado.",
    etapaBloqueada: "Etapa 7",
    gravidade: "divergencia",
  },
  {
    id: "aprovacao-financeira",
    titulo: "Sem aprovação financeira separada",
    detalhe:
      "Existe apenas POST /pagamentos/{id}/agendar. A etapa 'aprovação financeira' antes do agendamento não tem endpoint, e o disparo Pix fica a cargo do scheduler + webhook.",
    etapaBloqueada: "Etapa 7",
    gravidade: "importante",
  },
  {
    id: "contestacao",
    titulo: "Contestação de fechamento sem rota dedicada",
    detalhe:
      "FechamentoAprovar aceita aprovado=false + motivo_contestacao, o que cobre a contestação — confirmar se o backend registra o motivo e muda o status para 'contestado'.",
    etapaBloqueada: "Etapa 6",
    gravidade: "importante",
  },
];
