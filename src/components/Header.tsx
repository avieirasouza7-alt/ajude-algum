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
  const { user, signOut, isAdmin } = useAuth();
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

  const navLinks = (
    <>
      {navLink("/", "Início")}
      {navLink("/campanhas", "Campanhas")}
      {navLink("/sobre", "Como funciona")}
      {navLink("/denuncias", "Denúncias")}
      <ContribuirNavLink />
    </>
  );

  const userActions = user ? (
    <>
      <UserProfileBadge
        user={user}
        compact
        iconOnly
        className="shrink-0 xl:hidden"
      />
      <UserProfileBadge
        user={user}
        compact
        className="hidden max-w-[180px] shrink-0 xl:flex 2xl:max-w-[220px]"
      />
      <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 xl:px-3">
        <Link to="/painel" aria-label="Meu painel">
          <LayoutDashboard className="h-4 w-4 xl:mr-1.5" />
          <span className="hidden xl:inline">Meu painel</span>
        </Link>
      </Button>
      {isAdmin && (
        <Button asChild variant="ghost" size="sm" className="shrink-0 px-2 xl:px-3">
          <Link to="/admin" aria-label="Admin">
            <Shield className="h-4 w-4 xl:mr-1.5" />
            <span className="hidden xl:inline">Admin</span>
          </Link>
        </Button>
      )}
      <Button
        asChild
        size="sm"
        className="gradient-warm shrink-0 px-2 text-primary-foreground shadow-warm xl:px-3"
      >
        <Link to="/nova-campanha">
          <Plus className="h-4 w-4 xl:mr-1.5" />
          <span className="hidden xl:inline">Criar campanha</span>
          <span className="xl:hidden">Criar</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
        aria-label="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  ) : (
    <>
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link to="/auth">Entrar</Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="gradient-warm shrink-0 text-primary-foreground shadow-warm"
      >
        <Link to="/auth">Criar campanha</Link>
      </Button>
    </>
  );

  return (
    <>
      <CampaignAlertBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-display">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="hidden whitespace-nowrap text-sm font-extrabold tracking-tight sm:inline sm:text-base lg:text-lg">
              {SITE_NAME}
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 whitespace-nowrap xl:flex xl:gap-5">
            {navLinks}
          </nav>

          <div
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2",
              user ? "flex" : "hidden md:flex",
            )}
          >
            {userActions}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg xl:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-background xl:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
              {navLink("/", "Início")}
              {navLink("/campanhas", "Campanhas")}
              {navLink("/sobre", "Como funciona")}
              {navLink("/denuncias", "Denúncias")}
              <ContribuirNavLink
                onClick={() => setOpen(false)}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
              />
              {!user && (
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
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
