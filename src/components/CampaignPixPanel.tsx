import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildDonationPixPayload, normalizePixKey } from "@/lib/pix-donation";
import { trackPixCopy } from "@/lib/site-analytics";

type CampaignPixPanelProps = {
  pixKey: string;
  campaignSlug: string;
};

export function CampaignPixPanel({ pixKey, campaignSlug }: CampaignPixPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const normalizedPixKey = normalizePixKey(pixKey);

  useEffect(() => {
    let cancelled = false;
    const payload = buildDonationPixPayload(pixKey);
    QRCode.toDataURL(payload, {
      width: 200,
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
  }, [pixKey]);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(normalizedPixKey);
      trackPixCopy(campaignSlug);
      setCopied(true);
      toast.success("Chave PIX copiada!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione a chave e copie manualmente.");
    }
  };

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
        QR Code PIX
      </p>

      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="shrink-0 rounded-xl border border-border/80 bg-white p-2.5 shadow-sm">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code PIX para ${pixKey}`}
              width={160}
              height={160}
              className="h-36 w-36 sm:h-40 sm:w-40"
            />
          ) : (
            <div
              className="grid h-36 w-36 place-items-center rounded-lg bg-muted/40 sm:h-40 sm:w-40"
              aria-hidden
            >
              <QrCode className="h-8 w-8 animate-pulse text-muted-foreground/50" />
            </div>
          )}
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Escaneie no app do banco
          </p>
        </div>

        <div className="w-full text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chave PIX
          </p>
          <p className="mt-1.5 break-all font-mono text-sm leading-snug">{normalizedPixKey}</p>
          <Button onClick={copyPix} className="mt-3 w-full gradient-warm text-primary-foreground">
            {copied ? (
              <>
                <Check className="mr-1.5 h-4 w-4" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" /> Copiar chave PIX
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
