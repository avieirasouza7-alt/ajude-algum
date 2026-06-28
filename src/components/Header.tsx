import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartHandshake, Plus, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CampaignAlertBanner } from "@/components/CampaignAlertBanner";
import { ContribuirNavLink } from "@/components/DonationSection";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { SITE_NAME } from "@/lib/site-meta";

export function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={`whitespace-nowrap text-sm font-medium transition hover:text-primary ${path === to ? "text-primary" : "text-foreground/70"}`}
    >
      {label}
    </Link>
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
            <span className="whitespace-nowrap text-sm font-extrabold tracking-tight sm:text-base xl:text-lg">
              <span className="2xl:hidden">Ajude Alguém</span>
              <span className="hidden 2xl:inline">{SITE_NAME}</span>
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 whitespace-nowrap md:flex lg:gap-4 xl:gap-5">
            {navLink("/", "Início")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona")}
            {navLink("/denuncias", "Denúncias")}
            <ContribuirNavLink />
          </nav>

          <div className="hidden shrink-0 items-center gap-1.5 md:flex lg:gap-2">
            {user ? (
              <>
                <UserProfileBadge user={user} compact className="mr-1 hidden max-w-[180px] lg:flex 2xl:max-w-[220px]" />
                <UserProfileBadge user={user} compact iconOnly className="mr-1 lg:hidden" />
                <Button asChild variant="ghost" size="sm" className="px-2 xl:px-3">
                  <Link to="/painel" aria-label="Meu painel">
                    <LayoutDashboard className="h-4 w-4 xl:mr-1.5" />
                    <span className="hidden xl:inline">Meu painel</span>
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="ghost" size="sm" className="px-2 xl:px-3">
                    <Link to="/admin" aria-label="Admin">
                      <Shield className="h-4 w-4 xl:mr-1.5" />
                      <span className="hidden xl:inline">Admin</span>
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  className="gradient-warm px-2 text-primary-foreground shadow-warm xl:px-3"
                >
                  <Link to="/nova-campanha">
                    <Plus className="h-4 w-4 xl:mr-1.5" />
                    <span className="xl:hidden">Criar</span>
                    <span className="hidden xl:inline">Criar campanha</span>
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <button
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-lg md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
              {navLink("/", "Início")}
              {navLink("/campanhas", "Campanhas")}
              {navLink("/sobre", "Como funciona")}
              {navLink("/denuncias", "Denúncias")}
              <ContribuirNavLink onClick={() => setOpen(false)} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary" />
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {user ? (
                  <>
                    <UserProfileBadge user={user} className="w-full rounded-2xl px-3 py-2" />
                    <Button asChild variant="ghost" className="justify-start">
                      <Link onClick={() => setOpen(false)} to="/painel">
                        Meu painel
                      </Link>
                    </Button>
                    {isAdmin && (
                      <Button asChild variant="ghost" className="justify-start">
                        <Link onClick={() => setOpen(false)} to="/admin">
                          Admin
                        </Link>
                      </Button>
                    )}
                    <Button asChild className="gradient-warm text-primary-foreground">
                      <Link onClick={() => setOpen(false)} to="/nova-campanha">
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
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
