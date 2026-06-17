import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logAdminAction } from "@/lib/admin";
import { reportTypeLabel } from "@/lib/report-types";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

type Report = Tables<"reports">;

export const Route = createFileRoute("/_authenticated/admin/denuncias")({
  component: AdminDenuncias,
});

function AdminDenuncias() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin", "reports", filter],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (filter === "open") q = q.eq("resolved", false);
      if (filter === "resolved") q = q.eq("resolved", true);
      const { data: rows, error } = await q;
      if (error) throw error;
      if (!rows?.length) return [];

      const campaignIds = [...new Set(rows.map((r) => r.campaign_id).filter(Boolean))] as string[];

      const { data: campaignRows } = campaignIds.length
        ? await supabase.from("campaigns").select("id, title, slug, user_id").in("id", campaignIds)
        : { data: [] as { id: string; title: string; slug: string; user_id: string }[] };

      const userIds = [
        ...new Set([
          ...rows.map((r) => r.user_id),
          ...(campaignRows ?? []).map((c) => c.user_id),
        ]),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const campaignMap = new Map((campaignRows ?? []).map((c) => [c.id, c]));

      return rows.map((r) => {
        const campaign = r.campaign_id ? (campaignMap.get(r.campaign_id) ?? null) : null;
        return {
          ...r,
          reporter: profileMap.get(r.user_id) ?? null,
          campaign,
          reportedUser: campaign ? (profileMap.get(campaign.user_id) ?? null) : null,
        };
      });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({
      id,
      patch,
      action,
    }: {
      id: string;
      patch: Partial<Report>;
      action: string;
    }) => {
      const { error } = await supabase.from("reports").update(patch).eq("id", id);
      if (error) throw error;
      await logAdminAction({ action, entityType: "report", entityId: id, details: patch });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Denúncia atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moderateUser = useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
      reportId,
    }: {
      userId: string;
      status: string;
      reason: string;
      reportId: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: status, status_reason: reason })
        .eq("id", userId);
      if (error) throw error;
      await logAdminAction({
        action: `user.${status}`,
        entityType: "profile",
        entityId: userId,
        details: { reason, reportId },
      });
    },
    onSuccess: () => toast.success("Usuário moderado."),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async ({ campaignId, reportId }: { campaignId: string; reportId: string }) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      await updateReport.mutateAsync({
        id: reportId,
        patch: { resolved: true, admin_action: "content_removed" },
        action: "report.content_removed",
      });
      await logAdminAction({
        action: "campaign.delete_from_report",
        entityType: "campaign",
        entityId: campaignId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Central de denúncias</h1>
          <p className="text-muted-foreground">Analise relatos e tome ações de moderação.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="resolved">Resolvidas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}

      <div className="space-y-4">
        {(reports ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{reportTypeLabel(r.report_type)}</Badge>
              <Badge variant={r.resolved ? "secondary" : "destructive"}>
                {r.resolved ? "Resolvida" : "Aberta"}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            </div>

            <p className="mt-3 text-sm">{r.reason}</p>

            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p>
                Denunciante: <strong className="text-foreground">{r.reporter?.full_name ?? "—"}</strong>
              </p>
              {r.reportedUser && (
                <p>
                  Autor da campanha:{" "}
                  <strong className="text-foreground">{r.reportedUser.full_name ?? "—"}</strong>
                </p>
              )}
              {r.campaign && (
                <p className="sm:col-span-2">
                  Campanha:{" "}
                  <Link
                    to="/campanha/$slug"
                    params={{ slug: r.campaign.slug }}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.campaign.title}
                  </Link>
                </p>
              )}
              {r.campaign_reference && !r.campaign && (
                <p className="sm:col-span-2">Referência: {r.campaign_reference}</p>
              )}
            </div>

            {!r.resolved && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    updateReport.mutate({
                      id: r.id,
                      patch: { resolved: true, admin_action: "resolved" },
                      action: "report.resolve",
                    })
                  }
                >
                  Marcar resolvida
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateReport.mutate({
                      id: r.id,
                      patch: { resolved: true, admin_action: "ignored" },
                      action: "report.ignore",
                    })
                  }
                >
                  Ignorar
                </Button>
                {r.campaign && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Remover campanha denunciada?")) {
                        deleteCampaign.mutate({ campaignId: r.campaign!.id, reportId: r.id });
                      }
                    }}
                  >
                    Remover conteúdo
                  </Button>
                )}
                {r.reportedUser && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        moderateUser.mutate({
                          userId: r.reportedUser!.id,
                          status: "suspended",
                          reason: r.reason.slice(0, 200),
                          reportId: r.id,
                        })
                      }
                    >
                      Suspender usuário
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        moderateUser.mutate({
                          userId: r.reportedUser!.id,
                          status: "blocked",
                          reason: r.reason.slice(0, 200),
                          reportId: r.id,
                        })
                      }
                    >
                      Bloquear
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        moderateUser.mutate({
                          userId: r.reportedUser!.id,
                          status: "banned",
                          reason: r.reason.slice(0, 200),
                          reportId: r.id,
                        })
                      }
                    >
                      Banir
                    </Button>
                  </>
                )}
              </div>
            )}

            {r.admin_action && (
              <p className="mt-2 text-xs text-muted-foreground">Ação: {r.admin_action}</p>
            )}
          </div>
        ))}
        {!isLoading && !reports?.length && (
          <p className="text-muted-foreground">Nenhuma denúncia neste filtro.</p>
        )}
      </div>
    </div>
  );
}
