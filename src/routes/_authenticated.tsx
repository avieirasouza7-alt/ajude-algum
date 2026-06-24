import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  saveAuthRedirect,
  consumePublicAuthRedirect,
  peekAdminRedirect,
  consumeAdminAuthRedirect,
} from "@/lib/auth-redirect";
import { flushPendingTermsAcceptance, hasAcceptedTerms } from "@/lib/terms";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthLoading,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      saveAuthRedirect(location.pathname);
      if (location.pathname.startsWith("/admin")) {
        throw redirect({ to: "/admin/entrar" });
      }
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }

    let user = data.user;
    try {
      user = (await flushPendingTermsAcceptance(data.user)) ?? data.user;
    } catch {
      /* segue com o usuário atual se o aceite dos termos falhar */
    }

    const onAcceptPage = location.pathname === "/aceitar-termos";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    const blocked = !profileError && profile?.account_status && profile.account_status !== "active";
    if (blocked && !location.pathname.startsWith("/auth")) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    if (!hasAcceptedTerms(user) && !onAcceptPage) {
      throw redirect({ to: "/aceitar-termos" });
    }
    if (hasAcceptedTerms(user) && onAcceptPage) {
      const dest = peekAdminRedirect()
        ? consumeAdminAuthRedirect("/admin")
        : consumePublicAuthRedirect("/painel");
      throw redirect({ to: dest });
    }

    return { user };
  },
  component: () => <Outlet />,
});
