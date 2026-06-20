import type { User } from "@supabase/supabase-js";

export type UserDisplayProfile = {
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: string | null;
  isGoogle: boolean;
};

function getAuthProvider(user: User): string | null {
  const fromApp = user.app_metadata?.provider;
  if (typeof fromApp === "string" && fromApp) return fromApp;

  const identity =
    user.identities?.find((item) => item.provider === "google") ?? user.identities?.[0];
  return identity?.provider ?? null;
}

export function getUserDisplayProfile(user: User | null | undefined): UserDisplayProfile | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    user.email?.split("@")[0] ||
    "Usuário";

  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const provider = getAuthProvider(user);

  return {
    name,
    email: user.email ?? "",
    avatarUrl,
    provider,
    isGoogle: provider === "google",
  };
}
