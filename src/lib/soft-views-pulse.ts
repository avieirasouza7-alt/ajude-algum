import { supabase } from "@/integrations/supabase/client";

const PULSE_KEY = "aa-soft-view-pulse";
const PULSE_COOLDOWN_MS = 4 * 60 * 1000; // no máximo 1 chamada a cada 4 min por navegador

/**
 * Disparo discreto do incremento suave.
 * A própria função no banco limita: poucas campanhas por vez, 3/2h, intervalo mínimo.
 * Assim funciona mesmo se o cron do Cloudflare não tiver a service role.
 */
export function pulseSoftCampaignViews() {
  if (typeof window === "undefined") return;

  try {
    const last = Number(sessionStorage.getItem(PULSE_KEY) ?? "0");
    if (Date.now() - last < PULSE_COOLDOWN_MS) return;
    sessionStorage.setItem(PULSE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }

  void supabase.rpc("tick_soft_campaign_views").then(({ error }) => {
    if (error) console.warn("[soft-views-pulse]", error.message);
  });
}
