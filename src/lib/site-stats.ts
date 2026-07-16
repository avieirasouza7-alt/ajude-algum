import { supabase } from "@/integrations/supabase/client";
import { applyPublicCampaignFilters } from "@/lib/campaign-queries";

export type PublicSiteStats = {
  campaignCount: number;
  stateCount: number;
};

type StatsCampaignRow = {
  state: string | null;
};

export async function fetchPublicSiteStats(): Promise<PublicSiteStats> {
  const campaignsRes = await applyPublicCampaignFilters(supabase.from("campaigns").select("state"));

  const { data, error } = campaignsRes;
  if (error) throw error;

  const campaigns = (data ?? []) as StatsCampaignRow[];
  const campaignCount = campaigns.length;
  const stateCount = new Set(
    campaigns.map((c) => (c.state ?? "").trim().toUpperCase()).filter(Boolean),
  ).size;

  return {
    campaignCount,
    stateCount,
  };
}

export function formatStatValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "--";
  if (value <= 0) return "--";
  return new Intl.NumberFormat("pt-BR").format(value);
}
