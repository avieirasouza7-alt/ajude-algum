import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPAIGN_ALERT_DEFAULTS,
  isPublicCampaignAlertRoute,
  type CampaignAlertSettings,
} from "@/lib/campaign-alert";

export function useCampaignAlert() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showOnRoute = isPublicCampaignAlertRoute(pathname);

  const { data: settings } = useQuery({
    queryKey: ["site-settings", "campaign-alert"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "campaign_alert")
        .maybeSingle();
      if (error || !data?.value) return CAMPAIGN_ALERT_DEFAULTS;
      return { ...CAMPAIGN_ALERT_DEFAULTS, ...(data.value as CampaignAlertSettings) };
    },
    staleTime: 60_000,
  });

  const slug = settings?.campaign_slug?.trim() ?? "";
  const enabled = Boolean(settings?.enabled && slug);

  const { data: campaign } = useQuery({
    queryKey: ["campaign-alert", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("slug, title")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: enabled && showOnRoute,
    staleTime: 60_000,
  });

  const visible = showOnRoute && enabled && Boolean(campaign);

  return {
    visible,
    slug: campaign?.slug ?? slug,
    title: campaign?.title ?? "",
    message: settings?.message?.trim() ?? "",
  };
}
