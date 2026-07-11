const DEFAULT_SITE_URL = "https://ajudealguemonline.com.br";

/** Nome exibido no topo, rodapé e metadados do site. */
export const SITE_NAME = "Ajude Alguém Online";

export const SITE_EMAIL_DOMAIN = "ajudealguemonline.com.br";

/** E-mails públicos exibidos no site (encaminhados via Cloudflare Email Routing). */
export const SITE_CONTACT_EMAILS = [
  {
    label: "Contato geral",
    address: `contato@${SITE_EMAIL_DOMAIN}`,
    subject: "Contato — Ajude Alguém Online",
  },
  {
    label: "Suporte",
    address: `suporte@${SITE_EMAIL_DOMAIN}`,
    subject: "Suporte — Ajude Alguém Online",
  },
  {
    label: "Equipe",
    address: `equipe@${SITE_EMAIL_DOMAIN}`,
    subject: "Equipe — Ajude Alguém Online",
  },
] as const;

export function mailtoContactUrl(address: string, subject?: string) {
  if (!subject) return `mailto:${address}`;
  return `mailto:${address}?subject=${encodeURIComponent(subject)}`;
}

/** URL pública do site (Open Graph, WhatsApp, sitemap). */
export function getPublicSiteUrl() {
  const raw = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

export function absoluteSiteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteUrl()}${normalized}`;
}

export function metaAbsoluteUrl(path = "/") {
  return absoluteSiteUrl(path);
}

export function metaOgShareImageUrl() {
  return getOgShareImageUrl();
}

export function canonicalHeadLink(path = "/") {
  return { rel: "canonical" as const, href: metaAbsoluteUrl(path) };
}

/** Imagem estável para Facebook/WhatsApp/X (não usar /assets/ com hash). */
export const OG_SHARE_IMAGE_PATH = "/share.jpg";
export const OG_SHARE_IMAGE_WIDTH = 1200;
export const OG_SHARE_IMAGE_HEIGHT = 630;
/** Incremente ao trocar a imagem para o X/Facebook buscarem de novo. */
export const OG_SHARE_IMAGE_VERSION = "20260710d";

/** Texto padrão para Facebook/WhatsApp (preview e página /compartilhar.html). */
export const OG_SHARE_TITLE = "Precisa de ajuda ou conhece alguém que precisa?";
export const OG_SHARE_DESCRIPTION =
  "No Ajude Alguém Online, qualquer pessoa pode criar uma campanha gratuitamente e receber doações diretamente no PIX. Conheça as campanhas publicadas e faça a diferença.";

export function getOgShareImageUrl() {
  return `${absoluteSiteUrl(OG_SHARE_IMAGE_PATH)}?v=${OG_SHARE_IMAGE_VERSION}`;
}

export function absoluteAssetUrl(assetPath: string) {
  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${getPublicSiteUrl()}${normalized}`;
}

export function buildOgImageMeta(imageUrl = getOgShareImageUrl()) {
  return [
    { property: "og:image", content: imageUrl },
    { property: "og:image:secure_url", content: imageUrl },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: String(OG_SHARE_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_SHARE_IMAGE_HEIGHT) },
    {
      property: "og:image:alt",
      content: `Pessoas unidas em solidariedade — ${SITE_NAME}`,
    },
  ];
}

export function buildDefaultOgMeta(options?: {
  title?: string;
  description?: string;
  path?: string;
  includeImage?: boolean;
}) {
  const title = options?.title ?? `${SITE_NAME} — Vaquinhas solidárias`;
  const description =
    options?.description ??
    "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência e o poder da comunidade.";
  const includeImage = options?.includeImage ?? true;
  const imageUrl = getOgShareImageUrl();

  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: metaAbsoluteUrl(options?.path ?? "/") },
    { property: "og:locale", content: "pt_BR" },
    ...(includeImage ? buildOgImageMeta(imageUrl) : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(includeImage
      ? [
          { name: "twitter:image", content: metaOgShareImageUrl() },
          {
            name: "twitter:image:alt",
            content: `Pessoas unidas em solidariedade — ${SITE_NAME}`,
          },
        ]
      : []),
  ];
}
