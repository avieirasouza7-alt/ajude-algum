import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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
    const syncUser = async (nextUser: User | null) => {
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        return;
      }
      try {
        const updated = await flushPendingTermsAcceptance(nextUser);
        const resolved = updated ?? nextUser;
        setUser(resolved);
        setIsAdmin(await loadIsAdmin(resolved.id));
        void touchLastSeen(resolved.id);
      } catch {
        setUser(nextUser);
        setIsAdmin(await loadIsAdmin(nextUser.id));
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void syncUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      try {
        setSession(data.session);
        await syncUser(data.session?.user ?? null);
      } finally {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearAuthRedirects();
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
