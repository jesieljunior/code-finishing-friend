import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { Capacidade, PapelUsuario } from "@/lib/dominio";
import { podeCom } from "@/lib/dominio";

export async function exigirCapacidade(
  supabase: SupabaseClient<Database>,
  userId: string,
  capacidade: Capacidade,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  const papeis = (data ?? []).map((item) => item.role as PapelUsuario);
  if (!podeCom(papeis, capacidade)) {
    throw new Error("Você não tem permissão para realizar esta ação.");
  }
}