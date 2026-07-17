import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CampaignImageGallery } from "@/components/CampaignImageGallery";
import { CampaignPixPanel } from "@/components/CampaignPixPanel";
import { CampaignBrandIcon } from "@/components/CampaignCard";
import { CampaignShareButtons } from "@/components/CampaignShareButtons";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  buildOgImageMeta,
  canonicalHeadLink,
  metaAbsoluteUrl,
  metaOgShareImageUrl,
  SITE_NAME,
} from "@/lib/site-meta";
import {
  CAMPAIGN_ORGANIZER_LABEL,
  COMMENT_AUTHOR_LABEL,
  campaignProgressPercent,
} from "@/lib/campaign-display";
import { brl, formatDate } from "@/lib/format";
import {
  applyCampaignViewBump,
  displayCampaignViews,
  formatViewCount,
  mergeCampaignViewsMonotonic,
  raiseCampaignViewsFloor,
  trackCampaignView,
} from "@/lib/campaign-views";
import { getCampaignImagePaths } from "@/lib/campaign-images";
import { Flag, MapPin, MessageCircle, Eye, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type CampaignRow = Tables<"campaigns">;
type CommentRow = Pick<Tables<"comments">, "id" | "content" | "created_at">;

async function fetchCampaignBySlug(slug: string) {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .eq("hidden", false)
      .maybeSingle();
    if (error) {
      console.warn("[campaign]", error.message);
      return null;
    }
    return data as CampaignRow | null;
  } catch (err) {
    console.warn("[campaign]", err);
    return null;
  }
}

function campaignShareDescription(story?: string | null) {
  const text = (story ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Apoie esta campanha solidária via PIX.";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export const Route = createFileRoute("/campanha/$slug")({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["campaign", params.slug],
      queryFn: async () => {
        const data = await fetchCampaignBySlug(params.slug);
        if (!data) return null;
        const previous = context.queryClient.getQueryData<CampaignRow | null>([
          "campaign",
          params.slug,
        ]);
        const merged = mergeCampaignViewsMonotonic(previous, data);
        return merged;
      },
    }),
  head: ({ loaderData, params }) => {
    const campaign = loaderData as CampaignRow | null | undefined;
    const title = campaign?.title ?? "Campanha solidária";
    const description = campaignShareDescription(campaign?.story);
    return {
      meta: [
        { title: `${title} — ${SITE_NAME}` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: metaAbsoluteUrl(`/campanha/${params.slug}`) },
        { property: "og:type", content: "article" },
        ...buildOgImageMeta(),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: metaOgShareImageUrl() },
      ],
      links: [canonicalHeadLink(`/campanha/${params.slug}`)],
    };
  },
  component: Detail,
});

