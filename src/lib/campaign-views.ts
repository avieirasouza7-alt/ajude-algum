import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VIEW_KEY_PREFIX = "aa-campaign-view:";
const FLOOR_KEY_PREFIX = "aa-campaign-views-floor:";

/** Piso em memória (mesma aba) — complementa sessionStorage. */
const viewsFloorByCampaignId = new Map<string, number>();

type TrackCampaignViewOptions = {
  /** Usuário logado que está vendo (se houver). */
  viewerId?: string | null;
  /** Dono da campanha — visitas próprias não entram na contagem. */
  ownerId?: string | null;
};

export type ViewsFields = {
  id?: string;
  views?: number | null;
  soft_views?: number | null;
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

function rawCampaignViews(campaign: { views?: number | null; soft_views?: number | null }): number {
  return Number(campaign.views ?? 0) + Number(campaign.soft_views ?? 0);
}

function readStoredFloor(campaignId: string): number {
  const mem = viewsFloorByCampaignId.get(campaignId) ?? 0;
  if (typeof window === "undefined") return mem;
  try {
    const stored = Number(sessionStorage.getItem(`${FLOOR_KEY_PREFIX}${campaignId}`) ?? "0");
    return Math.max(mem, Number.isFinite(stored) ? stored : 0);
  } catch {
    return mem;
  }
}

/**
 * Garante que, nesta sessão, o total exibido desta campanha nunca regrede
 * (protege contra refetch atrasado / cache velho).
 */
export function raiseCampaignViewsFloor(campaignId: string, total: number): void {
  if (typeof window === "undefined") return;
  if (!campaignId || !Number.isFinite(total) || total <= 0) return;
  const next = Math.max(readStoredFloor(campaignId), Math.floor(total));
  viewsFloorByCampaignId.set(campaignId, next);
  try {
    sessionStorage.setItem(`${FLOOR_KEY_PREFIX}${campaignId}`, String(next));
  } catch {
    /* ignore */
  }
}

/** Total exibido = max(views + soft_views, piso da sessão). Nunca cai após ter sido visto. */
export function displayCampaignViews(campaign: {
  id?: string | null;
  views?: number | null;
  soft_views?: number | null;
}): number {
  const raw = rawCampaignViews(campaign);
  if (typeof window === "undefined" || !campaign.id) return raw;
  // Todo valor já mostrado nesta sessão vira piso — evita 5→4 em lista ou detalhe.
  raiseCampaignViewsFloor(campaign.id, raw);
  return Math.max(raw, readStoredFloor(campaign.id));
}

/** Ao mesclar fetch novo com cache antigo: views/soft_views só sobem. */
export function mergeCampaignViewsMonotonic<T extends ViewsFields>(
  previous: T | null | undefined,
  incoming: T,
): T {
  if (!previous || !incoming.id || previous.id !== incoming.id) return incoming;
  return {
    ...incoming,
    views: Math.max(Number(previous.views ?? 0), Number(incoming.views ?? 0)),
    soft_views: Math.max(Number(previous.soft_views ?? 0), Number(incoming.soft_views ?? 0)),
  };
}

function bumpViewsRow<T extends ViewsFields>(row: T, campaignId: string): T {
  if (row.id !== campaignId) return row;
  return { ...row, views: Number(row.views ?? 0) + 1 };
}

/**
 * Após registrar uma view no banco: cancela refetch em voo (evita 5→4),
 * atualiza a página da campanha e as listas em cache, e sobe o piso da sessão.
 */
export async function applyCampaignViewBump(
  qc: QueryClient,
  opts: { campaignId: string; slug: string; floorAtLeast?: number },
): Promise<void> {
  const { campaignId, slug, floorAtLeast } = opts;

  await qc.cancelQueries({ queryKey: ["campaign", slug] });
  await qc.cancelQueries({ queryKey: ["home"] });
  await qc.cancelQueries({ queryKey: ["campaigns"] });
  await qc.cancelQueries({ queryKey: ["my-campaigns"] });
  await qc.cancelQueries({ queryKey: ["admin", "campaigns"] });

  qc.setQueryData<ViewsFields | null>(["campaign", slug], (current) => {
    if (!current) return current;
    const bumped = bumpViewsRow(current, campaignId);
    raiseCampaignViewsFloor(campaignId, Math.max(rawCampaignViews(bumped), floorAtLeast ?? 0));
    return bumped;
  });

  const currentDetail = qc.getQueryData<ViewsFields | null>(["campaign", slug]);
  if (currentDetail) {
    raiseCampaignViewsFloor(
      campaignId,
      Math.max(rawCampaignViews(currentDetail), floorAtLeast ?? 0),
    );
  } else if (floorAtLeast != null) {
    raiseCampaignViewsFloor(campaignId, floorAtLeast);
  }

  qc.setQueryData<{ featured: ViewsFields[]; recent: ViewsFields[]; stats?: unknown } | undefined>(
    ["home"],
    (home) => {
      if (!home) return home;
      return {
        ...home,
        featured: home.featured.map((c) => bumpViewsRow(c, campaignId)),
        recent: home.recent.map((c) => bumpViewsRow(c, campaignId)),
      };
    },
  );

  qc.setQueriesData<ViewsFields[] | undefined>({ queryKey: ["campaigns"] }, (rows) =>
    rows?.map((c) => bumpViewsRow(c, campaignId)),
  );

  qc.setQueriesData<ViewsFields[] | undefined>({ queryKey: ["my-campaigns"] }, (rows) =>
    rows?.map((c) => bumpViewsRow(c, campaignId)),
  );

  qc.setQueriesData<ViewsFields[] | undefined>({ queryKey: ["admin", "campaigns"] }, (rows) =>
    rows?.map((c) => bumpViewsRow(c, campaignId)),
  );
}

export function formatViewCount(views: number): string {
  return views.toLocaleString("pt-BR");
}
