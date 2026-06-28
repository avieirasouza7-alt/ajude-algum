import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resetAdminAnalyticsCache, syncAdminAnalyticsCache } from "@/lib/analytics-guard";
import { flushPendingTermsAcceptance, hasAcceptedTerms } from "@/lib/terms";
import { clearAuthRedirects } from "@/lib/auth-redirect";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  termsAccepted: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  termsAccepted: false,
  loading: true,
  signOut: async () => {},
});

async function loadIsAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function touchLastSeen(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.warn("last_seen_at:", error.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let syncVersion = 0;

    const syncUser = async (nextSession: Session | null) => {
      const version = ++syncVersion;
      if (!mounted) return;

      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;

      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        resetAdminAnalyticsCache();
        return;
      }

      // Mostra o usuário imediatamente; admin carrega em seguida.
      setUser(nextUser);

      try {
        const updated = await flushPendingTermsAcceptance(nextUser);
        if (!mounted || version !== syncVersion) return;

        const resolved = updated ?? nextUser;
        const admin = await loadIsAdmin(resolved.id);
        if (!mounted || version !== syncVersion) return;

        setUser(resolved);
        setIsAdmin(admin);
        syncAdminAnalyticsCache(resolved.id, admin);
        void touchLastSeen(resolved.id);
      } catch {
        if (!mounted || version !== syncVersion) return;

        const admin = await loadIsAdmin(nextUser.id);
        setUser(nextUser);
        setIsAdmin(admin);
        syncAdminAnalyticsCache(nextUser.id, admin);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void syncUser(nextSession);
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      await syncUser(data.session);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    clearAuthRedirects();
    resetAdminAnalyticsCache();
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        isAdmin,
        termsAccepted: hasAcceptedTerms(user),
        loading,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
