import { supabase } from "@/integrations/supabase/client";
import { shouldCountPublicAnalytics } from "@/lib/analytics-guard";

const VIEW_KEY_PREFIX = "aa-campaign-view:";

/** Registra uma visualização por sessão do navegador (evita inflar ao atualizar a página). */
export async function trackCampaignView(campaignId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!(await shouldCountPublicAnalytics())) return false;

  const key = `${VIEW_KEY_PREFIX}${campaignId}`;
  if (sessionStorage.getItem(key)) return false;

  const { error } = await supabase.rpc("increment_campaign_views", {
    p_campaign_id: campaignId,
  });
  if (error) return false;

  sessionStorage.setItem(key, "1");
  return true;
}

export function formatViewCount(views: number): string {
  return views.toLocaleString("pt-BR");
}
