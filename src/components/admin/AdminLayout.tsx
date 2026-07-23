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
  Radio,
  BarChart3,
  MoreHorizontal,
  Sprout,
} from "lucide-react";
import { useState } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { fetchSiteVisitStats, formatViewCount } from "@/lib/site-visits";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/jardim", label: "Jogo Jardim da Esperança", icon: Sprout },
  { to: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/denuncias", label: "Denúncias", icon: ShieldAlert },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/conteudo", label: "Conteúdo", icon: FileText },
  { to: "/admin/logs", label: "Auditoria", icon: ScrollText },
  { to: "/admin/acessos", label: "Logs de IP", icon: Eye },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

const MOBILE_TABS = [
  { to: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { to: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/denuncias", label: "Denúncias", icon: ShieldAlert },
  { to: "/admin/conteudo", label: "Conteúdo", icon: FileText },
] as const;

export function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { loading, isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: visitStats, isLoading: visitsLoading } = useQuery({
    queryKey: ["admin", "site-visits"],
    queryFn: fetchSiteVisitStats,
    enabled: !loading && isAdmin,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to || path === `${to}/` : path.startsWith(to);

  const navLinkClass = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
      active
        ? "gradient-warm text-primary-foreground shadow-warm"
        : "bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="min-h-screen bg-background">
      <AdminTopBar />
      <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total de visitas
                </p>
                <p className="font-display text-2xl font-extrabold leading-tight text-foreground">
                  {visitsLoading ? "—" : formatViewCount(visitStats?.totalVisits ?? 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <Radio className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Online agora
                </p>
                <p className="font-display text-2xl font-extrabold leading-tight text-emerald-600">
                  {visitsLoading ? "—" : formatViewCount(visitStats?.activeNow ?? 0)}
                </p>
              </div>
            </div>
          </div>
          <p className="hidden max-w-md text-xs text-muted-foreground lg:block">
            Total acumulado (1 visita por sessão) e visitantes ativos nos últimos 15 minutos nas
            páginas públicas. Relatórios detalhados em{" "}
            <Link to="/admin/analytics" className="font-semibold text-primary hover:underline">
              Analytics
            </Link>
            {" · "}
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
      <div className="hidden border-b border-border/60 bg-card/50 lg:block">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Painel administrativo
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => {
              const exact = "exact" in rest && rest.exact;
              const active = isActive(to, exact);
              return (
                <Link key={to} to={to} className={navLinkClass(active)}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <main className={cn("mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10", "pb-24 lg:pb-10")}>
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {MOBILE_TABS.map(({ to, label, icon: Icon, ...rest }) => {
            const exact = "exact" in rest && rest.exact;
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
                  NAV.slice(4).some(({ to }) => isActive(to)) || path.startsWith("/admin/analytics")
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                Mais
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Administração</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid gap-2">
                {NAV.filter(({ to }) => !MOBILE_TABS.some((tab) => tab.to === to)).map(
                  ({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={navLinkClass(isActive(to, to === "/admin"))}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ),
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
