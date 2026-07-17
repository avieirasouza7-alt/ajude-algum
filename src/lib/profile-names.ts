import { supabase } from "@/integrations/supabase/client";
import { formatCommentAuthorName } from "@/lib/campaign-display";

/** Resolve nomes reais de perfis a partir de user ids. */
export async function resolveProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const nameById = new Map<string, string>();
  if (unique.length === 0) return nameById;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);

  for (const profile of profiles ?? []) {
    nameById.set(profile.id, formatCommentAuthorName(profile.full_name));
  }

  return nameById;
}

export function profileNameFromMap(map: Map<string, string>, userId: string | null | undefined) {
  if (!userId) return formatCommentAuthorName(null);
  return map.get(userId) ?? formatCommentAuthorName(null);
}
