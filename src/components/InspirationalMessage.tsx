import { Heart, Sparkles, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import mensagensData from "@/data/mensagens-inspiradoras.json";
import { cn } from "@/lib/utils";

const ROTATION_MS = 12_000;
const FADE_MS = 500;

const messages = mensagensData.messages;

const categoryStyle: Record<
  string,
  { label: string; emoji: string; chip: string; accent: string; glow: string; quote: string }
> = {
  solidariedade: {
    label: "Solidariedade",
    emoji: "❤️",
    chip: "bg-rose-100 text-rose-700 ring-rose-300/70",
    accent: "from-rose-400 via-rose-500 to-pink-500",
    glow: "bg-rose-400/35",
    quote: "text-rose-300/50",
  },
  esperanca: {
    label: "Esperança",
    emoji: "💙",
    chip: "bg-sky-100 text-sky-800 ring-sky-300/70",
    accent: "from-sky-400 via-blue-500 to-indigo-500",
    glow: "bg-sky-400/35",
    quote: "text-sky-300/55",
  },
  ajuda: {
    label: "Ajuda ao próximo",
    emoji: "🤝",
    chip: "bg-emerald-100 text-emerald-800 ring-emerald-300/70",
    accent: "from-emerald-400 via-primary to-teal-500",
    glow: "bg-emerald-400/35",
    quote: "text-emerald-300/55",
  },
  incentivo: {
    label: "Incentivo",
    emoji: "🌱",
    chip: "bg-violet-100 text-violet-800 ring-violet-300/70",
    accent: "from-violet-400 via-purple-500 to-fuchsia-500",
    glow: "bg-violet-400/35",
    quote: "text-violet-300/55",
  },
  motivacao: {
    label: "Motivação",
    emoji: "⭐",
    chip: "bg-amber-100 text-amber-900 ring-amber-300/70",
    accent: "from-amber-400 via-orange-400 to-yellow-500",
    glow: "bg-amber-400/40",
    quote: "text-amber-300/60",
  },
  plataforma: {
    label: "Como funciona",
    emoji: "ℹ️",
    chip: "bg-teal-100 text-teal-800 ring-teal-300/70",
    accent: "from-teal-400 via-cyan-500 to-emerald-500",
    glow: "bg-teal-400/35",
    quote: "text-teal-300/55",
  },
};

function shuffleIndices(length: number) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function InspirationalMessage() {
  const orderRef = useRef(shuffleIndices(messages.length));
  const positionRef = useRef(0);
  const [displayIndex, setDisplayIndex] = useState(() => orderRef.current[0]);
  const [visible, setVisible] = useState(true);

  const current = messages[displayIndex];
  const style = categoryStyle[current.category] ?? categoryStyle.solidariedade;

  const advance = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      positionRef.current += 1;
      if (positionRef.current >= orderRef.current.length) {
        orderRef.current = shuffleIndices(messages.length);
        positionRef.current = 0;
      }
      setDisplayIndex(orderRef.current[positionRef.current]);
      setVisible(true);
    }, FADE_MS);
  }, []);

  useEffect(() => {
    const id = window.setInterval(advance, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [advance]);

  return (
    <section
      className="mt-12 sm:mt-16"
      aria-label="Mensagem inspiradora"
      aria-live="polite"
    >
      <div className="relative rounded-[1.85rem] bg-gradient-to-r from-rose-300/50 via-amber-300/55 to-sky-300/50 p-[3px] shadow-warm">
        <div className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-8">
          <div
            className={cn(
              "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl transition-colors duration-700",
              style.glow,
            )}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-14 left-0 h-36 w-36 rounded-full bg-amber-300/40 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-1/4 top-1/3 h-28 w-28 rounded-full bg-sky-300/35 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/3 top-2 h-20 w-20 rounded-full bg-rose-300/25 blur-2xl"
            aria-hidden
          />

          <div
            className="pointer-events-none absolute inset-x-8 top-3 flex justify-between opacity-60"
            aria-hidden
          >
            <span className="text-xs text-rose-400">✦</span>
            <span className="text-xs text-amber-500">✧</span>
            <span className="text-xs text-sky-500">✦</span>
            <span className="text-xs text-emerald-500">✧</span>
          </div>

          <Sparkles
            className="pointer-events-none absolute right-5 top-5 h-5 w-5 text-amber-500"
            aria-hidden
          />
          <Star
            className="pointer-events-none absolute left-6 top-9 h-4 w-4 fill-amber-400 text-amber-400"
            aria-hidden
          />
          <Heart
            className="pointer-events-none absolute bottom-10 right-12 h-4 w-4 fill-rose-400/70 text-rose-400/70"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-hero text-primary-foreground shadow-warm ring-2 ring-white/70">
                <Heart className="h-5 w-5 fill-current" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-[10px] shadow-md ring-2 ring-white">
                  ✨
                </span>
              </span>
              <div>
                <h2 className="bg-gradient-to-r from-rose-600 via-emerald-600 to-amber-600 bg-clip-text font-display text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
                  Mensagem Inspiradora
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-emerald-800/75 sm:text-sm">
                  Palavras de esperança, solidariedade e carinho
                </p>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm ring-1 transition-colors duration-500",
                style.chip,
              )}
            >
              <span aria-hidden>{style.emoji}</span>
              {style.label}
            </span>
          </div>

          <div
            className={cn(
              "relative mt-6 overflow-hidden rounded-2xl border-2 border-white/90 bg-gradient-to-br from-white/90 via-white/80 to-emerald-50/50 p-5 shadow-soft backdrop-blur-sm transition-all duration-500 sm:p-6",
              visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-2 bg-gradient-to-b",
                style.accent,
              )}
              aria-hidden
            />

            <span
              className={cn(
                "absolute right-4 top-1 font-display text-5xl leading-none",
                style.quote,
              )}
              aria-hidden
            >
              “
            </span>
            <span
              className={cn(
                "absolute bottom-0 left-8 font-display text-5xl leading-none",
                style.quote,
              )}
              aria-hidden
            >
              ”
            </span>

            <blockquote className="relative min-h-[4.5rem] pl-4 sm:min-h-[3.5rem]">
              <p className="bg-gradient-to-r from-emerald-950 via-foreground to-emerald-900 bg-clip-text text-base font-bold leading-relaxed text-transparent sm:text-lg sm:leading-relaxed">
                {current.text}
              </p>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
