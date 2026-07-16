import { supabase } from "@/integrations/supabase/client";

const VIEW_KEY_PREFIX = "aa-campaign-view:";

type TrackCampaignViewOptions = {
  /** Usuário logado que está vendo (se houver). */
  viewerId?: string | null;
  /** Dono da campanha — visitas próprias não entram na contagem. */
  ownerId?: string | null;
};

/**
 * Registra uma visualização REAL.
 * - 1 vez por sessão do navegador + por visitante (anon ou user_id), para não inflar no F5
 * - Contas diferentes no mesmo navegador contam separadamente
 * - O dono da campanha não gera visualização
 * - Não mexe em soft_views (incremento discreto separado)
 */
export async function trackCampaignView(
  campaignId: string,
  options: TrackCampaignViewOptions = {},
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const viewerId = options.viewerId?.trim() || null;
  const ownerId = options.ownerId?.trim() || null;

  if (viewerId && ownerId && viewerId === ownerId) return false;

  const viewerKey = viewerId ?? "anon";
  const key = `${VIEW_KEY_PREFIX}${campaignId}:${viewerKey}`;
  if (sessionStorage.getItem(key)) return false;

  const { data, error } = await supabase.rpc("increment_campaign_views", {
    p_campaign_id: campaignId,
  });

  if (error) {
    console.warn("[campaign-views]", error.message);
    return false;
  }

  // Função nova retorna boolean; a antiga retorna void/null — só bloqueia se false explícito.
  if (data === false) return false;

  sessionStorage.setItem(key, "1");
  return true;
}

/** Total exibido = views reais + soft_views (soft nunca altera a coluna views). */
export function displayCampaignViews(campaign: {
  views?: number | null;
  soft_views?: number | null;
}): number {
  return Number(campaign.views ?? 0) + Number(campaign.soft_views ?? 0);
}

export function formatViewCount(views: number): string {
  return views.toLocaleString("pt-BR");
}
