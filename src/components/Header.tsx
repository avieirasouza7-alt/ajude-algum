import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartHandshake, Plus, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CampaignAlertBanner } from "@/components/CampaignAlertBanner";
import { BrasiliaClock } from "@/components/BrasiliaClock";
import { ContribuirNavLink } from "@/components/DonationSection";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { SITE_NAME } from "@/lib/site-meta";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, session, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const authedUser = user ?? session?.user ?? null;

  const navLink = (to: string, label: string, className?: string) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={cn(
        "whitespace-nowrap text-sm font-medium transition hover:text-primary",
        path === to ? "text-primary" : "text-foreground/70",
        className,
      )}
    >
      {label}
    </Link>
  );

  /* Nome completo e explícito: é um jogo. */
  const jardimLink = (className?: string) => (
    <Link
      to="/jardim"
      onClick={() => setOpen(false)}
      aria-label="Jogo Jardim da Esperança"
      className={cn(
        "relative inline-flex max-w-full items-center gap-1.5 text-sm font-medium transition hover:text-primary",
        path === "/jardim" ? "text-primary" : "text-foreground/70",
        className,
      )}
    >
      <span className="truncate">Jogo Jardim da Esperança</span>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
    </Link>
  );

  const showCenterNav = "lg:flex";
  const showMenuButton = "lg:hidden";

  const accountMenu = authedUser ? (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <UserProfileBadge user={authedUser} className="w-full rounded-2xl px-3 py-2" />
      <Button asChild variant="ghost" className="justify-start">
        <Link onClick={() => setOpen(false)} to="/painel">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Meu painel
        </Link>
      </Button>
      {isAdmin && (
        <Button asChild variant="ghost" className="justify-start">
          <Link onClick={() => setOpen(false)} to="/admin">
            <Shield className="mr-2 h-4 w-4" />
            Painel admin
          </Link>
        </Button>
      )}
      <Button asChild className="gradient-warm text-primary-foreground">
        <Link onClick={() => setOpen(false)} to="/nova-campanha">
          <Plus className="mr-2 h-4 w-4" />
          Criar campanha
        </Link>
      </Button>
      <Button
        variant="ghost"
        className="justify-start"
        onClick={async () => {
          await signOut();
          setOpen(false);
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Button asChild variant="ghost" className="justify-start">
        <Link onClick={() => setOpen(false)} to="/auth">
          Entrar
        </Link>
      </Button>
      <Button asChild className="gradient-warm text-primary-foreground">
        <Link onClick={() => setOpen(false)} to="/auth">
          Criar campanha
        </Link>
      </Button>
    </div>
  );

  return (
    <>
      <CampaignAlertBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {/* Relógio antes do ícone, como o usuário pediu. Logado, só em telas
                bem largas — em telas menores ele vive no menu para não roubar
                espaço dos links do meio. */}
            <BrasiliaClock
              compact={Boolean(authedUser)}
              className={cn(authedUser && "hidden 2xl:block")}
            />

            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 font-display">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <span className="hidden max-w-[7.5rem] truncate whitespace-nowrap font-extrabold tracking-tight sm:inline sm:max-w-[9rem] md:max-w-none md:text-sm lg:text-base">
                {SITE_NAME}
              </span>
            </Link>
          </div>

          <nav
            className={cn(
              "hidden min-w-0 items-center justify-center gap-3 whitespace-nowrap xl:gap-4",
              showCenterNav,
            )}
          >
            {navLink("/", "Início", "hidden xl:inline")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona")}
            {jardimLink()}
            {navLink("/denuncias", "Denúncias", "hidden xl:inline")}
            {!authedUser && <ContribuirNavLink />}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            {loading && !authedUser ? (
              <div
                className="hidden h-9 w-28 animate-pulse rounded-lg bg-muted sm:block"
                aria-hidden
              />
            ) : authedUser ? (
              <>
                <div className="hidden items-center gap-1.5 lg:flex">
                  <UserProfileBadge
                    user={authedUser}
                    compact
                    className="max-w-[130px] 2xl:max-w-[160px]"
                  />
                  <Button asChild variant="ghost" size="sm" className="px-2">
                    <Link to="/painel" aria-label="Meu painel">
                      <LayoutDashboard className="h-4 w-4 2xl:mr-1.5" />
                      <span className="hidden 2xl:inline">Meu painel</span>
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="ghost" size="sm" className="px-2">
                      <Link to="/admin" aria-label="Painel admin">
                        <Shield className="h-4 w-4 2xl:mr-1.5" />
                        <span className="hidden 2xl:inline">Admin</span>
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="gradient-warm shrink-0 text-primary-foreground shadow-warm"
                  >
                    <Link to="/nova-campanha">
                      <Plus className="mr-1.5 h-4 w-4" />
                      <span className="hidden 2xl:inline">Criar campanha</span>
                      <span className="2xl:hidden">Criar</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 lg:hidden">
                  <UserProfileBadge user={authedUser} iconOnly />
                  <Button
                    asChild
                    size="sm"
                    className="gradient-warm shrink-0 px-2.5 text-primary-foreground shadow-warm"
                  >
                    <Link to="/nova-campanha">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar</span>
                    </Link>
                  </Button>
                </div>
              </>
            ) : !loading ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="gradient-warm text-primary-foreground shadow-warm"
                >
                  <Link to="/auth">Criar campanha</Link>
                </Button>
              </div>
            ) : null}

            {!authedUser && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className={cn("sm:hidden", loading && "opacity-70")}
              >
                <Link to="/auth">Entrar</Link>
              </Button>
            )}

            <button
              type="button"
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                showMenuButton,
              )}
              onClick={() => setOpen(!open)}
              aria-label="Menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className={cn("border-t border-border bg-background", showMenuButton)}>
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
              <BrasiliaClock showLabel className="w-fit" />
              {navLink("/", "Início")}
              {navLink("/campanhas", "Campanhas")}
              {navLink("/sobre", "Como funciona")}
              {jardimLink()}
              {navLink("/denuncias", "Denúncias")}
              <ContribuirNavLink
                onClick={() => setOpen(false)}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
              />
              {accountMenu}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
