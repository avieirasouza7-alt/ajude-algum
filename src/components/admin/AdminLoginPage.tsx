import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, LayoutDashboard } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { acceptTermsOnUser, markTermsPendingAcceptance, TERMS_VERSION, hasAcceptedTerms } from "@/lib/terms";
import { saveAdminRedirect, consumeAdminAuthRedirect } from "@/lib/auth-redirect";
import { formatAuthError } from "@/lib/auth-errors";
import { completeOAuthCallback } from "@/lib/oauth-callback";
import { toast } from "sonner";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

const ADMIN_CALLBACK = "/admin/entrar";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [finishingLogin, setFinishingLogin] = useState(false);

  useEffect(() => {
    saveAdminRedirect("/admin");
  }, []);

  useEffect(() => {
    const hadCode = new URLSearchParams(window.location.search).has("code");
    if (hadCode) setFinishingLogin(true);

    void (async () => {
      const result = await completeOAuthCallback({
        cleanPath: ADMIN_CALLBACK,
        onAuthenticated: async (authUser) => {
          try {
            await acceptTermsOnUser(authUser);
          } catch {
            /* ok */
          }
        },
      });

      if (result.status === "error" && result.message) {
        toast.error(result.message);
      }
      if (result.status !== "idle" || hadCode) {
        setFinishingLogin(false);
      }
    })();
  }, []);

  const afterLoginPath = (resolvedUser?: import("@supabase/supabase-js").User | null) => {
    const u = resolvedUser ?? user;
    return !hasAcceptedTerms(u) ? "/aceitar-termos" : consumeAdminAuthRedirect("/admin");
  };

  useEffect(() => {
    if (finishingLogin || loading || busy) return;
    if (user) navigate({ to: afterLoginPath(user) });
  }, [user, loading, navigate, finishingLogin, busy]);

  const requireTerms = () => {
    if (acceptedTerms) return true;
    toast.error("Aceite os Termos de Uso para continuar.");
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
      toast.success("Bem-vindo ao painel admin!");
      navigate({ to: afterLoginPath(updated) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar aceite.");
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
        emailRedirectTo: `${window.location.origin}${ADMIN_CALLBACK}`,
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
      toast.success("Conta criada! Abrindo painel...");
      navigate({ to: "/admin" });
      return;
    }
    toast.success("Conta criada! Abra o link no seu e-mail e depois faça login aqui.", {
      duration: 8000,
    });
  };

  const handleGoogle = async () => {
    if (!requireTerms()) return;
    markTermsPendingAcceptance();
    saveAdminRedirect("/admin");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${ADMIN_CALLBACK}`,
      },
    });
    if (error) {
      setBusy(false);
      toast.error("Falha ao entrar com Google");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
        {finishingLogin ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="mt-4 font-medium">Entrando no painel admin...</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
                <Shield className="h-6 w-6" />
              </div>
              <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Área administrativa
              </span>
              <h1 className="mt-3 font-display text-2xl font-extrabold">Painel Administrativo</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre para gerenciar campanhas, usuários e denúncias.
              </p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
                <span>Esta não é a área de doadores — só para quem administra o site.</span>
              </div>

              <p className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary">
                Não precisa do Google — use <strong>e-mail e senha</strong> abaixo.
              </p>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(value) => setAcceptedTerms(value === true)}
                  className="mt-0.5"
                />
                <span>
                  Li e concordo com os{" "}
                  <Link to="/termos-de-uso" target="_blank" className="font-semibold text-primary hover:underline">
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
                  .
                </span>
              </label>

              <Tabs defaultValue="signup" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  <TabsTrigger value="login">Já tenho conta</TabsTrigger>
                </TabsList>
                <TabsContent value="login" className="mt-4">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <Label htmlFor="adm-email">E-mail</Label>
                      <Input id="adm-email" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div>
                      <Label htmlFor="adm-pass">Senha</Label>
                      <Input
                        id="adm-pass"
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full gradient-warm text-primary-foreground shadow-warm"
                    >
                      Entrar no painel
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-4">
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div>
                      <Label htmlFor="adm-name">Nome completo</Label>
                      <Input id="adm-name" name="full_name" required />
                    </div>
                    <div>
                      <Label htmlFor="adm-su-email">E-mail</Label>
                      <Input id="adm-su-email" name="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="adm-su-pass">Senha (mín. 8 caracteres)</Label>
                      <Input id="adm-su-pass" name="password" type="password" required minLength={8} />
                    </div>
                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full gradient-warm text-primary-foreground shadow-warm"
                    >
                      Criar conta e entrar
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">opcional</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full">
                Ou entrar com Google
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">
                ← Voltar ao site
              </Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
