import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

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

    const semEmpresa = !usuario?.empresa_id;
    const naOnboarding = location.pathname.startsWith("/onboarding");
    if (semEmpresa && !naOnboarding) throw redirect({ to: "/onboarding" });
    if (!semEmpresa && naOnboarding) throw redirect({ to: "/painel" });

    return { user: data.user };
  },
  component: () => <Outlet />,
});
