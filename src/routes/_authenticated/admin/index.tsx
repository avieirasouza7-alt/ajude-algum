import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Megaphone,
  ShieldAlert,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/StatCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardStats } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: async () => {
      const [campaigns, logs] = await Promise.all([
        supabase
          .from("campaigns")
          .select("id, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("admin_audit_logs")
          .select("id, action, created_at, details")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return {
        campaigns: campaigns.data ?? [],
        logs: logs.data ?? [],
      };
    },
  });

  const chartData = stats
    ? [
        { name: "Aprovadas", total: stats.approved_campaigns, fill: "hsl(152 60% 45%)" },
        { name: "Pendentes", total: stats.pending_campaigns, fill: "hsl(45 90% 55%)" },
        { name: "Rejeitadas", total: stats.rejected_campaigns, fill: "hsl(0 70% 55%)" },
        { name: "Correção", total: stats.correction_campaigns, fill: "hsl(200 70% 50%)" },
        { name: "Arquivadas", total: stats.archived_campaigns, fill: "hsl(220 10% 50%)" },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <AdminPageHeader
          title="Bem-vindo ao painel"
          description="Acompanhe campanhas, denúncias e a saúde da plataforma."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/admin/campanhas">
                  Campanhas <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="gradient-warm text-primary-foreground shadow-warm">
                <Link to="/admin/denuncias">Ver denúncias</Link>
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Usuários"
          value={stats?.total_users ?? 0}
          hint={`${stats?.active_users ?? 0} ativos`}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          title="Novos (7 dias)"
          value={stats?.new_users_7d ?? 0}
          icon={TrendingUp}
          accent="sky"
        />
        <StatCard
          title="Campanhas"
          value={stats?.total_campaigns ?? 0}
          hint={`${stats?.pending_campaigns ?? 0} aguardando análise`}
          icon={Megaphone}
          accent="amber"
        />
        <StatCard
          title="Denúncias abertas"
          value={stats?.open_reports ?? 0}
          hint={`${stats?.total_reports ?? 0} registradas`}
          icon={ShieldAlert}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle>Campanhas por status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: "Campanhas" } }} className="h-[280px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="font-display text-3xl font-extrabold text-primary">
                {stats?.total_comments ?? 0}
              </p>
              <p className="mt-1 text-muted-foreground">comentários publicados</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ações rápidas
              </p>
              {[
                { to: "/admin/campanhas", label: "Analisar campanhas" },
                { to: "/admin/denuncias", label: "Resolver denúncias" },
                { to: "/admin/usuarios", label: "Gerenciar usuários" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  {item.label}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Campanhas recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(recentActivity?.campaigns ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm"
                >
                  <span className="truncate font-medium">{c.title}</span>
                  <Badge variant="outline">{c.status}</Badge>
                </li>
              ))}
              {!recentActivity?.campaigns?.length && (
                <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(recentActivity?.logs ?? []).map((log) => (
                <li key={log.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                </li>
              ))}
              {!recentActivity?.logs?.length && (
                <p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
