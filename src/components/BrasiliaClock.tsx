import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TIMEZONE = "America/Sao_Paulo";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatBrasiliaTime(date = new Date()) {
  return timeFormatter.format(date);
}

const shellClass =
  "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 shadow-sm ring-1 ring-primary/10 sm:gap-2 sm:px-3 sm:py-1.5";

const labelClass =
  "whitespace-nowrap text-xs font-semibold tracking-tight text-primary/90 lg:text-[13px]";

const timeClass =
  "font-mono text-xs font-bold tabular-nums tracking-wide text-primary lg:text-[13px]";

export function BrasiliaClock({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatBrasiliaTime());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const labelVisible = showLabel ? "inline" : "hidden md:inline";

  return (
    <div
      className={cn("min-w-0 shrink-0 select-none", className)}
      aria-live="polite"
      aria-label={time ? `Horário de Brasília: ${time}` : "Horário de Brasília"}
    >
      <div className={cn(shellClass, showLabel ? "flex" : "hidden md:flex")}>
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className={cn(labelClass, labelVisible)}>Horário de Brasília:</span>
        <time className={timeClass} suppressHydrationWarning>
          {time ?? "--:--:--"}
        </time>
      </div>

      <div className={cn(shellClass, showLabel ? "hidden" : "flex md:hidden")}>
        <Clock className="h-3 w-3 shrink-0 text-primary" aria-hidden />
        <time className={timeClass} suppressHydrationWarning>
          {time ?? "--:--:--"}
        </time>
      </div>
    </div>
  );
}
