/**
 * Sessão do PayCrew.
 *
 * IMPORTANTE — COMPATIBILIDADE TEMPORÁRIA:
 * O FastAPI atual NÃO possui autenticação (não existe /auth/login nem
 * /auth/me). Até que exista, a sessão é escolhida localmente: empresa,
 * usuário e papel. Isso serve apenas para o frontend saber qual empresa
 * consultar e qual UI exibir — NÃO é autorização.
 *
 * A autorização definitiva será do backend, via usuário autenticado.
 * Quando o JWT existir, apenas `login()` em AuthProvider muda: o token
 * passa a vir da API e já é injetado pelo cliente HTTP.
 */

import type { PapelUsuario, UUID } from "@/api/types";

export interface Sessao {
  empresaId: UUID;
  /** Opcional: só existe quando o operador informa um usuário do backend. */
  usuarioId: UUID | null;
  /** Temporário: hoje escolhido localmente; futuramente vem do JWT. */
  papel: PapelUsuario;
  nomeExibicao: string | null;
  /** Preenchido apenas quando o backend passar a emitir JWT. */
  token: string | null;
}

const STORAGE_KEY = "paycrew.sessao.v1";

export function lerSessaoArmazenada(): Sessao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Sessao>;
    if (!parsed.empresaId || !parsed.papel) return null;
    return {
      empresaId: parsed.empresaId,
      usuarioId: parsed.usuarioId ?? null,
      papel: parsed.papel,
      nomeExibicao: parsed.nomeExibicao ?? null,
      token: parsed.token ?? null,
    };
  } catch {
    return null;
  }
}

export function gravarSessao(sessao: Sessao | null): void {
  if (typeof window === "undefined") return;
  if (sessao) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** Lido pelo cliente HTTP a cada requisição, sem acoplar React. */
export function getStoredToken(): string | null {
  return lerSessaoArmazenada()?.token ?? null;
}
