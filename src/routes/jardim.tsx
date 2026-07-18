import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Flower2,
  HeartHandshake,
  Leaf,
  MessageCircleHeart,
  Sparkles,
  Sprout,
  TreeDeciduous,
  Users,
} from "lucide-react";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";

const JARDIM_DESCRIPTION =
  "Conheça o Jardim da Esperança, o novo jogo do Ajude Alguém Online: um jardim virtual que cresce e floresce com os gestos de solidariedade da comunidade.";

export const Route = createFileRoute("/jardim")({
  head: () => ({
    meta: [
      { title: `Jardim da Esperança — ${SITE_NAME}` },
      { name: "description", content: JARDIM_DESCRIPTION },
      ...buildDefaultOgMeta({
        title: `Jardim da Esperança — ${SITE_NAME}`,
        description: JARDIM_DESCRIPTION,
        path: "/jardim",
        includeImage: false,
      }),
    ],
    links: [canonicalHeadLink("/jardim")],
  }),
  component: JardimPortal,
});

const HOW_IT_GROWS: { icon: typeof Sprout; title: string; text: string }[] = [
  {
    icon: MessageCircleHeart,
    title: "Apoie com palavras",
    text: "Comentários e corações deixados nas campanhas ajudam seu jardim a brotar.",
  },
  {
    icon: HeartHandshake,
    title: "Ajude campanhas",
    text: "Cada campanha que você apoia e compartilha faz novas flores nascerem.",
  },
  {
    icon: Users,
    title: "Cresça em comunidade",
    text: "O jardim é de todos: os gestos de cada pessoa deixam ele mais bonito e vivo.",
  },
  {
    icon: TreeDeciduous,
    title: "Veja a esperança florescer",
    text: "Acompanhe seu cantinho verde evoluir de um broto a um jardim cheio de vida.",
  },
];

function JardimPortal() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-primary/[0.14] p-8 text-center shadow-soft sm:mt-14 sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Novidade no {SITE_NAME}
          </span>

          <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-3xl gradient-warm text-primary-foreground shadow-warm">
            <Sprout className="h-10 w-10" aria-hidden />
          </div>

          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Jardim da Esperança
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Um jardim virtual que floresce com a solidariedade. Aqui, cada gesto de apoio na vida
            real — um comentário de carinho, um coração, uma campanha ajudada — vira uma semente que
            faz o jardim da comunidade crescer.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              disabled
              className="gradient-warm text-primary-foreground shadow-warm"
            >
              <Leaf className="mr-1.5 h-5 w-5" aria-hidden />
              Jogar (em breve)
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/campanhas">
                Ver campanhas <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs font-medium text-muted-foreground">
            O jogo está em fase final de preparação. Em breve você poderá plantar sua primeira
            semente!
          </p>
        </section>

        <section className="mt-16" aria-labelledby="como-floresce-heading">
          <div className="mb-8 text-center">
            <h2
              id="como-floresce-heading"
              className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              Como o jardim floresce?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Nada de moedas ou compras: o Jardim da Esperança cresce com gentileza de verdade.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_GROWS.map(({ icon: Icon, title, text }) => (
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

        <section className="mt-16 mb-20 rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.05] p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-warm text-primary-foreground shadow-warm">
              <Flower2 className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Por que um jogo em um site de solidariedade?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Acreditamos que ajudar faz bem — e merece ser celebrado. O Jardim da Esperança é uma
                forma leve e bonita de ver o impacto dos seus gestos: enquanto você apoia campanhas
                e espalha carinho pela comunidade do {SITE_NAME}, seu jardim registra essa história
                em flores. É gratuito, sem anúncios dentro do jogo e sem qualquer relação com as
                doações, que continuam indo 100% direto para o beneficiário.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
