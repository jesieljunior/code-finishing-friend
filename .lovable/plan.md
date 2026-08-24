# PayCrew — Frontend (Lovable) sobre o backend FastAPI

Decisão arquitetural aceita: o FastAPI existente é o backend oficial e a única
fonte de verdade. O Lovable constrói apenas o frontend React/TypeScript, que
consome a API REST. Nada de banco, cálculo de horas, fechamento ou pagamento
duplicado aqui.

## Objetivo desta entrega

Entregar o ciclo completo demonstrável, com todas as regras vindo da API:

agência → cliente → freelancers → evento → equipe → supervisor → escala →
confirmação → check-in → check-out → cálculo → aprovação do supervisor →
aprovação do financeiro → agendamento → Pix simulado → pagamento concluído.

## Conexão com a API

- Uma variável de configuração `VITE_API_BASE_URL` aponta para o FastAPI
  (local durante o desenvolvimento, servidor real depois).
- Cliente HTTP único, com token de autenticação, tratamento de erro
  padronizado (mensagens da API exibidas ao usuário) e estados de
  carregando/erro/vazio em todas as telas.
- Enquanto a API não estiver acessível pelo preview, as telas mostram o erro
  de conexão de forma clara — o frontend não inventa dados.

Observação: o backend precisa liberar CORS para o domínio do preview e do app
publicado, e hoje ainda não tem autenticação (os endpoints recebem
`supervisor_id`/`coordenador_id` por query param). O frontend será escrito
esperando login com token; enquanto o backend não tiver auth, uso um modo de
compatibilidade que envia esses parâmetros.

## Telas

**Acesso**
- Login (e-mail/senha), seleção de contexto da agência, logout.
- Navegação e permissões visuais por papel: Admin, Coordenador, Financeiro,
  Supervisor. O frontend só esconde o que o papel não usa; a autorização real
  é do backend.

**Cadastros**
- Clientes: lista, criar, editar, observações.
- Freelancers: lista com busca e filtro, criar/editar (nome, CPF, telefone,
  chave Pix, função, ativo), importação por planilha (envio à API).
- Configurações da agência: liga/desliga selfie, GPS, confirmação de presença,
  substituição e ocorrências (consumindo o módulo de Configurações).

**Eventos**
- Lista com filtro por status e cliente.
- Criar/editar evento (nome, cliente, local, datas).
- Detalhe do evento com a linha do tempo dos estados (Planejamento → Escala →
  Confirmações → Pronto → Em execução → Encerrando → Fechamento → Pagamento →
  Concluído → Arquivado) e botões que só avançam um passo, chamando os
  endpoints de transição. Cancelamento disponível conforme a regra do backend.
- Equipes do evento: criar, nomear, definir supervisor.
- QR Code do evento gerado a partir do token que a API devolve.

**Escala**
- Escalar freelancers para uma equipe com valor combinado e tipo (diária/hora).
- Ações: convidar, confirmar, recusar, substituir (quando habilitado).
- Visão de status por pessoa.

**Operação (mobile-first)**
- Tela do freelancer para check-in/check-out, com duas formas de acesso
  decididas pelo organizador:
  1. Link/QR público do evento, identificação por CPF, sem senha;
  2. Login próprio do freelancer.
  A escolha vive nas configurações da agência.
- Captura de selfie apenas pela câmera (sem galeria) e envio de GPS quando as
  flags estiverem ligadas.
- Painel do supervisor: "15 escalados / 12 presentes / 2 atrasados / 1
  pendente", lista de pontos com aprovar/recusar e registro de ocorrências.

**Fechamento**
- Ação de fechar evento, lista de fechamentos por freelancer com horas e valor
  calculados pela API, aprovação/contestação do coordenador.

**Financeiro**
- Resumo do evento: total de freelancers, total a pagar, aprovados, pendentes,
  data de pagamento.
- Lista de pagamentos com status (pendente → agendado → processando → pago /
  falhou), agendamento de data e hora, acompanhamento do Pix simulado e acesso
  ao comprovante e ao histórico para auditoria.

**Relatórios**
- Relatório final do evento com os números vindos de `/relatorios/{evento_id}`,
  com exportação em CSV do que a API retornar.

Fora do escopo agora: landing page, IA, analytics avançado, WhatsApp,
white-label, marketplace, API pública.

## Identidade visual

Aplicativo operacional, denso e legível, pensado para uso no celular durante o
evento e no desktop no escritório: tipografia forte, contraste alto, estados de
status por cor consistente (pendente, aprovado, recusado, pago), modo claro e
escuro. Sem visual genérico roxo/gradiente.

## Detalhes técnicos

- TanStack Start + React + TypeScript + Tailwind + shadcn/ui.
- TanStack Query para todas as leituras e mutações contra o FastAPI, com
  invalidação por evento/equipe/escala após cada ação.
- Camada `src/api/` espelhando os routers existentes: empresas, configurações,
  clientes, freelancers, eventos, equipes, escalas, operação, fechamento,
  pagamentos, relatórios. Tipos TypeScript derivados dos schemas Pydantic.
- Rotas protegidas por papel apenas para navegação; validação de formulário
  com Zod refletindo as regras dos schemas (CPF/CNPJ, datas, selfie exige
  foto), sem substituir a validação do backend.
- Nenhuma tabela nem função de negócio criada no Lovable Cloud.

## O que preciso de você

1. A URL onde o FastAPI vai rodar/estar acessível para o preview.
2. Confirmar se posso assumir que o backend ganhará login com token (JWT) —
   e, se sim, qual endpoint (`/auth/login`), ou se sigo pelo modo de
   compatibilidade por enquanto.

Se preferir, começo pelas telas e pela camada de API e ligamos a URL depois.

## Entrega em etapas

1. Base: design system, layout, cliente de API, login e navegação por papel.
2. Cadastros: clientes, freelancers, configurações.
3. Eventos, equipes e escala, com a máquina de estados.
4. Operação: check-in/out, QR, selfie/GPS, painel do supervisor.
5. Fechamento e aprovações.
6. Financeiro, Pix simulado, comprovantes e relatórios.
