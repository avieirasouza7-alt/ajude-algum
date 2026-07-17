import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { acceptTermsOnUser, TERMS_VERSION } from "@/lib/terms";
import {
  consumePublicAuthRedirect,
  peekAdminRedirect,
  consumeAdminAuthRedirect,
} from "@/lib/auth-redirect";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { SITE_NAME } from "@/lib/site-meta";

export const Route = createFileRoute("/_authenticated/aceitar-termos")({
  head: () => ({
    meta: [{ title: `Aceitar Termos — ${SITE_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: AceitarTermos,
});

function AceitarTermos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return toast.error("Marque que leu e concorda com os Termos de Uso.");
    if (!user) return toast.error("Sessão expirada. Entre novamente.");
    setBusy(true);
    try {
      await acceptTermsOnUser(user);
      toast.success("Termos aceitos. Bem-vindo!");
      const dest = peekAdminRedirect()
        ? consumeAdminAuthRedirect("/admin")
        : consumePublicAuthRedirect("/painel");
      navigate({ to: dest });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível registrar o aceite.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-extrabold">Termos de Uso</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Para continuar usando o Ajude Alguém, leia e aceite os Termos de Uso (versão{" "}
            {TERMS_VERSION}).
          </p>

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground/90">
            <p className="font-semibold">Você declara estar ciente de que:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>é responsável por todo o conteúdo das suas campanhas;</li>
              <li>é responsável pela chave PIX informada e pelos valores recebidos;</li>
              <li>é responsável pela divulgação, anúncios e promessas feitas;</li>
              <li>o Ajude Alguém não recebe nem repassa doações — o PIX é direto.</li>
            </ul>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox
              checked={accepted}
              onCheckedChange={(value) => setAccepted(value === true)}
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
              </Link>{" "}
              do Ajude Alguém.
            </span>
          </label>

          <Button
            onClick={handleAccept}
            disabled={busy || !accepted}
            className="mt-6 w-full gradient-warm text-primary-foreground"
          >
            {busy ? "Salvando..." : "Aceitar e continuar"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
