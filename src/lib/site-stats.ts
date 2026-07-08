import { supabase } from "@/integrations/supabase/client";
import { applyPublicCampaignFilters } from "@/lib/campaign-queries";

export type PublicSiteStats = {
  campaignCount: number;
  peopleHelped: number;
  totalRaised: number;
};

export async function fetchPublicSiteStats(): Promise<PublicSiteStats> {
  const [campaignsRes] = await Promise.all([
    applyPublicCampaignFilters(
      supabase.from("campaigns").select("raised_amount"),
    ),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const campaignCount = campaigns.length;
  const totalRaised = campaigns.reduce((sum, c) => sum + Number(c.raised_amount ?? 0), 0);
  const peopleHelped = campaigns.filter((c) => Number(c.raised_amount ?? 0) > 0).length;

  return {
    campaignCount,
    peopleHelped,
    totalRaised,
  };
}
