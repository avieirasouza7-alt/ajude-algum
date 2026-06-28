import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayProfile } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
      Google
    </span>
  );
}

type UserProfileBadgeProps = {
  user: User;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
};

export function UserProfileBadge({
  user,
  className,
  compact = false,
  iconOnly = false,
}: UserProfileBadgeProps) {
  const profile = getUserDisplayProfile(user);
  if (!profile) return null;

  const initials = profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (iconOnly) {
    return (
      <Link
        to="/painel"
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-card/80 shadow-sm transition hover:border-primary/30 hover:bg-card",
          className,
        )}
        title={profile.email ? `${profile.name} (${profile.email})` : profile.name}
        aria-label={profile.name}
      >
        <Avatar className="h-8 w-8 border border-border/60">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
      </Link>
    );
  }

  return (
    <Link
      to="/painel"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2 py-1.5 shadow-sm transition hover:border-primary/30 hover:bg-card",
        className,
      )}
      title={profile.email ? `${profile.name} (${profile.email})` : profile.name}
    >
      <Avatar className="h-8 w-8 border border-border/60">
        <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-sm font-semibold text-foreground">{profile.name}</span>
        {profile.isGoogle ? (
          <GoogleMark />
        ) : (
          !compact && (
            <span className="block truncate text-[10px] text-muted-foreground">Conectado</span>
          )
        )}
      </span>
    </Link>
  );
}
