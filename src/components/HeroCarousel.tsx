import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, ArrowRight, Heart, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";

type Slide = {
  image: string;
  kicker: string;
  title: string;
  text: string;
};

const TRUST_PILLS = [
  "PIX Direto",
  "Sem Intermediários",
  "Sem Comissão",
  "Plataforma Gratuita",
] as const;

const SLIDES: Slide[] = [
  {
    image: hero1,
    kicker: "Esperança",
    title: "Ajude pessoas diretamente pelo PIX.",
    text: "Conectamos quem deseja ajudar com quem precisa de apoio. As doações são realizadas diretamente para a chave PIX do beneficiário, sem intermediários e sem comissões.",
  },
  {
    image: hero2,
    kicker: "Transparência",
    title: "100% da sua doação vai para quem precisa.",
    text: "O Ajude Alguém Online não recebe, administra ou retém nenhuma doação. Toda contribuição é enviada diretamente para a chave PIX informada pelo beneficiário.",
  },
  {
    image: hero3,
    kicker: "Comunidade",
    title: "Juntos podemos transformar vidas.",
    text: "Cada campanha compartilhada aumenta as chances de alcançar pessoas dispostas a ajudar. A solidariedade cresce quando caminhamos juntos.",
  },
  {
    image: hero4,
    kicker: "Solidariedade",
    title: "Toda ajuda faz diferença.",
    text: "Apoie famílias, pessoas em tratamento, animais resgatados e outras causas importantes. Um simples gesto pode transformar uma vida.",
  },
  {
    image: hero5,
    kicker: "Oportunidade",
    title: "Precisa de ajuda? Crie sua campanha.",
    text: "Cadastre sua campanha gratuitamente, informe sua chave PIX e compartilhe sua história. Quem desejar ajudar fará a doação diretamente para você.",
  },
];

const AUTOPLAY_MS = 5000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => go(index + 1), [index, go]);
  const prev = useCallback(() => go(index - 1), [index, go]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, paused, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  return (
    <section
      className="relative w-full overflow-hidden bg-foreground"
      aria-roledescription="carousel"
      aria-label="Histórias que inspiram"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[58vh] min-h-[380px] w-full sm:h-[72vh] sm:min-h-[520px] lg:h-[82vh] lg:min-h-[600px]">
        {SLIDES.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${SLIDES.length}`}
            >
              <HeroImage src={s.image} alt={s.title} eager={i === 0} active={active} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                  <div
                    className={`max-w-2xl text-primary-foreground ${active ? "animate-hero-in" : "opacity-0"}`}
                  >
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                      <Heart className="h-3.5 w-3.5 text-accent" /> {s.kicker}
                    </span>
                    <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.05] drop-shadow-lg sm:mt-5 sm:text-5xl md:text-6xl lg:text-7xl">
                      {s.title}
                    </h1>
                    <p className="mt-5 max-w-xl text-sm text-white/90 sm:text-base md:text-lg">
                      {s.text}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button
                        asChild
                        size="lg"
                        className="gradient-warm text-primary-foreground shadow-warm hover:opacity-95"
                      >
                        <Link to="/nova-campanha">
                          Criar Campanha <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-white/40 bg-white/10 text-primary-foreground backdrop-blur hover:bg-white/20"
                      >
                        <Link to="/campanhas">Explorar Campanhas</Link>
                      </Button>
                    </div>
                    <ul className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-white/85 sm:text-xs">
                      {TRUST_PILLS.map((label) => (
                        <li key={label} className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Arrows */}
        <button
          onClick={prev}
          aria-label="Slide anterior"
          className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={next}
          aria-label="Próximo slide"
          className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur transition hover:bg-black/50 sm:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Ir para slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-2.5 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-accent" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroImage({
  src,
  alt,
  eager,
  active,
}: {
  src: string;
  alt: string;
  eager: boolean;
  active: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <>
      {!loaded && !errored && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      {errored ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/30 to-accent/30">
          <HeartHandshake className="h-20 w-20 text-white/60" aria-hidden />
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-full w-full object-cover will-change-transform transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"} ${active && loaded ? "animate-hero-zoom" : ""}`}
        />
      )}
    </>
  );
}
