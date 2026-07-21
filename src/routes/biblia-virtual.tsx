import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";
import { BIBLIA_EMBED_URL } from "@/lib/local-preview";

const DESCRIPTION =
  "Bíblia Virtual do Ajude Alguém Online: versículo do dia, roda da esperança, promessas, orações e uma palavra de esperança para cada momento.";

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
 * Bíblia Virtual dentro do site (mesma URL ajudealguemonline.com.br).
 * O app é incorporado em tela cheia abaixo do cabeçalho.
 */
function BibliaVirtualPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
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
      <iframe
        title="Bíblia Virtual"
        src={`${BIBLIA_EMBED_URL}${BIBLIA_EMBED_URL.includes("?") ? "&" : "?"}embed=1`}
        className="min-h-0 w-full flex-1 border-0 bg-[#0f1b3d]"
        allow="autoplay; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
