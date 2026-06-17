import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  acceptTermsOnUser,
  hasAcceptedTerms,
  markTermsPendingAcceptance,
  TERMS_VERSION,
} from "@/lib/terms";
import {
  consumePublicAuthRedirect,
  normalizePublicRedirect,
  saveAuthRedirect,
} from "@/lib/auth-redirect";
import { toast } from "sonner";
import { HeartHandshake } from "lucide-react";
import { z } from "zod";
import { formatAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: normalizePublicRedirect(search.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar — Ajude Alguém" },
      {
        name: "description",
        content: "Acesse sua conta para criar e gerenciar campanhas solidárias.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [finishingLogin, setFinishingLogin] = useState(false);

  useEffect(() => {
    if (redirect) saveAuthRedirect(redirect);
  }, [redirect]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("code");

    const authError =
      params.get("error_description") ??
      params.get("error") ??
      hash.get("error_description") ??
      hash.get("error");

    if (authError) {
      toast.error(decodeURIComponent(authError.replace(/\+/g, " ")));
      window.history.replaceState({}, "", "/auth");
      return;
    }

    if (!code) return;

    setFinishingLogin(true);
    void (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        toast.error("Não foi possível concluir o login com Google.");
        setFinishingLogin(false);
        return;
      }
      window.history.replaceState({}, "", "/auth");
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await flushPendingTermsFromOAuth(data.session.user);
      }
      setFinishingLogin(false);
    })();
  }, []);

  async function flushPendingTermsFromOAuth(user: import("@supabase/supabase-js").User) {
    try {
      await acceptTermsOnUser(user);
    } catch {
      /* terms may already be accepted */
    }
  }

  const afterLoginPath = (resolvedUser?: import("@supabase/supabase-js").User | null) => {
    const u = resolvedUser ?? user;
    return !hasAcceptedTerms(u) ? "/aceitar-termos" : consumePublicAuthRedirect(redirect ?? "/painel");
  };

  useEffect(() => {
    if (finishingLogin || loading || busy) return;
    if (user) navigate({ to: afterLoginPath(user) });
  }, [user, loading, navigate, redirect, finishingLogin, busy]);

  const requireTerms = () => {
    if (acceptedTerms) return true;
    toast.error("Leia e aceite os Termos de Uso para continuar.");
    return false;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!requireTerms()) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setBusy(false);
      return toast.error(formatAuthError(error));
    }
    try {
      const updated = await acceptTermsOnUser(data.user);
      toast.success("Bem-vindo de volta!");
      navigate({ to: afterLoginPath(updated) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar aceite dos termos.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!requireTerms()) return;
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: parsed.data.full_name,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(formatAuthError(error));
    if (data.session) {
      toast.success("Conta criada! Bem-vindo!");
      navigate({ to: afterLoginPath(data.user) });
      return;
    }
    toast.success("Conta criada! Abra o link que enviamos no seu e-mail e depois faça login aqui.", {
      duration: 8000,
    });
  };

  const handleGoogle = async () => {
    if (!requireTerms()) return;
    markTermsPendingAcceptance();
    saveAuthRedirect(redirect ?? "/painel");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error("Falha ao entrar com Google");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
        {finishingLogin ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="mt-4 font-medium">Concluindo login...</p>
            <p className="mt-1 text-sm text-muted-foreground">Aguarde um instante.</p>
          </div>
        ) : (
          <>
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Bem-vindo ao Ajude Alguém</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre ou crie sua conta gratuita.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(value) => setAcceptedTerms(value === true)}
              className="mt-0.5"
            />
            <span>
              Li e concordo com os{" "}
              <Link
                to="/termos-de-uso"
                target="_blank"
                className="font-semibold text-primary hover:underline"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                to="/politica-de-privacidade"
                target="_blank"
                className="font-semibold text-primary hover:underline"
              >
                Política de Privacidade
              </Link>
              , incluindo minha responsabilidade pelas campanhas, chave PIX, conteúdo e divulgação.
            </span>
          </label>

          <Button onClick={handleGoogle} disabled={busy} variant="outline" className="mt-4 w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
            Continuar com Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <Label htmlFor="li-email">E-mail</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="li-pass">Senha</Label>
                  <Input
                    id="li-pass"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full gradient-warm text-primary-foreground"
                >
                  Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pass">Senha</Label>
                  <Input
                    id="su-pass"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full gradient-warm text-primary-foreground"
                >
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ao entrar ou cadastrar, você confirma que leu os{" "}
            <Link to="/termos-de-uso" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to="/politica-de-privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
