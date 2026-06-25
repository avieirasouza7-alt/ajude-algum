import { SITE_NAME } from "@/lib/site-meta";

export function buildCampaignShareMessage(title: string, url: string) {
  return `Ajude a campanha "${title}" no ${SITE_NAME}: ${url}`;
}

export function shareOnWhatsApp(message: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
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
): Promise<"shared" | "copied" | "failed"> {
  const message = buildCampaignShareMessage(title, url);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text: message, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
}
