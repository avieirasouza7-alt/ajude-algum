import { supabase } from "@/integrations/supabase/client";
import { recordAccessLogFn } from "@/lib/api/access-log.functions";

export type AccessLogAction =
  | "auth.login"
  | "auth.signup"
  | "auth.oauth"
  | "terms.accept"
  | "campaign.create"
  | "report.create"
  | "admin.moderation";

/**
 * Registra evento de acesso (IP + data/hora) sem bloquear a UX.
 * Em produção o Worker Cloudflare preenche CF-Connecting-IP.
 */
export async function logAccessEvent(
  action: AccessLogAction | string,
  opts?: {
    path?: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await recordAccessLogFn({
      data: {
        action,
        path: opts?.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        entityType: opts?.entityType,
        entityId: opts?.entityId,
        details: opts?.details,
      },
    });
  } catch {
    /* Nunca interrompe login/campanha/denúncia por falha de log. */
  }
}
