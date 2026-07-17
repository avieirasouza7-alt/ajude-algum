import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { profileNameFromMap, resolveProfileNames } from "@/lib/profile-names";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const names = await resolveProfileNames((rows ?? []).map((l) => l.admin_id));
      return (rows ?? []).map((l) => ({
        ...l,
        admin_name: profileNameFromMap(names, l.admin_id),
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Auditoria</h1>
        <p className="text-muted-foreground">Histórico de ações administrativas.</p>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">Usuário</th>
              <th className="p-3 font-medium">Ação</th>
              <th className="p-3 font-medium">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="p-3 whitespace-nowrap text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="p-3">{log.admin_name}</td>
                <td className="p-3">
                  <Badge variant="outline">{log.action}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {log.entity_type ?? "—"} {log.entity_id ? `• ${log.entity_id.slice(0, 8)}…` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !logs?.length && (
          <p className="p-6 text-muted-foreground">Nenhum registro ainda.</p>
        )}
      </div>
    </div>
  );
}
