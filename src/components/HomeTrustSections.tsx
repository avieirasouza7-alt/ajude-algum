import type { LucideIcon } from "lucide-react";
import {
  Heart,
  HeartHandshake,
  MapPin,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
  BadgeCheck,
  Gift,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site-meta";

const fadeClass =
  "animate-section-fade motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0";

export function HomeTrustBanner() {
  return (
    <section className={cn("mt-10 sm:mt-12", fadeClass)} aria-labelledby="trust-banner-heading">
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
    </section>
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
  peopleHelped: string;
  donors: string;
  states: string;
};

export function HomeStatsStrip({ stats }: { stats: HomeStatsDisplay }) {
  const items = [
    { icon: Heart, label: "Campanhas publicadas", value: stats.campaigns },
    { icon: Users, label: "Pessoas ajudadas", value: stats.peopleHelped },
    { icon: HeartHandshake, label: "Doadores", value: stats.donors },
    { icon: MapPin, label: "Estados atendidos", value: stats.states },
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
          Indicadores da plataforma — valores sem dados suficientes aparecem como --.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-warm sm:px-5 sm:py-6"
          >
            <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden />
            <p className="mt-3 font-display text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
