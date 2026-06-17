import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ACCENTS = {
  emerald: "from-emerald-500/15 to-emerald-600/5 text-emerald-600",
  amber: "from-amber-500/15 to-amber-600/5 text-amber-600",
  sky: "from-sky-500/15 to-sky-600/5 text-sky-600",
  rose: "from-rose-500/15 to-rose-600/5 text-rose-600",
} as const;

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "emerald",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Card className="group overflow-hidden border-border/60 shadow-soft transition hover:border-primary/20 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight">{value}</p>
            {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-black/5",
              ACCENTS[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