function Detail() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);

  const {
    data: campaign,
    isPending,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["campaign", slug],
    queryFn: async () => {
      const data = await fetchCampaignBySlug(slug);
      if (!data) return null;
      const previous = qc.getQueryData<CampaignRow | null>(["campaign", slug]);
      const merged = mergeCampaignViewsMonotonic(previous, data);
      raiseCampaignViewsFloor(merged.id, displayCampaignViews(merged));
      return merged;
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", campaign?.id],
    enabled: !!campaign?.id,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("id, content, created_at")
        .eq("campaign_id", campaign!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as CommentRow[];
    },
  });

  const commentMut = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("login");
      const { error } = await supabase.from("comments").insert({
        campaign_id: campaign!.id,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaign?.id] });
      toast.success("Comentário publicado!");
    },
    onError: (e: Error) => toast.error(e.message === "login" ? "Entre para comentar" : e.message),
  });

  const reportMut = useMutation({
    mutationFn: async (reason: string) => {
      if (!user) throw new Error("login");
      const { error } = await supabase.from("reports").insert({
        campaign_id: campaign!.id,
        user_id: user.id,
        report_type: "campanha",
        campaign_reference: campaign!.slug,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Denúncia enviada. Nossa equipe vai analisar.");
      setReportOpen(false);
    },
    onError: (e: Error) => toast.error(e.message === "login" ? "Entre para denunciar" : e.message),
  });

  useEffect(() => {
    if (!campaign?.id || authLoading) return;

    const campaignId = campaign.id;
    const ownerId = campaign.user_id;
    const baseTotal = displayCampaignViews(campaign);

    void (async () => {
      const recorded = await trackCampaignView(campaignId, {
        viewerId: user?.id,
        ownerId,
      });
      if (!recorded) return;

      raiseCampaignViewsFloor(campaignId, baseTotal + 1);
      await applyCampaignViewBump(qc, {
        campaignId,
        slug,
        floorAtLeast: baseTotal + 1,
      });
    })();
    // Intencional: reagir à identidade da campanha, não a cada refetch do objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- campaign fields lidos acima
  }, [
    campaign?.id,
    campaign?.user_id,
    campaign?.views,
    campaign?.soft_views,
    authLoading,
    user?.id,
    slug,
    qc,
  ]);

  const waitingForCampaign = isPending || (isFetching && !campaign);

  if (waitingForCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-12">
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
        <Footer />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Erro ao carregar campanha</h1>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : "Tente novamente em instantes."}
          </p>
          <Button asChild className="mt-6 gradient-warm text-primary-foreground">
            <Link to="/campanhas">Ver outras campanhas</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Campanha não encontrada</h1>
          <p className="mt-2 text-muted-foreground">
            Pode ter sido removida ou ainda estar em aprovação.
          </p>
          <Button asChild className="mt-6 gradient-warm text-primary-foreground">
            <Link to="/campanhas">Ver outras campanhas</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pct = campaignProgressPercent(campaign.raised_amount, campaign.goal_amount);
  const imagePaths = getCampaignImagePaths(campaign);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="order-2 lg:order-1 lg:col-span-2">
            <CampaignImageGallery paths={imagePaths} alt={campaign.title} />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                {campaign.category}
              </Badge>
              {campaign.featured && (
                <Badge className="bg-accent text-accent-foreground">★ Em destaque</Badge>
              )}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {campaign.city}/{campaign.state}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                {formatViewCount(displayCampaignViews(campaign))} visualizações
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
              {campaign.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong className="text-foreground">{CAMPAIGN_ORGANIZER_LABEL}</strong>
              {" • "}
              Beneficiário: <strong className="text-foreground">{campaign.beneficiary_name}</strong>
            </p>

            <article className="prose mt-6 max-w-none whitespace-pre-wrap text-sm text-foreground/90 sm:mt-8 sm:text-base">
              {campaign.story}
            </article>

            <AdSlot className="mt-10" placement="campaign" />

            <section className="mt-10">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <MessageCircle className="h-5 w-5" /> Mensagens de apoio
              </h2>
              {user ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const content = String(fd.get("content") || "").trim();
                    if (content.length < 1) return;
                    commentMut.mutate(content);
                    (e.currentTarget as HTMLFormElement).reset();
                  }}
                  className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4"
                >
                  <Textarea
                    name="content"
                    placeholder="Deixe uma mensagem carinhosa..."
                    maxLength={1000}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={commentMut.isPending}
                    className="gradient-warm text-primary-foreground"
                  >
                    Publicar mensagem
                  </Button>
                </form>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <Link to="/auth" className="font-semibold text-primary hover:underline">
                    Entre
                  </Link>{" "}
                  para deixar uma mensagem de apoio.
                </p>
              )}
              <ul className="mt-5 space-y-4">
                {(comments ?? []).map((c) => (
                  <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-sm">
                      <strong>{COMMENT_AUTHOR_LABEL}</strong>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">{c.content}</p>
                  </li>
                ))}
                {comments && comments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Seja o primeiro a apoiar com palavras.
                  </p>
                )}
              </ul>
            </section>

            <section className="mt-12 rounded-2xl border border-border bg-card p-6 text-center shadow-soft sm:p-8">
              <h2 className="font-display text-xl font-bold sm:text-2xl">Conheça outras causas</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore mais campanhas solidárias e ajude quem precisa.
              </p>
              <Button asChild className="mt-5 gradient-warm text-primary-foreground">
                <Link to="/campanhas">
                  Ver campanhas <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </section>
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                <CampaignBrandIcon />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Doar via PIX
                  </p>
                  <p className="text-sm text-muted-foreground">Contribua com qualquer valor</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Criada em
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                  {formatDate(campaign.created_at)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Meta da campanha:{" "}
                  <strong className="text-foreground">{brl(campaign.goal_amount)}</strong>
                </p>
              </div>

              <Progress value={pct} className="mt-4 h-3" />

              <div className="mt-6">
                <CampaignPixPanel
                  pixKey={campaign.pix_key}
                  campaignSlug={campaign.slug}
                  beneficiaryName={campaign.beneficiary_name}
                  city={campaign.city}
                />
              </div>

              <CampaignShareButtons title={campaign.title} campaignSlug={campaign.slug} />

              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full text-muted-foreground hover:text-destructive"
                  >
                    <Flag className="mr-1.5 h-4 w-4" /> Denunciar campanha
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Denunciar campanha</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!user) {
                        toast.error("Entre para denunciar");
                        return;
                      }
                      const fd = new FormData(e.currentTarget);
                      const reason = String(fd.get("reason") || "").trim();
                      if (reason.length < 5) {
                        toast.error("Descreva o motivo (mín. 5 caracteres)");
                        return;
                      }
                      reportMut.mutate(reason);
                      (e.currentTarget as HTMLFormElement).reset();
                    }}
                    className="space-y-3"
                  >
                    <Textarea
                      name="reason"
                      placeholder="Explique o motivo da denúncia..."
                      minLength={5}
                      maxLength={1000}
                      required
                    />
                    <DialogFooter className="flex-col gap-2 sm:flex-col">
                      <Button type="submit" variant="destructive" className="w-full">
                        Enviar denúncia
                      </Button>
                      <Button asChild variant="link" className="h-auto p-0 text-xs">
                        <Link to="/denuncias" search={{ campanha: campaign.slug }}>
                          Abrir canal completo de denúncias
                        </Link>
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
