import { supabase } from "@/integrations/supabase/client";
import { formatViewCount } from "@/lib/campaign-views";

const SITE_VISIT_KEY = "aa-site-visit";

/** Registra uma visita ao site por sessão (páginas públicas). */
export async function trackSiteVisit(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SITE_VISIT_KEY)) return false;

  const { error } = await supabase.rpc("increment_site_visit");
  if (error) return false;

  sessionStorage.setItem(SITE_VISIT_KEY, "1");
  return true;
}

export async function fetchSiteVisitCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_site_visit_stats");
  if (error) {
    const { data: row } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "visit_stats")
      .maybeSingle();
    const value = row?.value as { total_visits?: number } | undefined;
    return value?.total_visits ?? 0;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return Number(row?.total_visits ?? 0);
}

export { formatViewCount };
