const DEFAULT_SITE_URL = "https://ajudealguemonline.com.br";

/** URL pública do site (Open Graph, WhatsApp, sitemap). */
export function getPublicSiteUrl() {
  const raw =
    (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

export function absoluteSiteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteUrl()}${normalized}`;
}

/** Imagem grande para compartilhar (WhatsApp, Facebook, etc.). */
export const OG_SHARE_IMAGE_PATH = "/og-share.jpg";
export const OG_SHARE_IMAGE_WIDTH = 1920;
export const OG_SHARE_IMAGE_HEIGHT = 1080;

export function getOgShareImageUrl() {
  return `${absoluteSiteUrl(OG_SHARE_IMAGE_PATH)}?v=3`;
}

export function buildDefaultOgMeta(options?: {
  title?: string;
  description?: string;
  path?: string;
}) {
  const title = options?.title ?? "Ajude Alguém — Vaquinhas solidárias";
  const description =
    options?.description ??
    "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência e o poder da comunidade.";
  const url = absoluteSiteUrl(options?.path ?? "/");
  const image = getOgShareImageUrl();

  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:image", content: image },
    { property: "og:image:secure_url", content: image },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: String(OG_SHARE_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_SHARE_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: "Pessoas unidas em solidariedade — Ajude Alguém" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}
