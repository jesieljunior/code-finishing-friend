import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { resolverContextoLegacy } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", data.user.id)
      .maybeSingle();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const { data: papeisPlataforma } = await supabase
      .from("plataforma_usuarios")
      .select("papel")
      .eq("user_id", data.user.id);

    const contexto = resolverContextoLegacy({
      usuarioId: data.user.id,
      empresaId: usuario?.empresa_id ?? null,
      papeis: (roles ?? []).map((r) => r.role),
      papeisPlataforma: (papeisPlataforma ?? []).map((r) => r.papel as string),
    });

    const semEmpresa = !usuario?.empresa_id;
    const naOnboarding = location.pathname.startsWith("/onboarding");
    if (semEmpresa && !naOnboarding) throw redirect({ to: "/onboarding" });
    if (!semEmpresa && naOnboarding) throw redirect({ to: "/painel" });

    return { user: data.user, contexto };
  },
  component: () => <Outlet />,
});
