import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DashboardStats } from "@/lib/admin";

type AuthClients = {
  url: string;
  anonKey: string;
  serviceKey: string | undefined;
  token: string;
};

function readEnv() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getAuthedAdminContext(): Promise<
  | { ok: false; reason: "not_authenticated" | "config" | "forbidden" }
  | { ok: true; clients: AuthClients; userId: string }
> {
  const request = getRequest();
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, reason: "not_authenticated" };
  }

  const token = authHeader.slice(7);
  const { url, anonKey, serviceKey } = readEnv();
  if (!url || !anonKey) return { ok: false, reason: "config" };

  const userClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return { ok: false, reason: "not_authenticated" };

  const userId = userData.user.id;

  if (serviceKey) {
    const admin = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return { ok: false, reason: "forbidden" };
  } else {
    const { data: role } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return { ok: false, reason: "forbidden" };
  }

  return {
    ok: true,
    userId,
    clients: { url, anonKey, serviceKey, token },
  };
}

async function listAllAuthUsers(serviceKey: string, url: string) {
  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const users: {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
  }[] = [];

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users ?? [];
    users.push(
      ...batch.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: (u.user_metadata ?? {}) as Record<string, unknown>,
      })),
    );
    if (batch.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return { admin, users };
}

function displayName(meta: Record<string, unknown>, email?: string) {
  const full = meta.full_name ?? meta.name;
  if (typeof full === "string" && full.trim()) return full.trim();
  if (email) return email.split("@")[0] ?? "Usuário";
  return "Usuário";
}

type AdminSyncFail = {
  ok: false;
  reason: "not_authenticated" | "config" | "forbidden" | "db_error";
  message?: string;
};

/** Sincroniza profiles a partir de auth.users e devolve estatísticas reais do painel. */
export const syncAdminDashboardStats = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true; stats: DashboardStats; synced: number } | AdminSyncFail> => {
    const ctx = await getAuthedAdminContext();
    if (!ctx.ok) return { ok: false, reason: ctx.reason };

    const { url, serviceKey, anonKey, token } = ctx.clients;

    try {
      if (!serviceKey) {
        // Sem service role: tenta RPC no cliente autenticado
        const userClient = createClient<Database>(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        await userClient.rpc("admin_ensure_missing_profiles");
        const { data, error } = await userClient.rpc("admin_dashboard_stats");
        if (error || !data) return { ok: false, reason: "db_error", message: error?.message };
        const raw = (typeof data === "string" ? JSON.parse(data) : data) as DashboardStats;
        return { ok: true, stats: raw, synced: 0 };
      }

      const { admin, users } = await listAllAuthUsers(serviceKey, url);
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, account_status, created_at");
      const existing = new Set((profiles ?? []).map((p) => p.id));
      const missing = users.filter((u) => !existing.has(u.id));

      let synced = 0;
      if (missing.length) {
        const rows = missing.map((u) => ({
          id: u.id,
          full_name: displayName(u.user_metadata ?? {}, u.email),
          avatar_url:
            typeof u.user_metadata?.avatar_url === "string" ? u.user_metadata.avatar_url : null,
          account_status: "active",
        }));
        const { error } = await admin.from("profiles").upsert(rows, { onConflict: "id" });
        if (error) return { ok: false, reason: "db_error", message: error.message };
        synced = rows.length;
      }

      const [{ data: camps }, { data: reps }, { data: comments }, { data: profilesAfter }] =
        await Promise.all([
          admin.from("campaigns").select("id, status"),
          admin.from("reports").select("id, resolved"),
          admin.from("comments").select("id"),
          admin.from("profiles").select("id, account_status, created_at"),
        ]);

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const campsList = camps ?? [];
      const profilesList = profilesAfter ?? [];
      const activeCount = profilesList.filter((p) => p.account_status === "active").length;

      const stats: DashboardStats = {
        total_users: users.length,
        active_users: activeCount || users.length,
        new_users_7d: users.filter((u) => {
          const t = u.created_at ? new Date(u.created_at).getTime() : 0;
          return t >= weekAgo;
        }).length,
        total_campaigns: campsList.length,
        approved_campaigns: campsList.filter((c) => c.status === "approved").length,
        pending_campaigns: campsList.filter((c) => c.status === "pending").length,
        rejected_campaigns: campsList.filter((c) => c.status === "rejected").length,
        correction_campaigns: campsList.filter((c) => c.status === "correction_requested").length,
        archived_campaigns: campsList.filter((c) => c.status === "archived").length,
        total_reports: (reps ?? []).length,
        open_reports: (reps ?? []).filter((r) => !r.resolved).length,
        total_comments: (comments ?? []).length,
      };

      return { ok: true, stats, synced };
    } catch (err) {
      return {
        ok: false,
        reason: "db_error",
        message: err instanceof Error ? err.message : "erro desconhecido",
      };
    }
  },
);

/** Garante profiles e devolve lista para /admin/usuarios. */
export const syncAndListAdminUsers = createServerFn({ method: "POST" }).handler(
  async (): Promise<
    | {
        ok: true;
        synced: number;
        profiles: Database["public"]["Tables"]["profiles"]["Row"][];
      }
    | AdminSyncFail
  > => {
    const ctx = await getAuthedAdminContext();
    if (!ctx.ok) return { ok: false, reason: ctx.reason };

    const { url, serviceKey } = ctx.clients;
    if (!serviceKey) {
      return { ok: false, reason: "config", message: "SUPABASE_SERVICE_ROLE_KEY ausente" };
    }

    try {
      const { admin, users } = await listAllAuthUsers(serviceKey, url);
      const { data: profiles } = await admin.from("profiles").select("id");
      const existing = new Set((profiles ?? []).map((p) => p.id));
      const missing = users.filter((u) => !existing.has(u.id));

      let synced = 0;
      if (missing.length) {
        const rows = missing.map((u) => ({
          id: u.id,
          full_name: displayName(u.user_metadata ?? {}, u.email),
          avatar_url:
            typeof u.user_metadata?.avatar_url === "string" ? u.user_metadata.avatar_url : null,
          account_status: "active",
        }));
        const { error } = await admin.from("profiles").upsert(rows, { onConflict: "id" });
        if (error) return { ok: false, reason: "db_error", message: error.message };
        synced = rows.length;
      }

      const { data: allProfiles, error: listError } = await admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (listError) return { ok: false, reason: "db_error", message: listError.message };

      return { ok: true, synced, profiles: allProfiles ?? [] };
    } catch (err) {
      return {
        ok: false,
        reason: "db_error",
        message: err instanceof Error ? err.message : "erro desconhecido",
      };
    }
  },
);
