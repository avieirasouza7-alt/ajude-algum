import { supabase } from "@/integrations/supabase/client";
import { shouldCountPublicAnalytics } from "@/lib/analytics-guard";
import { trackGaEvent } from "@/lib/analytics";

const SESSION_KEY = "aa-site-session";
const LAST_PAGE_KEY = "aa-analytics-last-page";
const LAST_PAGE_AT_KEY = "aa-analytics-last-page-at";

export type AnalyticsEventType =
  | "page_view"
  | "page_leave"
  | "campaign_view"
  | "pix_copy"
  | "share_whatsapp"
  | "share_facebook"
  | "share_instagram";

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function parseReferrerSource(referrer: string): string {
  const raw = referrer.trim();
  if (!raw) return "Direto";

  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("google.")) return "Google";
    if (host.includes("facebook.") || host === "fb.com" || host === "m.facebook.com")
      return "Facebook";
    if (host.includes("instagram.")) return "Instagram";
    if (host.includes("whatsapp.") || host === "wa.me" || host === "l.wl.co") return "WhatsApp";
    if (host.includes("twitter.") || host === "t.co" || host === "x.com") return "X / Twitter";
    if (host.includes("bing.")) return "Bing";
    if (host.includes("yahoo.")) return "Yahoo";
    if (host.includes("linkedin.")) return "LinkedIn";
    if (host.includes("tiktok.")) return "TikTok";
    return host;
  } catch {
    return "Outro";
  }
}

function labelForPath(path: string): string {
  if (path === "/") return "Página inicial";
  if (path === "/campanhas") return "Lista de campanhas";
  if (path === "/sobre") return "Sobre";
  if (path.startsWith("/campanha/")) return "Campanha";
  if (path === "/auth") return "Login";
  return path;
}

export async function recordSiteAnalyticsEvent(input: {
  eventType: AnalyticsEventType;
  pagePath?: string;
  campaignSlug?: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  if (!(await shouldCountPublicAnalytics())) return;

  const sessionId = getAnalyticsSessionId();
  if (!sessionId) return;

  const pagePath = input.pagePath ?? window.location.pathname;
  const referrer = document.referrer || "";
  const referrerSource = parseReferrerSource(referrer);

  const { error } = await supabase.rpc("record_site_analytics_event", {
    p_session_id: sessionId,
    p_event_type: input.eventType,
    p_page_path: pagePath,
    p_referrer: referrer || null,
    p_referrer_source: referrerSource,
    p_campaign_slug: input.campaignSlug ?? null,
    p_duration_seconds: input.durationSeconds ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) console.warn("[analytics]", error.message);

  if (input.eventType === "page_view") {
    trackGaEvent("page_view", {
      page_path: pagePath,
      page_title: labelForPath(pagePath),
      referrer_source: referrerSource,
    });
  } else if (input.eventType !== "page_leave") {
    trackGaEvent(input.eventType, {
      page_path: pagePath,
      campaign_slug: input.campaignSlug,
      ...input.metadata,
    });
  }
}

export function trackAnalyticsPageView(pathname: string) {
  void (async () => {
    if (!(await shouldCountPublicAnalytics())) return;

    const prev = sessionStorage.getItem(LAST_PAGE_KEY);
    const prevAt = sessionStorage.getItem(LAST_PAGE_AT_KEY);
    if (prev && prevAt) {
      const duration = Math.round((Date.now() - Number(prevAt)) / 1000);
      if (duration >= 2 && duration <= 7200) {
        await recordSiteAnalyticsEvent({
          eventType: "page_leave",
          pagePath: prev,
          durationSeconds: duration,
        });
      }
    }

    const campaignSlug = pathname.startsWith("/campanha/")
      ? pathname.slice("/campanha/".length).split("/")[0]
      : undefined;

    await recordSiteAnalyticsEvent({
      eventType: "page_view",
      pagePath: pathname,
      campaignSlug,
    });

    if (campaignSlug) {
      await recordSiteAnalyticsEvent({
        eventType: "campaign_view",
        pagePath: pathname,
        campaignSlug,
      });
    }

    sessionStorage.setItem(LAST_PAGE_KEY, pathname);
    sessionStorage.setItem(LAST_PAGE_AT_KEY, String(Date.now()));
  })();
}

export function trackPixCopy(campaignSlug: string) {
  void recordSiteAnalyticsEvent({
    eventType: "pix_copy",
    campaignSlug,
    metadata: { action: "copy_pix" },
  });
}

export function trackShare(channel: "whatsapp" | "facebook" | "instagram", campaignSlug: string) {
  const map = {
    whatsapp: "share_whatsapp",
    facebook: "share_facebook",
    instagram: "share_instagram",
  } as const;
  void recordSiteAnalyticsEvent({
    eventType: map[channel],
    campaignSlug,
    metadata: { channel },
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins} min ${secs}s` : `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}min` : `${hours}h`;
}

export function labelAnalyticsPath(path: string): string {
  return labelForPath(path);
}

export const ANALYTICS_EVENT_LABELS: Record<string, string> = {
  pix_copy: "Chave PIX copiada",
  share_whatsapp: "Compartilhar no WhatsApp",
  share_facebook: "Compartilhar no Facebook",
  share_instagram: "Compartilhar no Instagram",
  campaign_view: "Visualização de campanha",
};
