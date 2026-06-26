import { supabase } from "@/integrations/supabase/client";

let cachedAdmin: boolean | undefined;
let cachedUserId: string | undefined;

/** Limpa cache após login/logout para não herdar status de outra sessão. */
export function resetAdminAnalyticsCache() {
  cachedAdmin = undefined;
  cachedUserId = undefined;
}

/** Sincroniza cache com o AuthProvider (evita contagem antes da checagem async). */
export function syncAdminAnalyticsCache(userId: string | null, isAdmin: boolean) {
  if (!userId) {
    resetAdminAnalyticsCache();
    return;
  }
  cachedUserId = userId;
  cachedAdmin = isAdmin;
}

/** Visitas e eventos públicos não contam para administradores logados. */
export async function shouldCountPublicAnalytics(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return true;

  if (cachedUserId === userId && cachedAdmin !== undefined) {
    return !cachedAdmin;
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  cachedAdmin = !!role;
  cachedUserId = userId;
  return !cachedAdmin;
}
