import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const inputSchema = z.object({
  action: z.string().min(1).max(80),
  path: z.string().max(300).optional(),
  entityType: z.string().max(80).optional(),
  entityId: z.string().max(120).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

function clientIpFromRequest(request: Request): string {
  const cf = request.headers.get("CF-Connecting-IP")?.trim();
  if (cf) return cf.slice(0, 64);
  const xff = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 64);
  const realIp = request.headers.get("X-Real-IP")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

/**
 * Registra acesso com IP real (Cloudflare / proxy).
 * Chamado do cliente após login, cadastro, criação de campanha, denúncia etc.
 */
export const recordAccessLogFn = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { ok: false as const, reason: "not_authenticated" as const };
    }

    const token = authHeader.slice(7);
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      return { ok: false as const, reason: "config" as const };
    }

    const userClient = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return { ok: false as const, reason: "not_authenticated" as const };
    }

    const ip = clientIpFromRequest(request);
    const userAgent = request.headers.get("User-Agent")?.slice(0, 500) ?? null;

    const { data: logId, error } = await userClient.rpc("record_access_log", {
      p_action: data.action,
      p_ip: ip,
      p_user_agent: userAgent,
      p_path: data.path ?? null,
      p_entity_type: data.entityType ?? null,
      p_entity_id: data.entityId ?? null,
      p_details: (data.details ?? {}) as never,
    });

    if (error) {
      return { ok: false as const, reason: "db_error" as const, message: error.message };
    }

    return { ok: true as const, id: logId as string, ipLogged: ip !== "unknown" };
  });
