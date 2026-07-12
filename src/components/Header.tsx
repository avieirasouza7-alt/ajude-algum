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

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={cn(
        "whitespace-nowrap text-sm font-medium transition hover:text-primary",
        path === to ? "text-primary" : "text-foreground/70",
      )}
    >
      {label}
    </Link>
  );

  const showCenterNav = authedUser ? "3xl:flex" : "xl:flex";
  const showMenuButton = authedUser ? "3xl:hidden" : "xl:hidden";
  const showCompactAuth = authedUser ? "flex 3xl:hidden" : "hidden";

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
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 font-display">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="hidden max-w-[7.5rem] truncate whitespace-nowrap font-extrabold tracking-tight sm:inline sm:max-w-[9rem] md:max-w-none md:text-sm lg:text-base">
              {SITE_NAME}
            </span>
          </Link>

          <nav
            className={cn(
              "hidden min-w-0 items-center justify-center gap-4 whitespace-nowrap",
              showCenterNav,
            )}
          >
            {navLink("/", "Início")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona")}
            {navLink("/denuncias", "Denúncias")}
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
                <div className={cn("items-center gap-1.5", showCompactAuth)}>
                  <UserProfileBadge user={authedUser} iconOnly />
                  {isAdmin && (
                    <Button asChild size="icon" variant="outline" className="h-9 w-9 shrink-0">
                      <Link to="/admin" aria-label="Admin">
                        <Shield className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="gradient-warm shrink-0 px-2.5 text-primary-foreground shadow-warm sm:px-3"
                  >
                    <Link to="/nova-campanha">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar</span>
                    </Link>
                  </Button>
                </div>

                <div className="hidden items-center gap-2 3xl:flex">
                  <UserProfileBadge user={authedUser} iconOnly />
                  {isAdmin && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin">
                        <Shield className="mr-1.5 h-4 w-4" /> Admin
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="gradient-warm text-primary-foreground shadow-warm"
                  >
                    <Link to="/nova-campanha">
                      <Plus className="mr-1.5 h-4 w-4" /> Criar campanha
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
