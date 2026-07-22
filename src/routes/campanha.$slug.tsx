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
import { formatCommentAuthorName, campaignProgressPercent } from "@/lib/campaign-display";
import { profileNameFromMap, resolveProfileNames } from "@/lib/profile-names";
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
import { fetchCommentHeartStats, toggleCommentHeart } from "@/lib/comment-hearts";
import { Flag, MapPin, MessageCircle, Eye, ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";

type CampaignRow = Tables<"campaigns">;
type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  heart_count: number;
  liked_by_me: boolean;
};

type CampaignDetail = CampaignRow & { organizer_name: string };

async function fetchCampaignBySlug(slug: string): Promise<CampaignDetail | null> {
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
    if (!data) return null;
    const names = await resolveProfileNames([data.user_id]);
    return {
      ...(data as CampaignRow),
      organizer_name: profileNameFromMap(names, data.user_id),
    };
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
        const previous = context.queryClient.getQueryData<CampaignDetail | null>([
          "campaign",
          params.slug,
        ]);
        const merged = mergeCampaignViewsMonotonic(previous, data);
        return {
          ...merged,
          organizer_name:
            data.organizer_name || previous?.organizer_name || formatCommentAuthorName(null),
        };
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
      const previous = qc.getQueryData<CampaignDetail | null>(["campaign", slug]);
      const merged = mergeCampaignViewsMonotonic(previous, data);
      raiseCampaignViewsFloor(merged.id, displayCampaignViews(merged));
      return {
        ...merged,
        organizer_name:
          data.organizer_name || previous?.organizer_name || formatCommentAuthorName(null),
      };
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", campaign?.id, user?.id ?? "anon"],
    enabled: !!campaign?.id,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("campaign_id", campaign!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list = rows ?? [];
      const [nameById, heartStats] = await Promise.all([
        resolveProfileNames(list.map((row) => row.user_id)),
        fetchCommentHeartStats(
          list.map((row) => row.id),
          user?.id,
        ),
      ]);

      return list.map((row) => {
        const hearts = heartStats.get(row.id) ?? { count: 0, likedByMe: false };
        return {
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          author_name: profileNameFromMap(nameById, row.user_id),
          heart_count: hearts.count,
          liked_by_me: hearts.likedByMe,
        };
      }) as CommentRow[];
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

  const heartMut = useMutation({
    mutationFn: async (comment: CommentRow) => {
      if (!user) throw new Error("login");
      return toggleCommentHeart(comment.id, user.id, comment.liked_by_me);
    },
    onMutate: async (comment) => {
      const key = ["comments", campaign?.id, user?.id ?? "anon"] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CommentRow[]>(key);
      qc.setQueryData<CommentRow[]>(key, (rows) =>
        (rows ?? []).map((row) => {
          if (row.id !== comment.id) return row;
          const nextLiked = !row.liked_by_me;
          return {
            ...row,
            liked_by_me: nextLiked,
            heart_count: Math.max(0, row.heart_count + (nextLiked ? 1 : -1)),
          };
        }),
      );
      return { previous, key };
    },
    onError: (e: Error, _comment, ctx) => {
      if (ctx?.previous && ctx.key) qc.setQueryData(ctx.key, ctx.previous);
      toast.error(e.message === "login" ? "Entre para enviar um coração" : e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaign?.id] });
    },
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
              Organizado por: <strong className="text-foreground">{campaign.organizer_name}</strong>
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
                      <strong>{c.author_name}</strong>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">{c.content}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            toast.error("Entre para enviar um coração");
                            return;
                          }
                          heartMut.mutate(c);
                        }}
                        disabled={heartMut.isPending}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          c.liked_by_me
                            ? "border-rose-300 bg-rose-50 text-rose-600"
                            : "border-border bg-background text-muted-foreground hover:border-rose-200 hover:text-rose-600"
                        }`}
                        aria-label={c.liked_by_me ? "Remover coração" : "Enviar coração"}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${c.liked_by_me ? "fill-current" : ""}`}
                          aria-hidden
                        />
                        {c.heart_count > 0 ? c.heart_count : "Curtir"}
                      </button>
                    </div>
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
                  {brl(campaign.raised_amount)} arrecadados de{" "}
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
