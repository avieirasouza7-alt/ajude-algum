import { supabase } from "@/integrations/supabase/client";
import { formatViewCount } from "@/lib/campaign-views";

const SITE_VISIT_KEY = "aa-site-visit";
const SITE_SESSION_KEY = "aa-site-session";

export type SiteVisitStats = {
  totalVisits: number;
  activeNow: number;
};

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SITE_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SITE_SESSION_KEY, id);
  }
  return id;
}

/** Registra uma visita ao site por sessão (páginas públicas). */
export async function trackSiteVisit(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SITE_VISIT_KEY)) return false;

  const { error } = await supabase.rpc("increment_site_visit");
  if (error) return false;

  sessionStorage.setItem(SITE_VISIT_KEY, "1");
  return true;
}

/** Sinal de presença para contagem em tempo real (online agora). */
export async function pulseSiteVisit(): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;
  await supabase.rpc("pulse_site_visit", { p_session_id: sessionId });
}

export async function fetchSiteVisitStats(): Promise<SiteVisitStats> {
  const { data, error } = await supabase.rpc("get_site_visit_stats");
  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalVisits: Number(row?.total_visits ?? 0),
      activeNow: Number(row?.active_now ?? 0),
    };
  }

  const { data: row } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "visit_stats")
    .maybeSingle();
  const value = row?.value as { total_visits?: number } | undefined;
  return {
    totalVisits: value?.total_visits ?? 0,
    activeNow: 0,
  };
}

export { formatViewCount };
