import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { campaignProgressPercent } from "@/lib/campaign-display";
import { brl, formatDate } from "@/lib/format";
import { displayCampaignViews, formatViewCount } from "@/lib/campaign-views";
import { CampaignBrandIcon } from "@/components/CampaignCard";
import {
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { SITE_NAME } from "@/lib/site-meta";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [{ title: `Meu painel — ${SITE_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: Painel,
});

function Painel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const {
    data: campaigns,
    isLoading,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Campanha removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waiting = authLoading || !user || isPending || isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold">Meu painel</h1>
            <p className="text-muted-foreground">Gerencie suas campanhas solidárias.</p>
          </div>
          <Button asChild className="gradient-warm text-primary-foreground">
            <Link to="/nova-campanha">
              <Plus className="mr-1.5 h-4 w-4" /> Nova campanha
            </Link>
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground/90">
          Campanhas novas ficam <strong>em análise</strong> e só aparecem no site público depois da
          aprovação.
          {isAdmin && (
            <>
              {" "}
              Você pode aprovar em{" "}
              <Link to="/admin/campanhas" className="font-semibold text-primary hover:underline">
                Campanhas (admin)
              </Link>
              .
            </>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              Não foi possível carregar suas campanhas.{" "}
              <button type="button" className="font-semibold underline" onClick={() => refetch()}>
                Tentar de novo
              </button>
            </div>
          )}
          {waiting && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}
          {!waiting && campaigns && campaigns.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">Você ainda não criou nenhuma campanha.</p>
              <Button asChild className="mt-4 gradient-warm text-primary-foreground">
                <Link to="/nova-campanha">Criar minha primeira campanha</Link>
              </Button>
            </div>
          )}
          {(campaigns ?? []).map((c) => {
            const pct = campaignProgressPercent(c.raised_amount, c.goal_amount);
            const viewTotal = displayCampaignViews(c);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold">{c.title}</h3>
                      {c.status === "pending" && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <Clock className="mr-1 h-3 w-3" /> Em análise
                        </Badge>
                      )}
                      {c.status === "approved" && (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovada
                        </Badge>
                      )}
                      {c.status === "rejected" && (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" /> Rejeitada
                        </Badge>
                      )}
                      {c.status === "correction_requested" && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <Clock className="mr-1 h-3 w-3" /> Correção solicitada
                        </Badge>
                      )}
                      {c.status === "archived" && <Badge variant="outline">Arquivada</Badge>}
                      {c.featured && (
                        <Badge className="bg-accent text-accent-foreground">★ Destaque</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.category} • {c.city}/{c.state}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {c.status === "approved" && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/campanha/$slug" params={{ slug: c.slug }}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link to="/editar/$id" params={{ id: c.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Remover esta campanha?")) del.mutate(c.id);
                      }}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <CampaignBrandIcon size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Doar via PIX
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criada em {formatDate(c.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" aria-hidden />
                        {formatViewCount(viewTotal)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Meta
                        <span className="mt-0.5 block font-semibold text-foreground">
                          {brl(c.goal_amount)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
