import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartHandshake, Plus, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CampaignAlertBanner } from "@/components/CampaignAlertBanner";
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
      className={`text-sm font-medium transition hover:text-primary ${path === to ? "text-primary" : "text-foreground/70"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <CampaignAlertBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold tracking-tight sm:text-lg">{SITE_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLink("/", "Início")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona")}
            {navLink("/denuncias", "Denúncias")}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <UserProfileBadge user={user} className="mr-1 max-w-[220px]" />
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
            className="grid h-10 w-10 place-items-center rounded-lg md:hidden"
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
