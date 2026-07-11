import { useEffect, useState } from "react";

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

  const labelVisible = showLabel ? "flex" : "hidden md:flex";

  return (
    <div
      className={`min-w-0 shrink-0 select-none text-muted-foreground/80 ${className}`}
      aria-live="polite"
      aria-label={time ? `Horário de Brasília: ${time}` : "Horário de Brasília"}
    >
      <p
        className={`${labelVisible} items-center gap-1 whitespace-nowrap text-xs font-medium tracking-tight lg:text-[13px]`}
      >
        <span aria-hidden>🇧🇷</span>
        <span>Horário de Brasília:</span>
        <time className="font-mono tabular-nums text-foreground/75" suppressHydrationWarning>
          {time ?? "--:--:--"}
        </time>
      </p>
      <p
        className={`${showLabel ? "hidden" : "flex md:hidden"} items-center gap-1 whitespace-nowrap text-[11px] font-medium tracking-tight`}
      >
        <span aria-hidden>🇧🇷</span>
        <time className="font-mono tabular-nums text-foreground/75" suppressHydrationWarning>
          {time ?? "--:--:--"}
        </time>
      </p>
    </div>
  );
}
