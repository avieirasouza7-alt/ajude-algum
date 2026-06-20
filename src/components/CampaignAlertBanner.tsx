import { Link } from "@tanstack/react-router";
import { Megaphone, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useCampaignAlert } from "@/hooks/use-campaign-alert";
import {
  dismissCampaignAlert,
  isCampaignAlertDismissed,
} from "@/lib/campaign-alert";

export function CampaignAlertBanner() {
  const { visible, slug, title, message } = useCampaignAlert();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(slug ? isCampaignAlertDismissed(slug) : false);
  }, [slug]);

  if (!visible || dismissed || !slug) return null;

  const text =
    message ||
    `Campanha em destaque: ${title} — sua ajuda faz a diferença!`;

  return (
    <div
      role="alert"
      className="relative border-b border-primary/30 bg-gradient-to-r from-primary via-primary to-emerald-600 text-primary-foreground"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Megaphone className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug sm:text-left">
          {text}
        </p>
        <Link
          to="/campanha/$slug"
          params={{ slug }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-white/25 sm:text-sm"
        >
          Ver campanha
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissCampaignAlert(slug);
            setDismissed(true);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary-foreground/80 transition hover:bg-white/15 hover:text-primary-foreground"
          aria-label="Fechar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
