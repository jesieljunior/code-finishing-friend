import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  podeCom,
  type Capacidade,
  type Empresa,
  type PapelUsuario,
  type Usuario,
} from "@/lib/dominio";

export interface Sessao {
  usuario: Usuario;
  empresa: Empresa | null;
  papeis: PapelUsuario[];
  papeisPlataforma: string[];
}


async function carregarSessao(): Promise<Sessao | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!usuario) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  let empresa: Empresa | null = null;
  if (usuario.empresa_id) {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", usuario.empresa_id)
      .maybeSingle();
    empresa = data ?? null;
  }

  return {
    usuario,
    empresa,
    papeis: (roles ?? []).map((r) => r.role),
  };
}

export function useSessao() {
  const query = useQuery({
    queryKey: ["sessao"],
    queryFn: carregarSessao,
    staleTime: 30_000,
  });

  const sessao = query.data ?? null;

  return {
    ...query,
    sessao,
    empresaId: sessao?.usuario.empresa_id ?? null,
    papeis: sessao?.papeis ?? [],
    pode: (c: Capacidade) => podeCom(sessao?.papeis ?? [], c),
  };
}
