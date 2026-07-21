import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Droplets,
  Flower2,
  Leaf,
  LogIn,
  MessageCircleHeart,
  Sparkles,
  Sprout,
  TreeDeciduous,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccessJardim, JARDIM_PUBLIC_OPEN } from "@/lib/local-preview";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";
import { JardimArtBanner } from "@/components/JardimArtBanner";

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
    icon: Sprout,
    title: "Entre de graça",
    text: "Faça login com sua conta do site. O jogo é 100% gratuito, sem anúncios e sem compras.",
  },
  {
    icon: Droplets,
    title: "Cuide do jardim",
    text: "Regue, pode e proteja as mudas num jardim 3D vivo que muda em tempo real.",
  },
  {
    icon: MessageCircleHeart,
    title: "Converse e jogue junto",
    text: "O jardim é da comunidade: converse com outras pessoas enquanto cuidam juntos.",
  },
  {
    icon: TreeDeciduous,
    title: "Veja a esperança florescer",
    text: "Apoie campanhas e espalhe carinho — cada gesto ajuda o jardim a ficar mais vivo.",
  },
];

function JardimPortal() {
  const [playing, setPlaying] = useState(false);
  /* Começa falso no servidor e no 1º paint do cliente — evita mismatch de hidratação
     (antes lia window no render e o banner só aparecia no cliente). */
  const [isLocalTest, setIsLocalTest] = useState(false);
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  /* Botão do site sempre visível (SHOW_JARDIM). Fechado = só o e-mail dono. */
  const canPlay = canAccessJardim(user, isAdmin);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocalTest(host === "localhost" || host === "127.0.0.1");
    /* Limpa flag antiga que abria o jogo (e a música) sem clicar em Jogar. */
    try {
      sessionStorage.removeItem("jardim_autoplay");
    } catch {
      /* noop */
    }
  }, []);

  /* O jardim compartilhado exige conta. Enquanto fechado ao público, só admin joga. */
  const handlePlay = () => {
    if (loading) return;
    if (!canPlay) return;
    if (!user) {
      void navigate({ to: "/auth", search: { redirect: "/jardim" } });
      return;
    }
    setPlaying(true);
  };

  const playLabel = !JARDIM_PUBLIC_OPEN && !canPlay
    ? "Fechado por enquanto"
    : !user && !loading
      ? "Entrar para jogar"
      : canPlay
        ? "Jogar agora"
        : "Fechado por enquanto";

  const playLabelSecondary = !JARDIM_PUBLIC_OPEN && !canPlay
    ? "Fechado por enquanto"
    : !user && !loading
      ? "Entrar e jogar de graça"
      : canPlay
        ? "Começar a jogar"
        : "Fechado por enquanto";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {isLocalTest && (
        <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          Ambiente de TESTE local. Entre com sua conta admin para jogar enquanto o jardim
          está fechado ao público.
        </div>
      )}

      {!JARDIM_PUBLIC_OPEN && (
        <div className="border-b border-amber-500/35 bg-amber-500/12 px-4 py-3 text-center text-sm font-medium text-foreground">
          {canPlay ? (
            <>
              O Jogo Jardim da Esperança está <strong>fechado por enquanto</strong> para o
              público. Sua conta pode jogar normalmente.
            </>
          ) : (
            <>
              O Jogo Jardim da Esperança está <strong>fechado por enquanto</strong> para
              melhorias. Em breve volta para todo mundo.
            </>
          )}
        </div>
      )}

      {playing && canPlay && (
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
        <section className="relative mt-8 overflow-hidden rounded-[1.75rem] shadow-warm sm:mt-12">
          <div className="relative aspect-[16/11] min-h-[300px] w-full sm:aspect-[21/9] sm:min-h-[340px]">
            <JardimArtBanner className="absolute inset-0 h-full w-full" />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[oklch(0.2_0.05_162_/_0.94)] via-[oklch(0.26_0.06_162_/_0.58)] to-[oklch(0.35_0.05_162_/_0.22)]"
            />

            <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-8 text-center sm:px-10 sm:pb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {JARDIM_PUBLIC_OPEN
                  ? `Jogo gratuito · ${SITE_NAME}`
                  : "Fechado por enquanto · em breve volta"}
              </span>

              <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-primary-glow">
                O jogo da comunidade
              </p>

              <h1 className="fire-text mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
                Jogo Jardim da Esperança
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/88 sm:text-lg">
                Este é um <strong className="font-semibold text-white">jogo</strong> — gratuito,
                sem anúncios e feito para jogar junto. Cuide de um jardim vivo em tempo real:
                regue, pode e proteja as mudas, converse com outras pessoas e veja cada gesto de
                carinho virar flor.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={handlePlay}
                  disabled={!canPlay}
                  className="gradient-warm text-primary-foreground shadow-warm disabled:opacity-70"
                >
                  {canPlay && (user || loading) ? (
                    <Leaf className="mr-1.5 h-5 w-5" aria-hidden />
                  ) : canPlay ? (
                    <LogIn className="mr-1.5 h-5 w-5" aria-hidden />
                  ) : (
                    <Sprout className="mr-1.5 h-5 w-5" aria-hidden />
                  )}
                  {playLabel}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link to="/campanhas">
                    Ver campanhas <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>

              <p className="mt-4 text-xs font-medium text-white/75">
                {!JARDIM_PUBLIC_OPEN && !canPlay
                  ? "Fechado por enquanto para melhorias. Em breve volta."
                  : !loading && !user
                    ? "100% gratuito. Entre com sua conta para cuidar do jardim com seu nome."
                    : "100% gratuito e sem anúncios. O jardim é da comunidade — cuide dele com seu nome."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="como-floresce-heading">
          <div className="mb-8 text-center">
            <h2
              id="como-floresce-heading"
              className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              Como funciona?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Cuide das mudas, ganhe moedas e veja o jardim crescer com a comunidade.
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
                Acreditamos que ajudar faz bem — e merece ser celebrado. O Jogo Jardim da Esperança
                é um jogo leve e bonito para ver o impacto dos seus gestos: enquanto você apoia
                campanhas e espalha carinho pela comunidade do {SITE_NAME}, seu jardim registra essa
                história em flores. É gratuito, sem anúncios dentro do jogo e sem qualquer relação
                com as doações, que continuam indo 100% direto para o beneficiário.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={handlePlay}
                disabled={!canPlay}
                className="mt-6 gradient-warm text-primary-foreground shadow-warm disabled:opacity-70"
              >
                {canPlay && (user || loading) ? (
                  <Leaf className="mr-1.5 h-5 w-5" aria-hidden />
                ) : canPlay ? (
                  <LogIn className="mr-1.5 h-5 w-5" aria-hidden />
                ) : (
                  <Sprout className="mr-1.5 h-5 w-5" aria-hidden />
                )}
                {playLabelSecondary}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
