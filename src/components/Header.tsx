import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartHandshake, Plus, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CampaignAlertBanner } from "@/components/CampaignAlertBanner";
import { ContribuirNavLink } from "@/components/DonationSection";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { SITE_NAME } from "@/lib/site-meta";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

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

  const showCenterNav = user ? "2xl:flex" : "lg:flex";
  const showMenuButton = user ? "2xl:hidden" : "lg:hidden";

  const accountMenu = user ? (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <UserProfileBadge user={user} className="w-full rounded-2xl px-3 py-2" />
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
            <span className="hidden max-w-[9rem] truncate whitespace-nowrap font-extrabold tracking-tight sm:inline sm:max-w-none sm:text-sm lg:text-base">
              {SITE_NAME}
            </span>
          </Link>

          <nav
            className={cn(
              "hidden min-w-0 items-center justify-center gap-3 overflow-hidden whitespace-nowrap lg:gap-4",
              showCenterNav,
            )}
          >
            {navLink("/", "Início")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona")}
            {navLink("/denuncias", "Denúncias")}
            {!user && <ContribuirNavLink />}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            {!loading && user ? (
              <>
                <Button asChild size="sm" variant="secondary" className={cn("shrink-0 px-2", showMenuButton)}>
                  <Link to="/painel">
                    <LayoutDashboard className="mr-1 h-4 w-4" />
                    Painel
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild size="sm" variant="outline" className={cn("shrink-0 px-2", showMenuButton)}>
                    <Link to="/admin">
                      <Shield className="mr-1 h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}

                <div className={cn("hidden items-center gap-1.5", user ? "2xl:flex" : "lg:flex")}>
                  <UserProfileBadge user={user} compact className="max-w-[180px]" />
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/painel">
                      <LayoutDashboard className="mr-1.5 h-4 w-4" /> Meu painel
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="ghost" size="sm">
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
              <div className={cn("hidden items-center gap-1.5 sm:flex")}>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild size="sm" className="gradient-warm text-primary-foreground shadow-warm">
                  <Link to="/auth">Criar campanha</Link>
                </Button>
              </div>
            ) : null}

            {!loading && !user && (
              <Button asChild size="sm" variant="ghost" className="sm:hidden">
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
