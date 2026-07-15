import { supabase } from "@/integrations/supabase/client";
import { applyPublicCampaignFilters } from "@/lib/campaign-queries";

export type PublicSiteStats = {
  campaignCount: number;
  peopleHelped: number;
  totalRaised: number;
  stateCount: number;
  /** Sem dado confiável de doadores individuais no momento. */
  donorCount: number | null;
};

export async function fetchPublicSiteStats(): Promise<PublicSiteStats> {
  const campaignsRes = await applyPublicCampaignFilters(
    supabase.from("campaigns").select("raised_amount, state"),
  );

  const campaigns = campaignsRes.data ?? [];
  const campaignCount = campaigns.length;
  const totalRaised = campaigns.reduce((sum, c) => sum + Number(c.raised_amount ?? 0), 0);
  const peopleHelped = campaigns.filter((c) => Number(c.raised_amount ?? 0) > 0).length;
  const stateCount = new Set(
    campaigns.map((c) => (c.state ?? "").trim().toUpperCase()).filter(Boolean),
  ).size;

  return {
    campaignCount,
    peopleHelped,
    totalRaised,
    stateCount,
    donorCount: null,
  };
}

export function formatStatValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "--";
  if (value <= 0) return "--";
  return new Intl.NumberFormat("pt-BR").format(value);
}
