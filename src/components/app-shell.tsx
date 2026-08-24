import { Link, useRouterState } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  PlugZap,
  Radio,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { API_BASE_URL, isApiConfigured } from "@/api/config";
import { useAuth } from "@/auth/AuthProvider";
import { ROTULO_PAPEL, type Capacidade } from "@/auth/permissions";
import { SessaoSwitcher } from "@/components/sessao-switcher";
import { cn } from "@/lib/utils";

interface ItemNav {
  to: string;
  label: string;
  icone: ComponentType<{ className?: string }>;
  capacidade?: Capacidade;
  mobile?: boolean;
}

const NAV: ItemNav[] = [
  { to: "/", label: "Visão geral", icone: Building2, mobile: true },
  {
    to: "/eventos",
    label: "Eventos",
    icone: CalendarDays,
    capacidade: "eventos.gerenciar",
    mobile: true,
  },
  {
    to: "/operacao",
    label: "Operação",
    icone: Radio,
    capacidade: "operacao.supervisionar",
    mobile: true,
  },
  {
    to: "/fechamento",
    label: "Fechamento",
    icone: ClipboardCheck,
    capacidade: "fechamento.aprovar",
    mobile: true,
  },
  {
    to: "/financeiro",
    label: "Financeiro",
    icone: Wallet,
    capacidade: "financeiro.gerenciar",
    mobile: true,
  },
  {
    to: "/clientes",
    label: "Clientes",
    icone: Banknote,
    capacidade: "cadastros.gerenciar",
  },
  {
    to: "/freelancers",
    label: "Freelancers",
    icone: Users,
    capacidade: "cadastros.gerenciar",
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icone: FileBarChart,
    capacidade: "relatorios.ver",
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    icone: Settings,
    capacidade: "configuracoes.gerenciar",
  },
  { to: "/conexao", label: "Conexão com a API", icone: PlugZap },
];

function useItensVisiveis() {
  const { sessao, podeFazer } = useAuth();
  return NAV.filter(
    (item) => !item.capacidade || (sessao ? podeFazer(item.capacidade) : false),
  );
}

export function AppShell({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  const itens = useItensVisiveis();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { sessao, carregado } = useAuth();
  const itensMobile = itens.filter((i) => i.mobile);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="border-b border-sidebar-border px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">PayCrew</p>
          <p className="text-xs text-sidebar-foreground/60">
            Operação e pagamento de equipes
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {itens.map((item) => {
            const ativo =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icone = item.icone;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icone className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
          <p className="truncate">
            API: {isApiConfigured() ? API_BASE_URL : "não configurada"}
          </p>
          {carregado && sessao ? (
            <p className="mt-1 truncate">
              {sessao.nomeExibicao ?? "Sessão local"} ·{" "}
              {ROTULO_PAPEL[sessao.papel]}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {titulo}
              </h1>
              {descricao ? (
                <p className="truncate text-sm text-muted-foreground">
                  {descricao}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {acoes}
              <SessaoSwitcher />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background lg:hidden">
        {itensMobile.slice(0, 5).map((item) => {
          const ativo =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icone = item.icone;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px]",
                ativo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icone className="size-5" />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
