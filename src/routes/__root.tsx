import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../styles.css";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { AdSenseScript } from "@/components/AdSenseScript";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SiteVisitTracker } from "@/components/SiteVisitTracker";
import { getAdSenseEnv } from "@/lib/adsense";
import {
  buildDefaultOgMeta,
  metaOgShareImageUrl,
  OG_SHARE_IMAGE_HEIGHT,
  OG_SHARE_IMAGE_WIDTH,
  SITE_NAME,
} from "@/lib/site-meta";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi removida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-warm px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error("Root error boundary", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md gradient-warm px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const adsense = getAdSenseEnv();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: `${SITE_NAME} — Plataforma de vaquinhas solidárias` },
        {
          name: "description",
          content:
            "Crie ou apoie campanhas de arrecadação via PIX. Transformando histórias com a força da comunidade.",
        },
        { name: "theme-color", content: "#047857" },
        ...(adsense.clientId && adsense.enabled
          ? [{ name: "google-adsense-account", content: adsense.clientId }]
          : []),
        { property: "og:site_name", content: SITE_NAME },
        ...buildDefaultOgMeta({ includeImage: false }),
      ],
      links: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { rel: "icon", href: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const shareImage = metaOgShareImageUrl();
  const shareImageAlt = `Pessoas unidas em solidariedade — ${SITE_NAME}`;
  return (
    <html lang="pt-BR">
      <head>
        <meta property="og:image" content={shareImage} />
        <meta property="og:image:secure_url" content={shareImage} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content={String(OG_SHARE_IMAGE_WIDTH)} />
        <meta property="og:image:height" content={String(OG_SHARE_IMAGE_HEIGHT)} />
        <meta property="og:image:alt" content={shareImageAlt} />
        <meta name="twitter:image" content={shareImage} />
        <meta name="twitter:image:alt" content={shareImageAlt} />
        <HeadContent />
        {/* AdSense só no cliente (AdSenseScript) — script no SSR injeta <ins> e quebra a hidratação. */}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleAnalytics />
        <SiteVisitTracker />
        <AdSenseScript />
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
