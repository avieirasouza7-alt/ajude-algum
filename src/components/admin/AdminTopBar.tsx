import { Link, useNavigate } from "@tanstack/react-router";
import { HeartHandshake, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { useAuth } from "@/hooks/use-auth";
import { SITE_NAME } from "@/lib/site-meta";

export function AdminTopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/admin" className="flex min-w-0 items-center gap-2 font-display">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-warm text-primary-foreground shadow-warm">
            <HeartHandshake className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-extrabold tracking-tight sm:text-base">
            {SITE_NAME}
          </span>
          <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
            Admin
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="hidden px-2 sm:inline-flex">
            <Link to="/">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Ver site
            </Link>
          </Button>
          {user && <UserProfileBadge user={user} compact iconOnly className="sm:hidden" />}
          {user && (
            <UserProfileBadge user={user} compact className="hidden max-w-[160px] sm:flex" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={async () => {
              await signOut();
              navigate({ to: "/admin/entrar" });
            }}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
