import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const bootstrapFirstAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, reason: "not_authenticated" as const };
  }

  const token = authHeader.slice(7);
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const userId = userData.user.id;

  if (serviceKey) {
    const admin = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      const { data: existing } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (existing) return { ok: true as const };
      return { ok: false as const, reason: "admin_already_exists" as const };
    }

    const { error: insertError } = await admin.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (insertError) return { ok: false as const, reason: "db_error" as const };
    return { ok: true as const };
  }

  const { error: rpcError } = await userClient.rpc("bootstrap_first_admin");
  if (!rpcError) return { ok: true as const };

  if (rpcError.message.includes("admin_already_exists")) {
    return { ok: false as const, reason: "admin_already_exists" as const };
  }

  return { ok: false as const, reason: "needs_setup" as const };
});
