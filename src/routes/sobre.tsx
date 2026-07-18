import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  HeartHandshake,
  HandCoins,
  MapPin,
  Megaphone,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Share2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import solidarity1 from "@/assets/sobre-solidariedade-1.webp";
import solidarity2 from "@/assets/sobre-solidariedade-2.webp";
import solidarity3 from "@/assets/sobre-solidariedade-3.webp";
import solidarity4 from "@/assets/sobre-solidariedade-4.webp";
import solidarity5 from "@/assets/sobre-solidariedade-5.webp";
import {
  absoluteAssetUrl,
  absoluteSiteUrl,
  buildOgImageMeta,
  canonicalHeadLink,
  metaAbsoluteUrl,
  metaOgShareImageUrl,
  SITE_NAME,
} from "@/lib/site-meta";
import { fetchPublicSiteStats } from "@/lib/site-stats";

const SOBRE_DESCRIPTION =
  "Como funciona o Ajude Alguém Online: crie campanhas solidárias gratuitas, receba doações via PIX direto na sua chave, compartilhe no WhatsApp e mobilize sua comunidade com transparência.";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: `Como funciona — ${SITE_NAME} | Campanhas solidárias via PIX` },
      { name: "description", content: SOBRE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "como funciona, campanha solidária, doação via PIX, vaquinha online, ajuda ao próximo, solidariedade",
      },
      { property: "og:title", content: `Como funciona — ${SITE_NAME}` },
      { property: "og:description", content: SOBRE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: metaAbsoluteUrl("/sobre") },
      ...buildOgImageMeta(),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Como funciona — ${SITE_NAME}` },
      { name: "twitter:description", content: SOBRE_DESCRIPTION },
      { name: "twitter:image", content: metaOgShareImageUrl() },
    ],
    links: [
      canonicalHeadLink("/sobre"),
      { rel: "preload", as: "image", href: solidarity1, fetchPriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Como funciona — ${SITE_NAME}`,
          description: SOBRE_DESCRIPTION,
          url: absoluteSiteUrl("/sobre"),
          primaryImageOfPage: absoluteAssetUrl(solidarity1),
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

const SOLIDARITY_SLIDES = [
  {
    image: solidarity1,
    alt: "Voluntários de diferentes gerações preparando cestas de alimentos juntos.",
    eyebrow: "União que alimenta",
    title: "A esperança cresce quando a gente se une.",
    text: "Cada gesto compartilhado pode levar cuidado e dignidade para uma família.",
  },
  {
    image: solidarity2,
    alt: "Duas mulheres se abraçando com carinho ao pôr do sol.",
    eyebrow: "Acolhimento",
    title: "Acolher também é transformar.",
    text: "Às vezes, uma mão estendida é o começo de um novo caminho.",
  },
  {
    image: solidarity3,
    alt: "Pessoas de várias idades cuidando juntas de uma horta comunitária.",
    eyebrow: "Sementes de futuro",
    title: "Toda mudança começa com alguém que acredita.",
    text: "Quando uma comunidade se mobiliza, pequenas ações criam grandes transformações.",
  },
  {
    image: solidarity4,
    alt: "Voluntária entregando uma mochila escolar para uma mãe e sua filha.",
    eyebrow: "Ajuda que chega",
    title: "Solidariedade é estar presente quando mais importa.",
    text: "Quem precisa encontra apoio. Quem ajuda encontra uma forma real de fazer a diferença.",
  },
  {
    image: solidarity5,
    alt: "Grupo diverso reunindo as mãos em sinal de união.",
    eyebrow: "Força coletiva",
    title: "Juntos, fazemos a solidariedade acontecer.",
    text: "Uma pessoa ajuda, outra compartilha e muitas vidas podem ser alcançadas.",
  },
];

function AboutHeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SOLIDARITY_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const selectSlide = (index: number) => {
    setActive((index + SOLIDARITY_SLIDES.length) % SOLIDARITY_SLIDES.length);
  };

  const slide = SOLIDARITY_SLIDES[active];

  return (
    <figure
      role="group"
      aria-roledescription="carrossel"
      aria-label="Histórias de solidariedade e esperança"
      className="relative min-h-[400px] overflow-hidden rounded-[2rem] border-4 border-white/80 bg-primary shadow-warm sm:min-h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SOLIDARITY_SLIDES.map((item, index) => (
        <img
          key={item.image}
          src={item.image}
          alt={index === active ? item.alt : ""}
          width={1024}
          height={768}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          className={`absolute inset-0 h-full w-full object-cover transition duration-1000 ${
            index === active ? "scale-100 opacity-100" : "pointer-events-none scale-105 opacity-0"
          }`}
        />
      ))}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/20 to-black/5"
      />

      <div className="absolute right-4 top-4 rounded-2xl border border-white/40 bg-white/90 p-3 text-foreground shadow-soft backdrop-blur sm:right-6 sm:top-6 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold text-primary">Doação transparente</p>
            <p className="text-sm font-extrabold">Direto no PIX</p>
          </div>
        </div>
      </div>

      <figcaption
        key={active}
        aria-live="polite"
        className="absolute inset-x-0 bottom-0 animate-hero-in p-6 pb-20 text-primary-foreground sm:p-8 sm:pb-24"
      >
        <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
          {slide.eyebrow}
        </p>
        <h2 className="max-w-xl font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
          {slide.title}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
          {slide.text}
        </p>
      </figcaption>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 sm:inset-x-6 sm:bottom-6">
        <div className="flex items-center gap-2">
          {SOLIDARITY_SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Ir para imagem ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => selectSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === active ? "w-8 bg-white" : "w-2 bg-white/45 hover:bg-white/75"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={paused ? "Continuar carrossel" : "Pausar carrossel"}
            onClick={() => setPaused((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => selectSlide(active - 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={() => selectSlide(active + 1)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </figure>
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
    <div className="group rounded-3xl border border-primary/10 bg-card p-6 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-warm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 font-display text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
        {prefix}
        {n.toLocaleString("pt-BR")}
        {suffix}
      </div>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

const HOW_STEPS = [
  {
    icon: HeartHandshake,
    number: "01",
    title: "Crie sua campanha",
    text: "Conte sua história com clareza, defina uma meta e informe a chave PIX do beneficiário.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Passe pela análise",
    text: "Nossa equipe revisa as informações antes da publicação para proteger a comunidade.",
  },
  {
    icon: Share2,
    number: "03",
    title: "Compartilhe sua causa",
    text: "Divulgue o link da campanha no WhatsApp e nas redes para alcançar mais pessoas.",
  },
  {
    icon: Sparkles,
    number: "04",
    title: "Receba direto no PIX",
    text: "Quem ajuda envia o valor diretamente para a chave cadastrada, sem passar pelo site.",
  },
];

const TRUST_ITEMS = [
  {
    icon: Wallet,
    title: "PIX direto",
    text: "O dinheiro vai do doador para o beneficiário.",
  },
  {
    icon: BadgeCheck,
    title: "Sem comissão",
    text: "A plataforma não desconta taxas das doações.",
  },
  {
    icon: Eye,
    title: "Mais transparência",
    text: "Cada campanha apresenta sua história, meta e beneficiário.",
  },
];

const AUDIENCES = [
  {
    icon: Heart,
    title: "Saúde e tratamentos",
    text: "Exames, cirurgias, medicamentos, terapias e outras necessidades médicas.",
  },
  {
    icon: Users,
    title: "Famílias e emergências",
    text: "Apoio em situações urgentes, perdas, moradia e recomeços.",
  },
  {
    icon: MessageCircle,
    title: "Projetos e comunidades",
    text: "Iniciativas sociais, proteção animal e ações que transformam realidades.",
  },
];

function Sobre() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["public-site-stats"],
    queryFn: fetchPublicSiteStats,
    staleTime: 60_000,
  });

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
    <div className="min-h-screen overflow-hidden bg-background">
      <Header />
      <main id="conteudo">
        <section className="relative border-b border-primary/10">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(245,158,11,0.10),transparent_30%)]"
          />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-14 lg:py-20">
            <div className="animate-section-fade">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <HeartHandshake className="h-4 w-4" aria-hidden />
                Solidariedade simples e direta
              </span>
              <h1 className="mt-6 max-w-xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Uma ponte entre quem <span className="text-primary">precisa</span> e quem deseja{" "}
                <span className="text-primary">ajudar.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Crie uma campanha gratuitamente, compartilhe sua história e receba contribuições
                diretamente no PIX informado — sem taxas sobre as doações e sem intermediários.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="gradient-warm text-primary-foreground shadow-warm"
                >
                  <Link to="/nova-campanha">
                    Criar campanha <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-card/70">
                  <Link to="/campanhas">Conhecer campanhas</Link>
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                {["Criação gratuita", "PIX direto", "Campanhas analisadas"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <AboutHeroCarousel />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Passo a passo
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Transformando histórias em esperança.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Um processo claro e acessível para você se concentrar no que realmente importa:
              mobilizar pessoas pela sua causa.
            </p>
          </div>

          <div className="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden
              className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block"
            />
            {HOW_STEPS.map(({ icon: Icon, number, title, text }) => (
              <article
                key={number}
                className="group relative rounded-3xl border border-border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-warm"
              >
                <div className="flex items-center justify-between">
                  <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm transition group-hover:scale-105">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-primary/15">
                    {number}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-emerald-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Transparência em primeiro lugar
              </span>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                A plataforma conecta. A doação vai direto para quem precisa.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-emerald-50/70">
                O Ajude Alguém não recebe, processa nem retém o dinheiro das campanhas. Quem doa
                utiliza o PIX informado pelo beneficiário, mantendo o fluxo simples e direto.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur"
                  >
                    <Icon className="h-5 w-5 text-emerald-300" aria-hidden />
                    <h3 className="mt-3 font-bold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-emerald-50/65">{text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-emerald-950">
                  <HandCoins className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-emerald-100/60">Exemplo de uma contribuição</p>
                  <p className="font-display text-xl font-extrabold">Doação via PIX</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {[
                  ["Doador escolhe a campanha", "Conhece a história e decide contribuir"],
                  ["Site apresenta o PIX", "A chave informada pelo beneficiário"],
                  ["Valor chega diretamente", "Sem passar pela conta da plataforma"],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-extrabold text-emerald-300">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-0.5 text-sm text-emerald-50/60">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-100">
                <strong>Resultado:</strong> 100% do valor enviado pelo doador segue para a chave PIX
                exibida na campanha.
              </div>
            </div>
          </div>
        </section>

        <section ref={statsRef} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Impacto da comunidade
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              Cada campanha representa uma história real
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Indicadores reais da plataforma. Como as doações vão direto no PIX, o valor arrecadado
              não passa pelo site.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <StatCard
              icon={Megaphone}
              value={stats?.campaignCount ?? 0}
              label="Campanhas publicadas"
              active={statsVisible}
            />
            <StatCard
              icon={MapPin}
              value={stats?.stateCount ?? 0}
              label="Estados atendidos"
              active={statsVisible}
            />
            <StatCard
              icon={Wallet}
              value={0}
              suffix="%"
              label="taxa sobre as doações"
              active={statsVisible}
            />
          </div>
        </section>

        <section className="border-y border-primary/10 bg-primary/[0.04]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Causas que encontram apoio
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                Toda ajuda começa com uma história
              </h2>
              <p className="mt-4 text-muted-foreground">
                A plataforma acolhe diferentes necessidades e iniciativas solidárias.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-border bg-card p-7 shadow-soft"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[2rem] gradient-hero px-6 py-12 text-primary-foreground shadow-warm sm:px-12 sm:py-14 lg:px-16">
            <div
              aria-hidden
              className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[40px] border-white/10"
            />
            <div
              aria-hidden
              className="absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  Comece hoje
                </p>
                <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                  Sua causa merece ser conhecida.
                </h2>
                <p className="mt-4 max-w-xl leading-relaxed text-white/85">
                  Crie sua campanha, compartilhe com sua rede e encontre pessoas dispostas a ajudar.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-emerald-800 hover:bg-white/90">
                  <Link to="/nova-campanha">
                    Criar minha campanha <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link to="/campanhas">Ver campanhas</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
