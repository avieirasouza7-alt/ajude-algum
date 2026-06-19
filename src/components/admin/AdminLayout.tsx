import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Megaphone,
  ShieldAlert,
  Users,
  FileText,
  ScrollText,
  Settings,
  Eye,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { fetchSiteVisitCount, formatViewCount } from "@/lib/site-visits";

const NAV = [
  { to: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/denuncias", label: "Denúncias", icon: ShieldAlert },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/conteudo", label: "Conteúdo", icon: FileText },
  { to: "/admin/logs", label: "Auditoria", icon: ScrollText },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: visitCount, isLoading: visitsLoading } = useQuery({
    queryKey: ["admin", "site-visits"],
    queryFn: fetchSiteVisitCount,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Visitantes do site
              </p>
              <p className="font-display text-2xl font-extrabold leading-tight text-foreground">
                {visitsLoading ? "—" : formatViewCount(visitCount ?? 0)}
              </p>
            </div>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Contagem do site (1 visita por sessão). Detalhes completos também no{" "}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Google Analytics
            </a>
            .
          </p>
        </div>
      </div>
      <div className="border-b border-border/60 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Painel administrativo
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => {
              const exact = "exact" in rest && rest.exact;
              const active = exact ? path === to || path === `${to}/` : path.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
                    active
                      ? "gradient-warm text-primary-foreground shadow-warm"
                      : "bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
