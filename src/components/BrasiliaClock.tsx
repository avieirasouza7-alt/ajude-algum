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

export function BrasiliaClock({
  className = "",
  showLabel = false,
  compact = false,
}: {
  className?: string;
  showLabel?: boolean;
  /** Só ícone + horário, sem o texto "Horário de Brasília". */
  compact?: boolean;
}) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatBrasiliaTime());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const showTextLabel = showLabel && !compact;

  return (
    <div
      className={cn("shrink-0 select-none", className)}
      aria-live="polite"
      aria-label={time ? `Horário de Brasília: ${time}` : "Horário de Brasília"}
    >
      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 shadow-sm ring-1 ring-primary/10">
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        {showTextLabel && (
          <span className="whitespace-nowrap text-xs font-semibold tracking-tight text-primary/90">
            Horário de Brasília:
          </span>
        )}
        <time
          className="inline-block min-w-[5.75ch] whitespace-nowrap font-mono text-xs font-bold tabular-nums tracking-wide text-primary"
          dateTime={time ?? undefined}
          suppressHydrationWarning
        >
          {time ?? "--:--:--"}
        </time>
      </div>
    </div>
  );
}
