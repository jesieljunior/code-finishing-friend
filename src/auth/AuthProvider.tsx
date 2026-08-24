import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PapelUsuario } from "@/api/types";
import {
  gravarSessao,
  lerSessaoArmazenada,
  type Sessao,
} from "@/auth/session";
import { pode, type Capacidade } from "@/auth/permissions";

interface AuthContextValue {
  sessao: Sessao | null;
  /** false até a leitura do localStorage no cliente (evita mismatch de SSR). */
  carregado: boolean;
  /**
   * Compatibilidade temporária: define a sessão localmente enquanto o
   * FastAPI não expõe /auth/login. Quando o JWT existir, esta função
   * passará a chamar a API e guardar o token retornado — sem mudar o
   * restante da aplicação.
   */
  definirSessao: (sessao: Sessao) => void;
  sair: () => void;
  podeFazer: (capacidade: Capacidade) => boolean;
  papel: PapelUsuario | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setSessao(lerSessaoArmazenada());
    setCarregado(true);
  }, []);

  const definirSessao = useCallback((nova: Sessao) => {
    gravarSessao(nova);
    setSessao(nova);
  }, []);

  const sair = useCallback(() => {
    gravarSessao(null);
    setSessao(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessao,
      carregado,
      definirSessao,
      sair,
      papel: sessao?.papel ?? null,
      podeFazer: (capacidade) =>
        sessao ? pode(sessao.papel, capacidade) : false,
    }),
    [sessao, carregado, definirSessao, sair],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
