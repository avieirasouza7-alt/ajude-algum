import type { LucideIcon } from "lucide-react";
import {
  Heart,
  HeartHandshake,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Sprout,
  BookOpen,
  Users,
  Wallet,
  BadgeCheck,
  Gift,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  BIBLIA_VIRTUAL_PATH,
  SHOW_BIBLIA_VIRTUAL,
  SHOW_JARDIM_HOME_CARD,
  JARDIM_PUBLIC_OPEN,
} from "@/lib/local-preview";
import { SITE_NAME } from "@/lib/site-meta";
import bibliaPreview from "@/assets/biblia-promo-vista.webp";
import jardimPreview from "@/assets/jardim-promo-vista.webp";

const fadeClass =
  "animate-section-fade motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0";

export function HomeTrustBanner() {
  const showBiblia = SHOW_BIBLIA_VIRTUAL;
  const showJardimCard = SHOW_JARDIM_HOME_CARD;

  if (!showJardimCard && !showBiblia) {
    return (
      <section className={cn("mt-10 sm:mt-12", fadeClass)} aria-labelledby="trust-banner-heading">
        <HomeTrustMessageCard />
      </section>
    );
  }

  if (showJardimCard && showBiblia) {
    return (
      <section className={cn("mt-10 sm:mt-12", fadeClass)} aria-labelledby="trust-banner-heading">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            <HomeGamePortalCard />
            <HomeBibliaPortalCard />
          </div>
          <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
            Espaço da comunidade no {SITE_NAME}: o Jardim da Esperança para cuidar juntos e a Bíblia
            Virtual para encontrar uma palavra de esperança em cada momento.
          </p>
          <HomeTrustMessageCard />
        </div>
      </section>
    );
  }

  if (showBiblia) {
    return (
      <section className={cn("mt-10 sm:mt-12", fadeClass)} aria-labelledby="trust-banner-heading">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] lg:gap-5">
            <HomeBibliaPortalCard />
            <HomeTrustMessageCard />
          </div>
          <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
            Espaço da comunidade no {SITE_NAME}: a Bíblia Virtual para encontrar uma palavra de
            esperança em cada momento.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("mt-10 sm:mt-12", fadeClass)} aria-labelledby="trust-banner-heading">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] lg:gap-5">
        <HomeGamePortalCard />
        <HomeTrustMessageCard />
      </div>
    </section>
  );
}

