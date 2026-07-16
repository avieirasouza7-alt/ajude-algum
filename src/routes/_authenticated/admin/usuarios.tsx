import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ACCOUNT_STATUS_LABELS, ensureMissingProfiles, logAdminAction } from "@/lib/admin";
import { syncAndListAdminUsers } from "@/lib/api/admin-users.functions";
import { formatDate } from "@/lib/format";
import { Shield, ShieldOff, Ban, UserX } from "lucide-react";
import { toast } from "sonner";

type ProfileRow = Tables<"profiles"> & {
  campaign_count: number;
  report_count: number;
  is_admin: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuarios,
});

function AdminUsuarios() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      let profiles: Tables<"profiles">[] = [];

      try {
        const synced = await syncAndListAdminUsers();
        if (synced.ok && synced.profiles.length) {
          profiles = synced.profiles;
        }
      } catch {
        /* cai no select direto */
      }

      if (!profiles.length) {
        await ensureMissingProfiles();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        profiles = data ?? [];
      }

      const ids = (profiles ?? []).map((p) => p.id);
      if (!ids.length) {
        return (profiles ?? []).map((p) => ({
          ...p,
          campaign_count: 0,
          report_count: 0,
          is_admin: false,
        })) as ProfileRow[];
      }

      const [campaigns, reports, roles] = await Promise.all([
        supabase.from("campaigns").select("user_id").in("user_id", ids),
        supabase.from("reports").select("user_id, campaign_id"),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);

      const campCount = new Map<string, number>();
      (campaigns.data ?? []).forEach((c) => {
        campCount.set(c.user_id, (campCount.get(c.user_id) ?? 0) + 1);
      });

      const adminIds = new Set((roles.data ?? []).map((r) => r.user_id));

      const campaignOwners = new Map<string, string>();
      const campaignIds = [
        ...new Set((reports.data ?? []).map((r) => r.campaign_id).filter(Boolean)),
      ];
      if (campaignIds.length) {
        const { data: camps } = await supabase
          .from("campaigns")
          .select("id, user_id")
          .in("id", campaignIds as string[]);
        (camps ?? []).forEach((c) => campaignOwners.set(c.id, c.user_id));
      }

      const reportCount = new Map<string, number>();
      (reports.data ?? []).forEach((r) => {
        const owner = r.campaign_id ? campaignOwners.get(r.campaign_id) : null;
        if (owner) reportCount.set(owner, (reportCount.get(owner) ?? 0) + 1);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        campaign_count: campCount.get(p.id) ?? 0,
        report_count: reportCount.get(p.id) ?? 0,
        is_admin: adminIds.has(p.id),
      })) as ProfileRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: status, status_reason: reason ?? null })
        .eq("id", userId);
      if (error) throw error;
      await logAdminAction({
        action: `user.${status}`,
        entityType: "profile",
        entityId: userId,
        details: { reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Status do usuário atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
      await logAdminAction({
        action: makeAdmin ? "user.grant_admin" : "user.revoke_admin",
        entityType: "profile",
        entityId: userId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Permissões atualizadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (users ?? []).filter((u) => {
    if (statusFilter !== "all" && u.account_status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.id.includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Usuários</h1>
        <p className="text-muted-foreground">Gerencie contas, permissões e moderação.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(ACCOUNT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Usuário</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Campanhas</th>
              <th className="p-3 font-medium">Denúncias</th>
              <th className="p-3 font-medium">Cadastro</th>
              <th className="p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-left hover:text-primary"
                    onClick={() => setSelected(u)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback>{u.full_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span>
                      <span className="font-medium">{u.full_name ?? "Sem nome"}</span>
                      {u.is_admin && (
                        <Badge className="ml-2" variant="secondary">
                          Admin
                        </Badge>
                      )}
                    </span>
                  </button>
                </td>
                <td className="p-3">
                  <Badge variant="outline">
                    {ACCOUNT_STATUS_LABELS[u.account_status] ?? u.account_status}
                  </Badge>
                </td>
                <td className="p-3">{u.campaign_count}</td>
                <td className="p-3">{u.report_count}</td>
                <td className="p-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.account_status !== "active" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reativar"
                        onClick={() => updateStatus.mutate({ userId: u.id, status: "active" })}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Suspender"
                      onClick={() => updateStatus.mutate({ userId: u.id, status: "suspended" })}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Bloquear"
                      onClick={() => updateStatus.mutate({ userId: u.id, status: "blocked" })}
                    >
                      <ShieldOff className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Banir"
                      onClick={() => updateStatus.mutate({ userId: u.id, status: "banned" })}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={u.is_admin ? "Remover admin" : "Tornar admin"}
                      onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !u.is_admin })}
                    >
                      {u.is_admin ? (
                        <ShieldOff className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.full_name ?? "Perfil"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> {selected.id}
              </p>
              <p>
                <strong>Status:</strong> {ACCOUNT_STATUS_LABELS[selected.account_status]}
              </p>
              <p>
                <strong>Campanhas:</strong> {selected.campaign_count}
              </p>
              <p>
                <strong>Denúncias recebidas:</strong> {selected.report_count}
              </p>
              <p>
                <strong>Último acesso:</strong>{" "}
                {selected.last_seen_at ? formatDate(selected.last_seen_at) : "—"}
              </p>
              {selected.status_reason && (
                <p>
                  <strong>Motivo:</strong> {selected.status_reason}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
