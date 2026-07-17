import { SITE_NAME, absoluteSiteUrl, getPublicSiteUrl } from "@/lib/site-meta";

export function campaignSharePath(slug: string) {
  const cleanSlug = slug.trim().replace(/^\/+|\/+$/g, "");
  return `/campanha/${cleanSlug}`;
}

export function campaignShareUrl(slug: string) {
  const path = campaignSharePath(slug);
  if (path === "/campanha/") {
    throw new Error("Campanha sem slug para compartilhar");
  }
  return absoluteSiteUrl(path);
}

export function buildCampaignShareMessage(title: string, url: string) {
  return `💙 Ajude a campanha "${title}" no ${SITE_NAME}\n\n${url}`;
}

function openExternalUrl(url: string) {
  const win = window.open(url, "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
    return;
  }
  // Popup bloqueado: navega na mesma aba
  window.location.assign(url);
}

/**
 * URL pública https absoluta para o Facebook.
 * Nunca envia localhost — o Face responde "href should represent a valid URL".
 */
export function toFacebookShareUrl(url: string) {
  const publicOrigin = getPublicSiteUrl();

  let absolute: URL;
  try {
    absolute = new URL(url, publicOrigin);
  } catch {
    absolute = new URL(absoluteSiteUrl(url.startsWith("/") ? url : `/${url}`));
  }

  const host = absolute.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (isPrivate || absolute.protocol === "http:") {
    const path = `${absolute.pathname}${absolute.search}${absolute.hash}` || "/";
    absolute = new URL(path, `${publicOrigin}/`);
  }

  absolute.protocol = "https:";
  absolute.hash = "";

  // Remove espaços acidentais / aspas do .env
  const href = absolute
    .toString()
    .trim()
    .replace(/^["']|["']$/g, "");
  if (
    !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?\//i.test(href) &&
    !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(href)
  ) {
    throw new Error("URL de compartilhamento inválida");
  }

  return href;
}

export function shareOnWhatsApp(message: string) {
  openExternalUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`);
}

/**
 * Compartilha no Facebook.
 * A UI nova do Face valida o parâmetro `href` — enviar só `u=` causa
 * "href should represent a valid URL" em vários navegadores (ex.: Opera).
 */
export function shareOnFacebook(url: string) {
  const shareTarget = toFacebookShareUrl(url);

  const fb = new URL("https://www.facebook.com/sharer/sharer.php");
  fb.searchParams.set("u", shareTarget);
  fb.searchParams.set("href", shareTarget);
  fb.searchParams.set("display", "popup");
  fb.searchParams.set("ref", "plugin");
  fb.searchParams.set("src", "share_button");

  openExternalUrl(fb.toString());
}

/** Instagram não tem link de compartilhamento web; usa menu nativo ou copia o link. */
export async function shareOnInstagram(
  url: string,
  title: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const message = buildCampaignShareMessage(title, url);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: `💙 Ajude a campanha "${title}" no ${SITE_NAME}`,
        url,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    try {
      await navigator.clipboard.writeText(message);
      return "copied";
    } catch {
      return "failed";
    }
  }
}

export async function copyCampaignShare(
  url: string,
  _title?: string,
): Promise<"copied" | "failed"> {
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
