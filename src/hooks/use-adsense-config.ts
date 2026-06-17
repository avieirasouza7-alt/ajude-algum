import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ADSENSE_SETTINGS_DEFAULTS,
  getAdSenseEnv,
  mergeAdSenseConfig,
  type AdSenseSettings,
} from "@/lib/adsense";

export function useAdSenseConfig() {
  const env = getAdSenseEnv();

  const { data: settings } = useQuery({
    queryKey: ["site-settings", "adsense"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "adsense")
        .maybeSingle();
      if (error || !data?.value) return null;
      return data.value as AdSenseSettings;
    },
    staleTime: 60_000,
  });

  return mergeAdSenseConfig(env, settings);
}
