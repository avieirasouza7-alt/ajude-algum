import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { brl } from "@/lib/format";
import { SignedImage } from "./SignedImage";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type CampaignCardData = {
  id: string;
  slug: string;
  title: string;
  category: string;
  image_path: string | null;
  goal_amount: number;
  raised_amount: number;
  city: string;
  state: string;
  featured?: boolean;
};

export function CampaignCard({ c }: { c: CampaignCardData }) {
  const pct = Math.min(100, Math.round((Number(c.raised_amount) / Number(c.goal_amount)) * 100));
  return (
    <Link
      to="/campanha/$slug"
      params={{ slug: c.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-warm"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <SignedImage
          path={c.image_path}
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
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold text-primary">{brl(c.raised_amount)}</span>
            <span className="text-muted-foreground">de {brl(c.goal_amount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{pct}% arrecadado</p>
        </div>
      </div>
    </Link>
  );
}
