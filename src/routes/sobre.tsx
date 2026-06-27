import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  Share2,
  Megaphone,
  Users,
  HandCoins,
} from "lucide-react";
import sobreHero from "@/assets/sobre-hero.jpg";
import {
  absoluteAssetUrl,
  absoluteSiteUrl,
  buildOgImageMeta,
  canonicalHeadLink,
  metaAbsoluteUrl,
  metaOgShareImageUrl,
} from "@/lib/site-meta";

const SOBRE_DESCRIPTION =
  "Como funciona o Ajude Alguém: crie campanhas solidárias gratuitas, receba doações via PIX direto na sua chave, compartilhe no WhatsApp e mobilize sua comunidade com transparência.";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Como funciona — Ajude Alguém | Campanhas solidárias via PIX" },
      { name: "description", content: SOBRE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "como funciona, campanha solidária, doação via PIX, vaquinha online, ajuda ao próximo, solidariedade",
      },
      { property: "og:title", content: "Como funciona — Ajude Alguém" },
      { property: "og:description", content: SOBRE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: metaAbsoluteUrl("/sobre") },
      ...buildOgImageMeta(),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Como funciona — Ajude Alguém" },
      { name: "twitter:description", content: SOBRE_DESCRIPTION },
      { name: "twitter:image", content: metaOgShareImageUrl() },
    ],
    links: [
      canonicalHeadLink("/sobre"),
      { rel: "preload", as: "image", href: sobreHero, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Como funciona — Ajude Alguém",
          description: SOBRE_DESCRIPTION,
          url: absoluteSiteUrl("/sobre"),
          primaryImageOfPage: absoluteAssetUrl(sobreHero),
        }),
      },
    ],
  }),
  component: Sobre,
});

function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

function BannerImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, []);

  if (failed) return null;
  return (
    <img
      ref={ref}
      src={src}
      srcSet={`${src} 1920w, ${src} 1280w, ${src} 768w`}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
      alt="Grupo diverso de pessoas sorrindo juntas em um parque ao pôr do sol, em clima de acolhimento e solidariedade comunitária."
      width={1920}
      height={1080}
      decoding="async"
      fetchPriority="high"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  prefix = "",
  suffix = "",
  active,
}: {
  icon: typeof Megaphone;
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  active: boolean;
}) {
  const n = useCountUp(value, active);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl gradient-warm text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 font-display text-4xl font-extrabold text-primary">
        {prefix}
        {n.toLocaleString("pt-BR")}
        {suffix}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Sobre() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStatsVisible(true),
      { threshold: 0.3 },
    );
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold">Como funciona o Ajude Alguém</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Uma forma simples, transparente e humana de mobilizar pessoas em torno de uma causa.
        </p>

        {/* Hero visual */}
        <figure
          role="img"
          aria-labelledby="banner-title"
          aria-describedby="banner-desc"
          className="relative mt-8 overflow-hidden rounded-3xl shadow-elegant animate-fade-in"
        >
          {/* Placeholder gradient: identical aspect-ratio + gradient so layout stays stable if image fails */}
          <div aria-hidden="true" className="absolute inset-0 gradient-warm" />
          <BannerImage src={sobreHero} />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/45 to-primary/10"
          />
          <figcaption className="relative p-6 sm:p-10 text-primary-foreground min-h-[280px] sm:min-h-[400px] md:min-h-[460px] flex flex-col justify-end">
            <h2
              id="banner-title"
              className="font-display text-2xl font-extrabold leading-tight sm:text-4xl md:text-5xl [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] max-w-[90%]"
            >
              Juntos podemos transformar vidas
            </h2>
            <p
              id="banner-desc"
              className="mt-2 max-w-2xl text-sm sm:text-base md:text-lg opacity-95 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]"
            >
              Cada contribuição pode fazer a diferença para alguém.
            </p>
          </figcaption>
        </figure>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            {
              i: HeartHandshake,
              t: "Crie sua campanha",
              d: "Cadastre-se gratuitamente, conte sua história, defina a meta e a chave PIX.",
            },
            {
              i: ShieldCheck,
              t: "Aprovação rápida",
              d: "Nossa equipe revisa cada campanha para manter a comunidade segura.",
            },
            {
              i: Share2,
              t: "Compartilhe nas redes",
              d: "Botão de compartilhamento direto pelo WhatsApp para mobilizar amigos e familiares.",
            },
            {
              i: Sparkles,
              t: "Receba via PIX",
              d: "Doações chegam diretamente na sua chave PIX. Sem taxas, sem intermediários.",
            },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-warm text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        {/* Impacto da Comunidade */}
        <section ref={statsRef} className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Impacto da Comunidade
            </h2>
            <p className="mt-2 text-muted-foreground">
              Números que mostram a força de quem acredita em ajudar.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <StatCard
              icon={Megaphone}
              value={1240}
              label="Campanhas criadas"
              active={statsVisible}
            />
            <StatCard icon={Users} value={8750} label="Pessoas ajudadas" active={statsVisible} />
            <StatCard
              icon={HandCoins}
              value={520000}
              prefix="R$ "
              label="Doações recebidas"
              active={statsVisible}
            />
          </div>
        </section>

        <div className="mt-12 rounded-3xl gradient-warm p-8 text-primary-foreground sm:p-12">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Pronto para começar?</h2>
          <p className="mt-2 max-w-2xl opacity-90">
            Sua campanha pode estar no ar hoje. Crie, compartilhe e veja a comunidade se mobilizar.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Link to="/nova-campanha">Criar minha campanha</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
