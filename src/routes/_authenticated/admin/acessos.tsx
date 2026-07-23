import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { profileNameFromMap, resolveProfileNames } from "@/lib/profile-names";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  component: AdminAccessLogs,
});

function AdminAccessLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin", "access-logs"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("access_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const names = await resolveProfileNames(
        (rows ?? []).map((l) => l.user_id).filter((id): id is string => !!id),
      );
      return (rows ?? []).map((l) => ({
        ...l,
        user_name: l.user_id ? profileNameFromMap(names, l.user_id) : "—",
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Logs de acesso</h1>
        <p className="text-muted-foreground">
          IP, data e hora (Marco Civil — retenção mínima de 6 meses). Use sob ordem judicial ou
          requisição policial válida.
        </p>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-4 py-3 font-medium">{log.user_name}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{log.action}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.ip_address}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground">
                  {[log.entity_type, log.entity_id, log.path].filter(Boolean).join(" · ") || "—"}
                </td>
              </tr>
            ))}
            {!isLoading && (logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum registro ainda. Rode o SQL de access_logs no Supabase e use o site
                  logado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
