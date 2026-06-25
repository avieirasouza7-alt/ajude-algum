import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart3,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  MousePointerClick,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { fetchAdminAnalyticsDashboard } from "@/lib/admin/analytics";
import { fetchSiteVisitStats, formatViewCount } from "@/lib/site-visits";
import { ANALYTICS_EVENT_LABELS, formatDuration, labelAnalyticsPath } from "@/lib/site-analytics";
import { isGaEnabled } from "@/lib/analytics";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — Admin Ajude Alguém" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const [days, setDays] = useState("30");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => fetchAdminAnalyticsDashboard(Number(days)),
    refetchInterval: 60_000,
  });

  const { data: liveStats } = useQuery({
    queryKey: ["admin", "site-visits"],
    queryFn: fetchSiteVisitStats,
    refetchInterval: 15_000,
  });

  const chartDays =
    data?.visits_by_day?.map((row) => ({
      day: row.day.slice(5),
      visits: row.visits,
    })) ?? [];

  const referrerChart =
    data?.top_referrers?.slice(0, 6).map((row) => ({
      name: row.source,
      visits: row.visits,
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <AdminPageHeader
          title="Analytics do site"
          description="De onde vêm os visitantes, quanto tempo ficam e o que mais acessam nas páginas públicas."
          actions={
            <>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                Atualizar
              </Button>
              <Button asChild variant="outline">
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                  Google Analytics <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            </>
          }
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <p className="font-semibold">Não foi possível carregar os relatórios.</p>
          <p className="mt-1 text-muted-foreground">
            Execute o SQL em <code className="text-xs">scripts/apply-site-analytics.sql</code> no
            Supabase (SQL Editor).
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Visitantes hoje"
          value={isLoading ? "—" : formatViewCount(data?.visits_today ?? 0)}
          hint="Sessões únicas"
          icon={Users}
          accent="emerald"
        />
        <StatCard
          title={`Visitantes (${days}d)`}
          value={isLoading ? "—" : formatViewCount(data?.visits_period ?? 0)}
          hint={`${formatViewCount(data?.page_views_period ?? 0)} páginas vistas`}
          icon={Eye}
          accent="sky"
        />
        <StatCard
          title="Tempo médio na página"
          value={isLoading ? "—" : formatDuration(data?.avg_time_on_page_seconds ?? 0)}
          hint="Antes de sair ou mudar de página"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="Online agora"
          value={formatViewCount(liveStats?.activeNow ?? 0)}
          hint={`${formatViewCount(liveStats?.totalVisits ?? 0)} visitas totais (legado)`}
          icon={TrendingUp}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Visitantes por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda sem dados. Navegue no site público para começar a registrar visitas.
              </p>
            ) : (
              <ChartContainer
                config={{ visits: { label: "Visitantes" } }}
                className="h-[260px] w-full"
              >
                <LineChart data={chartDays}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="hsl(152 60% 40%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> De onde vêm
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrerChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem origens registradas ainda.</p>
            ) : (
              <ChartContainer
                config={{ visits: { label: "Visitas" } }}
                className="h-[260px] w-full"
              >
                <BarChart data={referrerChart} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visits" fill="hsl(200 70% 50%)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Páginas mais vistas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(data?.top_pages ?? []).map((row) => (
                <li
                  key={row.path}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                >
                  <span className="truncate font-medium">{labelAnalyticsPath(row.path)}</span>
                  <span className="shrink-0 text-muted-foreground">{row.views} views</span>
                </li>
              ))}
              {!isLoading && (data?.top_pages?.length ?? 0) === 0 && (
                <p className="text-muted-foreground">Nenhuma página registrada ainda.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>Campanhas mais vistas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(data?.top_campaigns ?? []).map((row) => (
                <li
                  key={row.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
                >
                  <span className="truncate font-medium">{row.title}</span>
                  <span className="shrink-0 text-muted-foreground">{row.views} views</span>
                </li>
              ))}
              {!isLoading && (data?.top_campaigns?.length ?? 0) === 0 && (
                <p className="text-muted-foreground">Nenhuma campanha visitada ainda.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary" /> Ações dos visitantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(data?.top_events ?? []).map((row) => (
              <li
                key={row.type}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm"
              >
                <span>{ANALYTICS_EVENT_LABELS[row.type] ?? row.type}</span>
                <span className="font-semibold text-primary">{row.total}</span>
              </li>
            ))}
            {!isLoading && (data?.top_events?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Ainda sem cliques em PIX ou compartilhamentos registrados.
              </p>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card className="border border-primary/20 bg-primary/5 shadow-soft">
        <CardContent className="space-y-3 p-6 text-sm">
          <p className="font-semibold">Google Analytics</p>
          {isGaEnabled() ? (
            <p className="text-muted-foreground">
              O ID de medição GA4 está ativo no site. Os eventos também são enviados ao Google em
              paralelo. Relatórios avançados:{" "}
              <a
                href="https://analytics.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                analytics.google.com
              </a>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Para espelhar dados no Google Analytics, configure{" "}
              <code className="text-xs">VITE_GA_MEASUREMENT_ID=G-XXXXXXXX</code> nas variáveis do
              Cloudflare e faça redeploy. O painel acima funciona sem o Google.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Dados agregados — não mostram identidade individual dos visitantes (privacidade).
            Atualizado em tempo quase real · período desde {data?.days ? `${data.days} dias` : "—"}.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/configuracoes">Configurações do site</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Primeira coleta após aplicar o SQL no Supabase · {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}
