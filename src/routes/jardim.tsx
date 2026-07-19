import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Flower2,
  HeartHandshake,
  Leaf,
  LogIn,
  MessageCircleHeart,
  Sparkles,
  Sprout,
  TreeDeciduous,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";

/* O jogo 3D (three.js) só é baixado quando o jogador clica em "Jogar". */
const ArvoreDaEsperanca = lazy(() => import("@/components/ArvoreDaEsperanca"));

const JARDIM_DESCRIPTION =
  "Jogue o Jogo Jardim da Esperança: o jogo gratuito do Ajude Alguém Online. Cuide de um jardim virtual em tempo real, em comunidade, e veja a solidariedade florescer.";

export const Route = createFileRoute("/jardim")({
  head: () => ({
    meta: [
      { title: `Jogo Jardim da Esperança — ${SITE_NAME}` },
      { name: "description", content: JARDIM_DESCRIPTION },
      ...buildDefaultOgMeta({
        title: `Jogo Jardim da Esperança — ${SITE_NAME}`,
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
  const [playing, setPlaying] = useState(false);
  /* Começa falso no servidor e no 1º paint do cliente — evita mismatch de hidratação
     (antes lia window no render e o banner só aparecia no cliente). */
  const [isLocalTest, setIsLocalTest] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocalTest(host === "localhost" || host === "127.0.0.1");
  }, []);

  /* O jardim compartilhado exige uma conta ativa em qualquer ambiente. Assim ninguém
     entra como "Visitante" com botões que parecem funcionar, mas são recusados pelo banco. */
  const handlePlay = () => {
    if (loading) return;
    if (!user) {
      try {
        sessionStorage.setItem("jardim_autoplay", "1");
      } catch {
        /* noop */
      }
      void navigate({ to: "/auth", search: { redirect: "/jardim" } });
      return;
    }
    setPlaying(true);
  };

  /* Depois do login, abre o jogo sozinho se o usuário veio do botão Entrar para jogar. */
  useEffect(() => {
    if (loading || !user || playing) return;
    try {
      if (sessionStorage.getItem("jardim_autoplay") !== "1") return;
      sessionStorage.removeItem("jardim_autoplay");
      setPlaying(true);
    } catch {
      /* noop */
    }
  }, [loading, playing, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {isLocalTest && (
        <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          Ambiente de TESTE local. Entre com sua conta para testar os cuidados, o chat e o
          multiplayer com seu perfil real.
        </div>
      )}

      {playing && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] grid place-items-center bg-black">
              <div className="text-center text-white">
                <Sprout className="mx-auto h-10 w-10 animate-pulse" aria-hidden />
                <p className="mt-3 text-sm font-medium">Preparando o jardim…</p>
              </div>
            </div>
          }
        >
          <ArvoreDaEsperanca onClose={() => setPlaying(false)} />
        </Suspense>
      )}

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
            Jogo gratuito · {SITE_NAME}
          </span>

          <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-3xl gradient-warm text-primary-foreground shadow-warm">
            <Sprout className="h-10 w-10" aria-hidden />
          </div>

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-primary">
            O jogo da comunidade
          </p>

          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Jogo Jardim da Esperança
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Este é um <strong className="font-semibold text-foreground">jogo</strong> — gratuito,
            sem anúncios e feito para jogar junto. Cuide de um jardim vivo em tempo real com a
            comunidade do {SITE_NAME}: regue, pode e proteja as mudas, converse com outras pessoas e
            veja cada gesto de carinho virar flor.
          </p>

          <div className="mx-auto mt-5 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-primary/15 bg-primary/[0.06] px-5 py-3.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <Sprout className="h-3.5 w-3.5" aria-hidden />
              Jogo aberto · em constante evolução
            </span>
            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
              O jogo já está aberto — entre e jogue agora. Como toda planta viva, o jardim segue
              crescendo: novas surpresas e melhorias chegam com carinho a cada semana.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              onClick={handlePlay}
              className="gradient-warm text-primary-foreground shadow-warm"
            >
              {user || loading ? (
                <Leaf className="mr-1.5 h-5 w-5" aria-hidden />
              ) : (
                <LogIn className="mr-1.5 h-5 w-5" aria-hidden />
              )}
              {user || loading ? "Jogar agora" : "Entrar para jogar"}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/campanhas">
                Ver campanhas <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {!loading && !user
              ? "Gratuito e sem anúncios. Entre com sua conta para cuidar do jardim com seu nome."
              : "Gratuito e sem anúncios. O jardim é da comunidade — cuide dele com seu nome."}
          </p>
        </section>

        <section className="mt-16" aria-labelledby="como-floresce-heading">
          <div className="mb-8 text-center">
            <h2
              id="como-floresce-heading"
              className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              Como o jogo floresce?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Nada de moedas ou compras: o Jogo Jardim da Esperança cresce com gentileza de verdade.
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
                Acreditamos que ajudar faz bem — e merece ser celebrado. O Jogo Jardim da Esperança é
                um jogo leve e bonito para ver o impacto dos seus gestos: enquanto você apoia
                campanhas e espalha carinho pela comunidade do {SITE_NAME}, seu jardim registra essa
                história em flores. É gratuito, sem anúncios dentro do jogo e sem qualquer relação
                com as doações, que continuam indo 100% direto para o beneficiário.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
