import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Droplets,
  MessageCircleHeart,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOW_JARDIM_HOME_PROMO } from "@/lib/local-preview";
import { SITE_NAME } from "@/lib/site-meta";
import { JardimArtBanner } from "@/components/JardimArtBanner";

const fadeClass =
  "animate-section-fade motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0";

const HOW_STEPS = [
  {
    icon: Sprout,
    title: "Entre de graça",
    text: "Use sua conta do site — sem pagamento, sem anúncios, sem compras.",
  },
  {
    icon: Droplets,
    title: "Cuide do jardim",
    text: "Regue, pode e proteja as mudas num jardim 3D vivo em tempo real.",
  },
  {
    icon: MessageCircleHeart,
    title: "Jogue em comunidade",
    text: "Converse com outras pessoas e veja o jardim crescer junto com todos.",
  },
  {
    icon: Users,
    title: "Veja a solidariedade florescer",
    text: "Cada gesto de carinho no site ajuda o jardim a ficar mais bonito.",
  },
] as const;

/** Convite visual na home para o Jogo Jardim da Esperança (sem capturas reais do jogo). */
export function HomeGardenInvite() {
  if (!SHOW_JARDIM_HOME_PROMO) return null;

  return (
    <section
      className={cn("mt-16 sm:mt-20", fadeClass)}
      aria-labelledby="garden-invite-heading"
    >
      <Link
        to="/jardim"
        aria-label="Jogar o Jogo Jardim da Esperança — gratuito"
        className="group relative block overflow-hidden rounded-[1.75rem] shadow-warm outline-none ring-primary/0 transition duration-500 hover:shadow-[0_20px_50px_-20px_oklch(0.52_0.13_162_/_0.45)] focus-visible:ring-4 focus-visible:ring-primary/35"
      >
        <div className="relative aspect-[16/10] min-h-[280px] w-full sm:aspect-[21/9] sm:min-h-[320px]">
          <JardimArtBanner className="absolute inset-0 h-full w-full transition duration-[1.4s] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.05_162_/_0.92)] via-[oklch(0.28_0.06_162_/_0.55)] to-[oklch(0.35_0.05_162_/_0.2)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.05_162_/_0.55)] via-transparent to-transparent"
          />

          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              100% gratuito · sem anúncios
            </span>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-glow sm:text-sm">
              O jogo da comunidade · {SITE_NAME}
            </p>

            <h2
              id="garden-invite-heading"
              className="fire-text mt-2 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Jogo Jardim da Esperança
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Um jardim da comunidade em tempo real. Regue, pode, converse — de graça.
            </p>

            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl gradient-warm px-5 py-3 text-sm font-bold text-primary-foreground shadow-warm transition duration-300 group-hover:gap-3">
              Quero jogar agora
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-10 text-center sm:text-left">
        <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Como funciona o jogo?
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Simples, leve e feito para todo mundo — cuide das mudas, ganhe moedas e veja o jardim
          florescer.
        </p>
      </div>

      <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {HOW_STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="relative">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  Passo {index + 1}
                </p>
                <h4 className="mt-0.5 font-display text-base font-bold text-foreground">{title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Gratuito para sempre · sem anúncios no jogo · feito com carinho pela comunidade do{" "}
        {SITE_NAME}.
      </p>
    </section>
  );
}
