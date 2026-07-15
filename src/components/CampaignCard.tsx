import { Link } from "@tanstack/react-router";
import { HeartHandshake, MapPin } from "lucide-react";
import { brl, formatDate } from "@/lib/format";
import { campaignProgressPercent } from "@/lib/campaign-display";
import { getPrimaryImagePath, type CampaignImageSource } from "@/lib/campaign-images";
import { SignedImage } from "./SignedImage";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type CampaignCardData = CampaignImageSource & {
  id: string;
  slug: string;
  title: string;
  category: string;
  goal_amount: number;
  raised_amount: number;
  city: string;
  state: string;
  featured?: boolean;
  created_at: string;
};

export function CampaignBrandIcon({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`grid shrink-0 place-items-center gradient-warm text-primary-foreground shadow-warm ${box}`}
      aria-hidden
    >
      <HeartHandshake className={icon} />
    </span>
  );
}

export function CampaignCard({ c }: { c: CampaignCardData }) {
  const pct = campaignProgressPercent(c.raised_amount, c.goal_amount);
  const primaryImage = getPrimaryImagePath(c);
  return (
    <Link
      to="/campanha/$slug"
      params={{ slug: c.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-warm"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <SignedImage
          path={primaryImage}
          alt={c.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {c.featured && (
          <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
            ★ Em destaque
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            {c.category}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {c.city}/{c.state}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            PIX Direto
          </span>
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Sem Comissão
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            Campanha Aprovada
          </span>
        </div>
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-foreground">{c.title}</h3>
        <div className="mt-auto space-y-3">
          <Progress value={pct} className="h-2" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <CampaignBrandIcon size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Doar via PIX
                </p>
                <p className="text-xs text-muted-foreground">
                  Criada em {formatDate(c.created_at)}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-right text-sm text-muted-foreground">
              Meta
              <span className="mt-0.5 block font-semibold text-foreground">
                {brl(c.goal_amount)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
