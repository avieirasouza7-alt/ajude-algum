import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, CheckCircle2, HeartHandshake, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin } from "@/lib/api/admin.functions";
import { checkIsAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function setupSql(email: string) {
  return `INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = '${email}'
ON CONFLICT (user_id, role) DO NOTHING;`;
}

export function AdminAccessPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const email = user?.email ?? "seu@email.com";

  const goAdmin = () => {
    setDone(true);
    toast.success("Acesso ativado! Bem-vindo ao painel.");
    setTimeout(() => {
      window.location.href = "/admin";
    }, 800);
  };

  const activateAccess = async () => {
    setLoading(true);
    setNeedsSetup(false);

    const { ok: alreadyAdmin } = await checkIsAdmin();
    if (alreadyAdmin) {
      setLoading(false);
      goAdmin();
      return;
    }

    try {
      const server = await bootstrapFirstAdmin();
      if (server.ok) {
        setLoading(false);
        goAdmin();
        return;
      }

      if (server.reason === "admin_already_exists") {
        const again = await checkIsAdmin();
        if (again.ok) {
          setLoading(false);
          goAdmin();
          return;
        }
        setLoading(false);
        toast.error("Já existe um administrador. Peça acesso a quem gerencia o site.");
        return;
      }

      if (server.reason === "not_authenticated") {
        setLoading(false);
        toast.error("Sessão expirada. Entre novamente em /admin/entrar");
        return;
      }
    } catch {
      /* tenta RPC direto abaixo */
    }

    const { error } = await supabase.rpc("bootstrap_first_admin");
    setLoading(false);

    if (!error) {
      goAdmin();
      return;
    }

    if (error.message.includes("admin_already_exists")) {
      const again = await checkIsAdmin();
      if (again.ok) {
        goAdmin();
        return;
      }
      toast.error("Já existe um administrador. Peça acesso a quem gerencia o site.");
      return;
    }

    setNeedsSetup(true);
    toast.error("Falta uma configuração única no Supabase (veja abaixo).");
  };

  const copySql = async () => {
    await navigator.clipboard.writeText(setupSql(email));
    toast.success("SQL copiado! Cole no Supabase e clique em Run.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
            {done ? <CheckCircle2 className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            {done ? "Pronto!" : "Ativar painel admin"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {done ? "Abrindo o painel..." : "Último passo para liberar seu acesso."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          {!done && (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <p className="text-muted-foreground">Sua conta</p>
                <p className="mt-1 font-semibold">{email}</p>
              </div>

              {!needsSetup ? (
                <>
                  <p className="mt-5 text-center text-sm text-muted-foreground">
                    Clique abaixo para ativar o painel administrativo.
                  </p>
                  <Button
                    onClick={activateAccess}
                    disabled={loading}
                    className="mt-5 w-full gradient-warm text-primary-foreground shadow-warm"
                  >
                    {loading ? "Ativando..." : "Abrir painel admin"}
                  </Button>
                </>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    Configuração única no Supabase (2 minutos):
                  </p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>
                      Abra{" "}
                      <a
                        href="https://supabase.com/dashboard/project/xpxgxnbfrgplvpbukvcp/sql/new"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        SQL Editor no Supabase
                        <ExternalLink className="ml-0.5 inline h-3 w-3" />
                      </a>
                    </li>
                    <li>Clique em <strong>Copiar SQL</strong> abaixo</li>
                    <li>Cole no editor e clique em <strong>Run</strong></li>
                    <li>Volte aqui e clique em <strong>Tentar de novo</strong></li>
                  </ol>

                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-xs">
                    {setupSql(email)}
                  </pre>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" className="flex-1" onClick={copySql}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar SQL
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 gradient-warm text-primary-foreground"
                      onClick={activateAccess}
                      disabled={loading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tentar de novo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {done && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          )}

          <Button asChild variant="ghost" className="mt-4 w-full">
            <Link to="/painel">Voltar ao meu painel</Link>
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <HeartHandshake className="h-3.5 w-3.5 text-primary" />
          Ajude Alguém
        </p>
      </main>
      <Footer />
    </div>
  );
}
