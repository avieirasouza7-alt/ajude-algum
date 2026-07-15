import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) {
    const [profiles, campaigns, reports, comments] = await Promise.all([
      supabase.from("profiles").select("id, account_status, created_at"),
      supabase.from("campaigns").select("id, status"),
      supabase.from("reports").select("id, resolved"),
      supabase.from("comments").select("id"),
    ]);
    const users = profiles.data ?? [];
    const camps = campaigns.data ?? [];
    const reps = reports.data ?? [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total_users: users.length,
      active_users: users.filter((u) => u.account_status === "active").length,
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
  return data as DashboardStats;
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
