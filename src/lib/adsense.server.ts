import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getAdSenseEnv, resolveAdSenseClientId, type AdSenseSettings } from "@/lib/adsense";

export async function getAdSenseClientIdForServer() {
  const env = getAdSenseEnv();
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return env.clientId;

  try {
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client
      .from("site_settings")
      .select("value")
      .eq("key", "adsense")
      .maybeSingle();

    const settings = (data?.value as AdSenseSettings | undefined) ?? null;
    return resolveAdSenseClientId(env, settings);
  } catch {
    return env.clientId;
  }
}
