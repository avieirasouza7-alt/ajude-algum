import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Heart,
  Mail,
  QrCode,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SITE_DONATION_PIX_KEY,
  SITE_DONATION_SECTION_ID,
  SITE_DONATION_TITLE,
  buildDonationPixPayload,
} from "@/lib/pix-donation";
import { SITE_NAME } from "@/lib/site-meta";

const highlights = [
  { icon: Server, text: "Hospedagem e domínio" },
  { icon: Wrench, text: "Manutenção contínua" },
  { icon: Sparkles, text: "Melhorias no projeto" },
];

export function DonationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pixPanelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [highlightPix, setHighlightPix] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const payload = buildDonationPixPayload();
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: "#064e3b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(SITE_DONATION_PIX_KEY);
      setCopied(true);
      toast.success("Chave Pix copiada!");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  }

  function focusPixPanel() {
    pixPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightPix(true);
    window.setTimeout(() => setHighlightPix(false), 2200);
  }

  return (
    <section
      ref={sectionRef}
      id={SITE_DONATION_SECTION_ID}
      aria-labelledby="donation-heading"
      className={`mt-20 scroll-mt-24 transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-soft sm:p-10 lg:p-12">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              Contribuição voluntária
            </div>

            <h2
              id="donation-heading"
              className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {SITE_DONATION_TITLE}
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                O {SITE_NAME} é um projeto gratuito que conecta pessoas que precisam de ajuda com
                pessoas dispostas a ajudar. Para manter o site funcionando, temos custos com
                domínio, hospedagem, desenvolvimento, manutenção e melhorias constantes.
              </p>
              <p>
                Se você acredita nesta iniciativa, considere fazer uma contribuição de qualquer
                valor. Sua doação ajuda a manter este projeto ativo e a alcançar ainda mais
                pessoas.
              </p>
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {highlights.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={focusPixPanel}
                className="gradient-warm text-primary-foreground shadow-warm transition-transform hover:scale-[1.02]"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Doar via Pix
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={copyPixKey}
                className="border-primary/25 bg-background/80 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-success" />
                    Chave copiada
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar chave Pix
                  </>
                )}
              </Button>
            </div>
          </div>

          <div
            ref={pixPanelRef}
            className={`rounded-2xl border bg-background/90 p-5 shadow-soft backdrop-blur-sm transition-all duration-500 sm:p-6 ${
              highlightPix
                ? "scale-[1.01] border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                : "border-border/80 hover:border-primary/25 hover:shadow-warm"
            }`}
          >
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="rounded-2xl border border-border/80 bg-white p-3 shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code Pix para ${SITE_DONATION_PIX_KEY}`}
                    width={240}
                    height={240}
                    className="h-[200px] w-[200px] sm:h-[220px] sm:w-[220px]"
                  />
                ) : (
                  <div
                    className="grid h-[200px] w-[200px] place-items-center rounded-xl bg-muted/40 sm:h-[220px] sm:w-[220px]"
                    aria-hidden
                  >
                    <QrCode className="h-10 w-10 animate-pulse text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">Escaneie no app do seu banco</p>

              <div className="mt-5 w-full">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Chave Pix (E-mail)
                </p>
                <a
                  href={`mailto:${SITE_DONATION_PIX_KEY}?subject=${encodeURIComponent("Doação — Ajude Alguém Online")}`}
                  className="group mt-2 flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">
                    {SITE_DONATION_PIX_KEY}
                  </span>
                </a>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Abra o Pix no seu banco, escaneie o QR Code ou cole a chave acima. Você escolhe o
                valor da contribuição.
              </p>

              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                onClick={copyPixKey}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar chave Pix
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <blockquote className="relative mt-8 flex gap-3 rounded-2xl border border-border/60 bg-muted/25 px-4 py-4 text-sm leading-relaxed text-muted-foreground sm:px-5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            As doações são totalmente voluntárias e contribuem para os custos de hospedagem,
            domínio, infraestrutura, desenvolvimento e manutenção do {SITE_NAME}.
          </p>
        </blockquote>
      </div>
    </section>
  );
}

export function ContribuirNavLink({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={`/#${SITE_DONATION_SECTION_ID}`}
      onClick={onClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary/35 hover:bg-primary/10"
      }
    >
      <Heart className="h-3.5 w-3.5" aria-hidden />
      Contribuir
    </a>
  );
}
