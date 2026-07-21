import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site-meta";

type Props = {
  onDone: () => void;
  /** Duração total da abertura (ms). */
  durationMs?: number;
};

const VERSE = "A tua palavra é lâmpada para os meus pés";
const VERSE_REF = "Salmos 119:105";

/**
 * Abertura cinematográfica premium ao Abrir Bíblia —
 * escuridão → luz → livro 3D abrindo → fogo → versículo → fade.
 */
export function BibliaOpeningIntro({ onDone, durationMs = 5600 }: Props) {
  const [phase, setPhase] = useState(0);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduce) {
      const t = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(t);
    }

    const timers = [
      window.setTimeout(() => setPhase(1), 200), // luz nasce
      window.setTimeout(() => setPhase(2), 900), // livro aparece
      window.setTimeout(() => setPhase(3), 1800), // páginas abrem
      window.setTimeout(() => setPhase(4), 2800), // título em fogo
      window.setTimeout(() => setPhase(5), 3800), // versículo
      window.setTimeout(() => setPhase(6), Math.max(4400, durationMs - 900)), // fade out
      window.setTimeout(onDone, durationMs),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [durationMs, onDone, reduce]);

  return (
    <div
      className={cn(
        "biblia-opening fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden",
        phase >= 6 && "biblia-opening--out",
      )}
      role="dialog"
      aria-label="Abrindo a Bíblia Virtual"
      aria-live="polite"
    >
      {/* Camadas de atmosfera */}
      <div className={cn("biblia-opening__void", phase >= 1 && "is-lit")} aria-hidden />
      <div className={cn("biblia-opening__sun", phase >= 1 && "is-on")} aria-hidden />
      <div className={cn("biblia-opening__rays", phase >= 2 && "is-on")} aria-hidden />
      <div className={cn("biblia-opening__cross-glow", phase >= 3 && "is-on")} aria-hidden />

      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className={cn("biblia-opening__ember", phase >= 2 && "is-on")}
          style={{
            left: `${4 + ((i * 13) % 92)}%`,
            animationDelay: `${0.4 + (i % 10) * 0.12}s`,
            animationDuration: `${2.4 + (i % 6) * 0.35}s`,
          }}
          aria-hidden
        />
      ))}

      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={`dust-${i}`}
          className={cn("biblia-opening__dust", phase >= 3 && "is-on")}
          style={{
            left: `${15 + ((i * 7) % 70)}%`,
            top: `${20 + ((i * 11) % 50)}%`,
            animationDelay: `${1.2 + i * 0.15}s`,
          }}
          aria-hidden
        />
      ))}

      {/* Livro 3D */}
      <div
        className={cn(
          "biblia-opening__stage relative z-10 flex flex-col items-center px-6 text-center",
          phase >= 2 && "is-visible",
          phase >= 3 && "is-open",
        )}
      >
        <div className="biblia-opening__book3d" aria-hidden>
          <div className="biblia-opening__spine" />
          <div className="biblia-opening__page biblia-opening__page--left">
            <span className="biblia-opening__page-lines" />
          </div>
          <div className="biblia-opening__page biblia-opening__page--right">
            <span className="biblia-opening__page-lines" />
          </div>
          <div className="biblia-opening__cover-l" />
          <div className="biblia-opening__cover-r" />
          <div className="biblia-opening__gold-edge" />
        </div>

        <p
          className={cn(
            "biblia-opening__brand mt-10 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-200/90",
            phase >= 4 && "is-visible",
          )}
        >
          {SITE_NAME}
        </p>

        <h1
          className={cn(
            "fire-text mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl",
            "biblia-opening__title",
            phase >= 4 && "is-visible",
          )}
        >
          Bíblia Virtual
        </h1>

        <div className={cn("biblia-opening__verse mt-8 max-w-lg", phase >= 5 && "is-visible")}>
          <p className="font-display text-lg font-medium italic leading-relaxed text-amber-50/95 sm:text-xl md:text-2xl">
            “{VERSE}”
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
            {VERSE_REF}
          </p>
        </div>
      </div>

      <div className={cn("biblia-opening__vignette", phase >= 1 && "is-on")} aria-hidden />
    </div>
  );
}
