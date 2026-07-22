import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { BibliaOpeningIntro } from "@/components/BibliaOpeningIntro";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";
import {
  buildBibliaEmbedSrc,
  isAllowedBibliaEmbedUrl,
  resolveBibliaEmbedUrl,
} from "@/lib/biblia-embed";

const DESCRIPTION =
  "Bíblia Virtual do Ajude Alguém Online: versículo do dia, roda da esperança, promessas, orações e uma palavra de esperança para cada momento.";

const EMBED_LOAD_TIMEOUT_MS = 18_000;

export const Route = createFileRoute("/biblia-virtual")({
  head: () => ({
    meta: [
      { title: `Bíblia Virtual — ${SITE_NAME}` },
      { name: "description", content: DESCRIPTION },
      ...buildDefaultOgMeta({
        title: `Bíblia Virtual — ${SITE_NAME}`,
        description: DESCRIPTION,
        path: "/biblia-virtual",
        includeImage: false,
      }),
    ],
    links: [canonicalHeadLink("/biblia-virtual")],
  }),
  component: BibliaVirtualPage,
});

/**
 * Bíblia Virtual dentro do site.
 * Segurança: só carrega origens da allowlist (nunca Torreflux / Play Store / outra porta).
 * Abertura cinematográfica antes do embed.
 */
function BibliaVirtualPage() {
  const embedBase = resolveBibliaEmbedUrl();
  const embedSrc = buildBibliaEmbedSrc(embedBase);
  const safe = isAllowedBibliaEmbedUrl(embedBase);
  const [introDone, setIntroDone] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);
  const loadedRef = useRef(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    if (!introDone || !safe || embedFailed) return;
    loadedRef.current = false;
    const timer = window.setTimeout(() => {
      if (!loadedRef.current) setEmbedFailed(true);
    }, EMBED_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [introDone, safe, embedFailed, embedKey]);

  const retryEmbed = () => {
    loadedRef.current = false;
    setEmbedFailed(false);
    setEmbedKey((k) => k + 1);
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0a1228]">
      {!introDone ? <BibliaOpeningIntro onDone={finishIntro} durationMs={5800} /> : null}

      <div
        className={
          introDone
            ? "flex min-h-dvh flex-col opacity-100 transition-opacity duration-700"
            : "pointer-events-none flex min-h-dvh flex-col opacity-0"
        }
        aria-hidden={!introDone}
      >
        <Header />
        <div className="flex items-center gap-3 border-b border-border/60 bg-card/80 px-3 py-2 sm:px-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao site
          </Link>
          <p className="truncate text-sm text-muted-foreground">Bíblia Virtual · {SITE_NAME}</p>
        </div>
        {!safe ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-lg font-bold text-foreground">
              Embed da Bíblia bloqueado por segurança
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              A URL configurada não é a Bíblia Virtual oficial. Outros jogos ou apps (incluindo da
              Play Store) não podem ser incorporados neste site.
            </p>
          </div>
        ) : embedFailed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-lg font-bold text-foreground">
              A Bíblia Virtual não carregou
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Pode ser conexão lenta ou o serviço temporariamente indisponível. Tente de novo.
            </p>
            <button
              type="button"
              onClick={retryEmbed}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Tentar novamente
            </button>
          </div>
        ) : (
          <iframe
            key={embedKey}
            title="Bíblia Virtual"
            src={embedSrc}
            className="min-h-0 w-full flex-1 border-0 bg-[#0f1b3d]"
            allow="autoplay; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            loading="eager"
            onLoad={() => {
              loadedRef.current = true;
            }}
          />
        )}
      </div>
    </div>
  );
}
