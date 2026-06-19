import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CampaignImageGallery } from "@/components/CampaignImageGallery";
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
import { brl, formatDate } from "@/lib/format";
import { formatViewCount, trackCampaignView } from "@/lib/campaign-views";
import { getCampaignImagePaths } from "@/lib/campaign-images";
import { Copy, Share2, Flag, MapPin, MessageCircle, Check, Eye } from "lucide-react";
import { toast } from "sonner";

type ProfileName = Pick<Tables<"profiles">, "full_name">;
type CampaignWithProfile = Tables<"campaigns"> & {
  profiles: ProfileName | null;
};
type CommentWithProfile = Pick<Tables<"comments">, "id" | "content" | "created_at"> & {
  profiles: (ProfileName & Pick<Tables<"profiles">, "avatar_url">) | null;
};

async function fetchCampaignBySlug(slug: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user_id)
    .maybeSingle();

  return { ...data, profiles: profile } as CampaignWithProfile;
}

export const Route = createFileRoute("/campanha/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["campaign", params.slug],
      queryFn: () => fetchCampaignBySlug(params.slug),
    }),
  head: ({ params }) => ({
    meta: [
      { title: `Campanha — Ajude Alguém` },
      { name: "description", content: "Apoie esta campanha solidária via PIX." },
      { property: "og:title", content: "Campanha solidária — Ajude Alguém" },
      { property: "og:url", content: `/campanha/${params.slug}` },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: `/campanha/${params.slug}` }],
  }),
  component: Detail,
});

function Detail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const {
    data: campaign,
    isPending,
    isFetching,
    isFetched,
    isError,
    error,
  } = useQuery({
    queryKey: ["campaign", slug],
    queryFn: () => fetchCampaignBySlug(slug),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", campaign?.id],
    enabled: !!campaign?.id,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("campaign_id", campaign!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!rows?.length) return [];

      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return rows.map((row) => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        profiles: profileById.get(row.user_id) ?? null,
      })) as CommentWithProfile[];
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
    onSuccess: () => toast.success("Denúncia enviada. Nossa equipe vai analisar."),
    onError: (e: Error) => toast.error(e.message === "login" ? "Entre para denunciar" : e.message),
  });

  useEffect(() => {
    if (!campaign?.id) return;
    trackCampaignView(campaign.id).then((recorded) => {
      if (!recorded) return;
      qc.setQueryData<CampaignWithProfile | null>(["campaign", slug], (current) =>
        current ? { ...current, views: (current.views ?? 0) + 1 } : current,
      );
    });
  }, [campaign?.id, slug, qc]);

  const waitingForCampaign = isPending || (isFetching && !campaign);

  if (waitingForCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-5xl animate-pulse px-4 py-12">
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
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
  if (!campaign && isFetched) {
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
  if (!campaign) return null;

  const pct = Math.min(
    100,
    Math.round((Number(campaign.raised_amount) / Number(campaign.goal_amount)) * 100),
  );
  const imagePaths = getCampaignImagePaths(campaign);

  const copyPix = async () => {
    await navigator.clipboard.writeText(campaign.pix_key);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsapp = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Ajude a campanha "${campaign.title}" no Ajude Alguém: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
              {formatViewCount(campaign.views ?? 0)} visualizações
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            {campaign.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Criada por{" "}
            <strong className="text-foreground">{campaign.profiles?.full_name ?? "anônimo"}</strong>{" "}
            • Beneficiário: <strong className="text-foreground">{campaign.beneficiary_name}</strong>
          </p>

          <article className="prose mt-8 max-w-none whitespace-pre-wrap text-foreground/90">
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
                    <strong>{c.profiles?.full_name ?? "Anônimo"}</strong>
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
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-3xl font-extrabold text-primary">{brl(campaign.raised_amount)}</p>
            <p className="text-sm text-muted-foreground">
              arrecadado de <strong>{brl(campaign.goal_amount)}</strong>
            </p>
            <Progress value={pct} className="mt-4 h-3" />
            <p className="mt-2 text-xs text-muted-foreground">{pct}% da meta</p>

            <div className="mt-6 rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Chave PIX
              </p>
              <p className="mt-1 break-all font-mono text-sm">{campaign.pix_key}</p>
              <Button
                onClick={copyPix}
                className="mt-3 w-full gradient-warm text-primary-foreground"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" /> Copiar chave PIX
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={shareWhatsapp}
              variant="outline"
              className="mt-3 w-full border-success/40 text-success hover:bg-success/10 hover:text-success"
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar no WhatsApp
            </Button>

            <Dialog>
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
                    (e.currentTarget.closest("[role=dialog]") as HTMLElement)
                      ?.querySelector<HTMLButtonElement>("[aria-label=Close]")
                      ?.click();
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
                      <Link
                        to="/denuncias"
                        search={{ campanha: campaign.slug }}
                      >
                        Abrir canal completo de denúncias
                      </Link>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
