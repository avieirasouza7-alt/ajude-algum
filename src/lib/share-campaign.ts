import { SITE_NAME, absoluteSiteUrl } from "@/lib/site-meta";

export function campaignSharePath(slug: string) {
  return `/campanha/${slug}`;
}

export function campaignShareUrl(slug: string) {
  return absoluteSiteUrl(campaignSharePath(slug));
}

export function buildCampaignShareMessage(title: string, url: string) {
  return `💙 Ajude a campanha "${title}" no ${SITE_NAME}\n\n${url}`;
}

export function shareOnWhatsApp(message: string) {
  window.open(
    `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareOnFacebook(url: string) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    "_blank",
    "noopener,noreferrer,width=640,height=720",
  );
}

/** Instagram não tem link de compartilhamento web; usa menu nativo ou copia o link. */
export async function shareOnInstagram(
  url: string,
  title: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const message = buildCampaignShareMessage(title, url);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      // Texto sem URL duplicada — o campo `url` já leva o link.
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
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function copyCampaignShare(url: string, title: string): Promise<"copied" | "failed"> {
  const message = buildCampaignShareMessage(title, url);
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
