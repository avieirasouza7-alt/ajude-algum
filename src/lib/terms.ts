import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const TERMS_VERSION = "2026-07-23";
const PENDING_TERMS_KEY = "ajude_alguem_terms_pending";

type PendingTerms = {
  version: string;
  acceptedAt: string;
};

export function hasAcceptedTerms(user: User | null | undefined) {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  return meta.terms_version === TERMS_VERSION && !!meta.terms_accepted_at;
}

export function markTermsPendingAcceptance() {
  if (typeof window === "undefined") return;
  const payload: PendingTerms = {
    version: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(PENDING_TERMS_KEY, JSON.stringify(payload));
}

export async function acceptTermsOnUser(user?: User | null) {
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      terms_version: TERMS_VERSION,
      terms_accepted_at: acceptedAt,
    },
  });
  if (error) throw error;
  if (typeof window !== "undefined") sessionStorage.removeItem(PENDING_TERMS_KEY);
  return data.user;
}

export async function flushPendingTermsAcceptance(user: User | null | undefined) {
  if (!user || typeof window === "undefined") return user;
  if (hasAcceptedTerms(user)) {
    sessionStorage.removeItem(PENDING_TERMS_KEY);
    return user;
  }

  const raw = sessionStorage.getItem(PENDING_TERMS_KEY);
  if (!raw) return user;

  try {
    const pending = JSON.parse(raw) as PendingTerms;
    if (pending.version !== TERMS_VERSION) return user;
    return await acceptTermsOnUser(user);
  } catch {
    sessionStorage.removeItem(PENDING_TERMS_KEY);
    return user;
  }
}
