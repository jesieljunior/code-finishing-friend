/**
 * Permissões de UI.
 *
 * Isto NÃO é autorização. Serve só para esconder/desabilitar elementos e
 * evitar chamadas que o backend recusaria. A decisão final é sempre do
 * FastAPI, que hoje ainda não valida papel (pendência registrada).
 */

import { PapelUsuario } from "@/api/types";

export type Capacidade =
  | "cadastros.gerenciar"
  | "configuracoes.gerenciar"
  | "eventos.gerenciar"
  | "escala.gerenciar"
  | "operacao.supervisionar"
  | "fechamento.aprovar"
  | "financeiro.gerenciar"
  | "relatorios.ver";

const MATRIZ: Record<PapelUsuario, Capacidade[]> = {
  [PapelUsuario.ADMIN]: [
    "cadastros.gerenciar",
    "configuracoes.gerenciar",
    "eventos.gerenciar",
    "escala.gerenciar",
    "operacao.supervisionar",
    "fechamento.aprovar",
    "financeiro.gerenciar",
    "relatorios.ver",
  ],
  [PapelUsuario.COORDENADOR]: [
    "cadastros.gerenciar",
    "eventos.gerenciar",
    "escala.gerenciar",
    "operacao.supervisionar",
    "fechamento.aprovar",
    "relatorios.ver",
  ],
  [PapelUsuario.FINANCEIRO]: ["financeiro.gerenciar", "relatorios.ver"],
  [PapelUsuario.SUPERVISOR]: ["operacao.supervisionar", "relatorios.ver"],
};

export function pode(papel: PapelUsuario, capacidade: Capacidade): boolean {
  return MATRIZ[papel].includes(capacidade);
}

export const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  [PapelUsuario.ADMIN]: "Administrador",
  [PapelUsuario.COORDENADOR]: "Coordenador",
  [PapelUsuario.FINANCEIRO]: "Financeiro",
  [PapelUsuario.SUPERVISOR]: "Supervisor",
};
