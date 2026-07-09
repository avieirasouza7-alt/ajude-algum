import { Link } from "@tanstack/react-router";
import { HeartHandshake, MapPin } from "lucide-react";
import { brl } from "@/lib/format";
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
};

export function CampaignCard({ c }: { c: CampaignCardData }) {
  const pct = Math.min(100, Math.round((Number(c.raised_amount) / Number(c.goal_amount)) * 100));
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
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-foreground">{c.title}</h3>
        <div className="mt-auto space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between gap-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-warm text-primary-foreground shadow-warm"
              aria-hidden
            >
              <HeartHandshake className="h-4 w-4" />
            </span>
            <p className="text-sm text-muted-foreground">de {brl(c.goal_amount)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
