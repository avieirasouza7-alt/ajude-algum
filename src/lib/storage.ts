import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

export async function getCampaignImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.exp > now) return hit.url;
  const { data } = await supabase.storage.from("campaign-images").createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
  return data.signedUrl;
}