function HomeTrustMessageCard() {
  return (
    <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.05] p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h2
            id="trust-banner-heading"
            className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            100% das doações vão diretamente para o beneficiário.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            O {SITE_NAME} não recebe, processa, administra ou retém nenhuma doação. A plataforma
            apenas conecta quem deseja ajudar com quem precisa de ajuda. Todo o valor enviado pelo
            doador vai diretamente para a chave PIX informada pelo beneficiário.
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeGamePortalCard() {
  return (
    <Link
      to="/jardim"
      aria-label={
        JARDIM_PUBLIC_OPEN
          ? "Jogar o Jogo Jardim da Esperança"
          : "Jogo Jardim da Esperança — fechado por enquanto"
      }
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.14] shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-warm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={jardimPreview}
          alt=""
          aria-hidden
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          loading="lazy"
          decoding="async"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent"
        />
        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-warm ${
            JARDIM_PUBLIC_OPEN
              ? "bg-primary/95 text-primary-foreground"
              : "bg-amber-600 text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {JARDIM_PUBLIC_OPEN ? "100% gratuito" : "Fechado por enquanto"}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col justify-between p-6 pt-2 sm:p-7 sm:pt-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm transition duration-300 group-hover:scale-105">
              <Sprout className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                O jogo da comunidade
              </p>
              <h2 className="fire-text font-display text-xl font-extrabold tracking-tight">
                Jogo Jardim da Esperança
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {JARDIM_PUBLIC_OPEN
              ? `Cuide de mudas em tempo real, jogue junto e descubra — de graça — como a solidariedade do ${SITE_NAME} floresce.`
              : "O jardim 3D está fechado por enquanto para melhorias. Em breve volta."}
          </p>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-xl gradient-warm px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-warm transition duration-300 group-hover:gap-2.5">
          {JARDIM_PUBLIC_OPEN ? "Ver e jogar" : "Ver o jogo"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** Card da Bíblia Virtual no início do site. */
function HomeBibliaPortalCard() {
  return (
    <Link
      to={BIBLIA_VIRTUAL_PATH}
      aria-label="Abrir a Bíblia Virtual"
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-amber-600/[0.12] shadow-soft transition duration-300 hover:-translate-y-1 hover:border-amber-500/45 hover:shadow-warm"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={bibliaPreview}
          alt=""
          aria-hidden
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          loading="lazy"
          decoding="async"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent"
        />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-warm">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Novo
        </span>
      </div>
      <div className="relative flex flex-1 flex-col justify-between p-6 pt-2 sm:p-7 sm:pt-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-warm transition duration-300 group-hover:scale-105">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Palavra de esperança
              </p>
              <h2 className="fire-text font-display text-xl font-extrabold tracking-tight">
                Bíblia Virtual
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Leitura, orações, promessas e uma palavra de esperança para cada momento — experiência
            espiritual acolhedora do {SITE_NAME}.
          </p>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-warm transition duration-300 group-hover:gap-2.5">
          Abrir Bíblia
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

const HOW_STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Heart,
    title: "Crie sua campanha",
    text: "Descreva sua necessidade e informe sua chave PIX.",
  },
  {
    icon: Megaphone,
    title: "Compartilhe",
    text: "Divulgue sua campanha nas redes e com quem pode ajudar.",
  },
  {
    icon: HeartHandshake,
    title: "Receba ajuda",
    text: "Os doadores enviam diretamente para o seu PIX.",
  },
  {
    icon: Users,
    title: "Transforme vidas",
    text: "Cada contribuição faz diferença na vida de alguém.",
  },
];

export function HomeHowItWorksCards() {
  return (
    <section className={cn("mt-20", fadeClass)} aria-labelledby="how-it-works-heading">
      <div className="mb-8 text-center sm:text-left">
        <h2
          id="how-it-works-heading"
          className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Como funciona
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Do pedido de ajuda até a doação no PIX — simples, transparente e direto.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_STEPS.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-warm"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm transition duration-300 group-hover:scale-105">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const WHY_ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Wallet,
    title: "PIX Direto",
    text: "O dinheiro nunca passa pela plataforma.",
  },
  {
    icon: BadgeCheck,
    title: "Sem Taxas",
    text: "Nenhuma comissão é cobrada sobre as doações.",
  },
  {
    icon: Eye,
    title: "Transparência",
    text: "O beneficiário recebe diretamente no PIX informado.",
  },
  {
    icon: Gift,
    title: "Gratuito",
    text: "Criar campanhas é totalmente gratuito.",
  },
];

export function HomeWhyTrust() {
  return (
    <section className={cn("mt-20", fadeClass)} aria-labelledby="why-trust-heading">
      <div className="mb-8 text-center sm:text-left">
        <h2
          id="why-trust-heading"
          className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Por que confiar no {SITE_NAME}?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Somos uma ponte solidária — não um intermediário financeiro.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY_ITEMS.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="group rounded-2xl border border-primary/10 bg-gradient-to-b from-primary/[0.04] to-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-warm"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export type HomeStatsDisplay = {
  campaigns: string;
  states: string;
};

export function HomeStatsStrip({
  stats,
  loading = false,
}: {
  stats: HomeStatsDisplay;
  loading?: boolean;
}) {
  // Sem "taxa 0%" — doações são PIX direto; o site não acompanha quem recebeu.
  const items = [
    { icon: Heart, label: "Campanhas publicadas", value: stats.campaigns },
    { icon: MapPin, label: "Estados atendidos", value: stats.states },
    { icon: HeartHandshake, label: "Vai direto no PIX", value: "100%" },
  ];

  return (
    <section className={cn("mt-20", fadeClass)} aria-labelledby="home-stats-heading">
      <div className="mb-6 text-center sm:text-left">
        <h2
          id="home-stats-heading"
          className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Nossa comunidade em números
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Como as doações vão direto no PIX, o site não acompanha valores arrecadados.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-warm sm:px-5 sm:py-6"
          >
            <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden />
            <p
              className={cn(
                "mt-3 font-display text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl",
                loading &&
                  "inline-block h-8 w-16 animate-pulse rounded-lg bg-muted text-transparent sm:h-9 sm:w-20",
              )}
            >
              {loading ? "…" : value}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
