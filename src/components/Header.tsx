import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartHandshake, Plus, LogOut, LayoutDashboard, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CampaignAlertBanner } from "@/components/CampaignAlertBanner";
import { BrasiliaClock } from "@/components/BrasiliaClock";
import { ContribuirNavLink } from "@/components/DonationSection";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { BIBLIA_VIRTUAL_PATH, SHOW_BIBLIA_VIRTUAL, SHOW_JARDIM, JARDIM_PUBLIC_OPEN } from "@/lib/local-preview";
import { SITE_NAME } from "@/lib/site-meta";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, session, signOut, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const authedUser = user ?? session?.user ?? null;
  const showBiblia = SHOW_BIBLIA_VIRTUAL;
  const showJardim = SHOW_JARDIM;

  const navLink = (to: string, label: string, className?: string) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={cn(
        "shrink-0 whitespace-nowrap text-sm font-medium transition hover:text-primary",
        path === to ? "text-primary" : "text-foreground/70",
        className,
      )}
    >
      {label}
    </Link>
  );

  /**
   * No topo usamos rótulo curto ("Jogo") para não estourar o cabeçalho.
   * O nome completo fica no aria-label, no title e no menu mobile.
   */
  const jardimLink = (opts?: { full?: boolean; className?: string }) => (
    <Link
      to="/jardim"
      onClick={() => setOpen(false)}
      aria-label={
        JARDIM_PUBLIC_OPEN
          ? "Jogo Jardim da Esperança"
          : "Jogo Jardim da Esperança — fechado por enquanto"
      }
      title={
        JARDIM_PUBLIC_OPEN
          ? "Jogo Jardim da Esperança"
          : "Jogo Jardim da Esperança — fechado por enquanto"
      }
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition hover:text-primary",
        path === "/jardim" ? "text-primary" : "text-foreground/70",
        opts?.className,
      )}
    >
      <span className="whitespace-nowrap">{opts?.full ? "Jogo Jardim da Esperança" : "Jogo"}</span>
      {JARDIM_PUBLIC_OPEN ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      ) : (
        <span
          className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200"
          aria-hidden
        >
          Fechado
        </span>
      )}
    </Link>
  );

  /** Bíblia Virtual — página interna do site (/biblia-virtual). */
  const bibliaLink = (opts?: { full?: boolean; className?: string }) => (
    <Link
      to={BIBLIA_VIRTUAL_PATH}
      onClick={() => setOpen(false)}
      aria-label="Bíblia Virtual"
      title="Bíblia Virtual"
      className={cn(
        "shrink-0 whitespace-nowrap text-sm font-medium transition hover:text-primary",
        path === BIBLIA_VIRTUAL_PATH ? "text-primary" : "text-foreground/70",
        opts?.className,
      )}
    >
      {opts?.full ? "Bíblia Virtual" : "Bíblia"}
    </Link>
  );

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
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          {/* Esquerda: relógio antes do ícone + marca */}
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <BrasiliaClock compact className="hidden sm:block" />
            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 font-display">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <span className="hidden max-w-[7.25rem] truncate whitespace-nowrap text-sm font-extrabold tracking-tight sm:inline md:max-w-[9rem] lg:max-w-[10.5rem]">
                {SITE_NAME}
              </span>
            </Link>
          </div>

          {/* Centro: nunca deixa o menu invadir logo/perfil */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-x-3 overflow-hidden lg:flex xl:gap-x-4">
            {navLink("/", "Início")}
            {navLink("/campanhas", "Campanhas")}
            {navLink("/sobre", "Como funciona", "hidden xl:inline")}
            {showJardim ? jardimLink() : null}
            {showBiblia ? bibliaLink() : null}
            {navLink("/denuncias", "Denúncias", "hidden xl:inline")}
            {!authedUser && (
              <ContribuirNavLink className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary transition hover:border-primary/35 hover:bg-primary/10 xl:inline-flex" />
            )}
          </nav>

          {/* Direita: ações compactas — textos longos só no menu mobile */}
          <div className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            {loading && !authedUser ? (
              <div
                className="hidden h-9 w-24 animate-pulse rounded-lg bg-muted sm:block"
                aria-hidden
              />
            ) : authedUser ? (
              <>
                <div className="hidden items-center gap-1 lg:flex">
                  <UserProfileBadge user={authedUser} iconOnly />
                  <Button asChild variant="ghost" size="icon" title="Meu painel">
                    <Link to="/painel" aria-label="Meu painel">
                      <LayoutDashboard className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="ghost" size="icon" title="Painel admin">
                      <Link to="/admin" aria-label="Painel admin">
                        <Shield className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="gradient-warm shrink-0 px-2.5 text-primary-foreground shadow-warm"
                  >
                    <Link to="/nova-campanha">
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Criar</span>
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
                    title="Sair"
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
                    <Link to="/nova-campanha" aria-label="Criar campanha">
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
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4">
              <BrasiliaClock showLabel className="w-fit sm:hidden" />
              {navLink("/", "Início")}
              {navLink("/campanhas", "Campanhas")}
              {navLink("/sobre", "Como funciona")}
              {showJardim ? jardimLink({ full: true }) : null}
              {showBiblia ? bibliaLink({ full: true }) : null}
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
