import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCommentAuthorName } from "@/lib/campaign-display";
import type { GardenProfile } from "@/lib/communityGarden";

/**
 * Identidade do jogador no Jardim da Esperança.
 * Usa o perfil real do site (profiles.full_name); "Visitante" sem login.
 */
export function useGardenProfile(): GardenProfile {
  const { user } = useAuth();

  const { data: fullName } = useQuery({
    queryKey: ["garden-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return formatCommentAuthorName(data?.full_name);
    },
  });

  if (!user) return { userId: null, fullName: "Visitante" };
  return { userId: user.id, fullName: fullName ?? "Visitante" };
}
