import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { syncAdminDashboardStats } from "@/lib/api/admin-users.functions";

export async function checkIsAdmin() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false as const, user: null };

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return { ok: !!role, user: userData.user };
}

export async function logAdminAction(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from("admin_audit_logs").insert({
    admin_id: userData.user.id,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    details: (input.details ?? {}) as Json,
  });
}

export async function createAdminNotification(input: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  await supabase.from("admin_notifications").insert(input);
}

export type DashboardStats = {
  total_users: number;
  active_users: number;
  new_users_7d: number;
  total_campaigns: number;
  approved_campaigns: number;
  pending_campaigns: number;
  rejected_campaigns: number;
  correction_campaigns: number;
  archived_campaigns: number;
  total_reports: number;
  open_reports: number;
  total_comments: number;
};

function parseDashboardStats(data: unknown): DashboardStats | null {
  const raw =
    typeof data === "string"
      ? (JSON.parse(data) as Record<string, unknown>)
      : (data as Record<string, unknown> | null);
  if (!raw || typeof raw !== "object") return null;

  const num = (key: keyof DashboardStats) => {
    const value = Number(raw[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  };

  return {
    total_users: num("total_users"),
    active_users: num("active_users"),
    new_users_7d: num("new_users_7d"),
    total_campaigns: num("total_campaigns"),
    approved_campaigns: num("approved_campaigns"),
    pending_campaigns: num("pending_campaigns"),
    rejected_campaigns: num("rejected_campaigns"),
    correction_campaigns: num("correction_campaigns"),
    archived_campaigns: num("archived_campaigns"),
    total_reports: num("total_reports"),
    open_reports: num("open_reports"),
    total_comments: num("total_comments"),
  };
}

/** Recria rows em profiles para contas em auth.users que ficaram sem perfil. */
export async function ensureMissingProfiles() {
  const { data, error } = await supabase.rpc("admin_ensure_missing_profiles");
  if (error) {
    console.warn("[admin] ensureMissingProfiles:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  // Conta auth.users via service role e recria profiles faltantes
  try {
    const synced = await syncAdminDashboardStats();
    if (synced.ok) return synced.stats;
    console.warn("[admin] syncAdminDashboardStats:", synced.reason, synced.message);
  } catch (err) {
    console.warn("[admin] syncAdminDashboardStats failed:", err);
  }

  await ensureMissingProfiles();

  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (!error) {
    const parsed = parseDashboardStats(data);
    if (parsed && !(parsed.total_users === 0 && parsed.total_campaigns > 0)) {
      return parsed;
    }
    if (parsed && parsed.total_users > 0) return parsed;
  }

  // Fallback: perfis + donos distintos de campanha (nunca mostrar 0 usuários com campanhas)
  const [profiles, campaigns, reports, comments] = await Promise.all([
    supabase.from("profiles").select("id, account_status, created_at"),
    supabase.from("campaigns").select("id, status, user_id"),
    supabase.from("reports").select("id, resolved"),
    supabase.from("comments").select("id"),
  ]);
  const users = profiles.data ?? [];
  const camps = campaigns.data ?? [];
  const reps = reports.data ?? [];
  const ownerIds = new Set(camps.map((c) => c.user_id).filter(Boolean));
  const profileIds = new Set(users.map((u) => u.id));
  const totalUsers = Math.max(users.length, new Set([...profileIds, ...ownerIds]).size);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    total_users: totalUsers,
    active_users: users.filter((u) => u.account_status === "active").length || totalUsers,
    new_users_7d: users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
    total_campaigns: camps.length,
    approved_campaigns: camps.filter((c) => c.status === "approved").length,
    pending_campaigns: camps.filter((c) => c.status === "pending").length,
    rejected_campaigns: camps.filter((c) => c.status === "rejected").length,
    correction_campaigns: camps.filter((c) => c.status === "correction_requested").length,
    archived_campaigns: camps.filter((c) => c.status === "archived").length,
    total_reports: reps.length,
    open_reports: reps.filter((r) => !r.resolved).length,
    total_comments: (comments.data ?? []).length,
  };
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  blocked: "Bloqueado",
  banned: "Banido",
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  correction_requested: "Correção solicitada",
  archived: "Arquivada",
};
