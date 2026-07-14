import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CampaignImagePicker } from "@/components/CampaignImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCampaignImagePaths,
  getRemovedStoragePaths,
  photoDraftsFromStoragePaths,
} from "@/lib/campaign-images";
import {
  resolvePhotoStoragePaths,
  revokePhotoDraftPreviews,
  type PhotoDraft,
} from "@/lib/image-upload";
import { CATEGORIES, BRAZIL_STATES } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/editar/$id")({
  head: () => ({
    meta: [{ title: "Editar campanha — Ajude Alguém" }, { name: "robots", content: "noindex" }],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [photosReady, setPhotosReady] = useState(false);
  const initialPaths = useRef<string[]>([]);
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  const {
    data: c,
    isLoading,
    isPending,
    isError,
    isFetched,
  } = useQuery({
    queryKey: ["edit-campaign", id, user?.id, isAdmin],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      let query = supabase.from("campaigns").select("*").eq("id", id);
      if (!isAdmin) query = query.eq("user_id", user.id);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!c) {
      setPhotosReady(false);
      return;
    }
    setCategory(c.category);
    setState(c.state);
    const paths = getCampaignImagePaths(c);
    initialPaths.current = paths;
    let cancelled = false;
    setPhotosReady(false);
    photoDraftsFromStoragePaths(paths)
      .then((drafts) => {
        if (cancelled) return;
        setPhotos(drafts);
      })
      .catch(() => {
        if (cancelled) return;
        setPhotos([]);
        toast.error("Não foi possível carregar as fotos da campanha.");
      })
      .finally(() => {
        if (!cancelled) setPhotosReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [c]);

  useEffect(() => () => revokePhotoDraftPreviews(photosRef.current.filter((p) => p.file)), []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !c) return;
    if (!category) return toast.error("Selecione uma categoria");
    if (!state) return toast.error("Selecione a UF");
    if (photos.length === 0) return toast.error("Envie pelo menos uma foto");

    const fd = new FormData(e.currentTarget);
    const goalAmount = Number(fd.get("goal_amount"));
    if (!Number.isFinite(goalAmount) || goalAmount <= 0) {
      return toast.error("Meta deve ser maior que zero");
    }
    const raisedAmount = Math.max(0, Number(fd.get("raised_amount")) || 0);

    setBusy(true);
    try {
      const removed = getRemovedStoragePaths(initialPaths.current, photos);
      const image_paths = await resolvePhotoStoragePaths(user.id, photos, removed);

      const update: TablesUpdate<"campaigns"> = {
        title: String(fd.get("title")),
        category,
        story: String(fd.get("story")),
        goal_amount: goalAmount,
        raised_amount: Math.min(goalAmount, raisedAmount),
        pix_key: String(fd.get("pix_key")),
        beneficiary_name: String(fd.get("beneficiary_name")),
        city: String(fd.get("city")),
        state,
        image_paths,
        image_path: image_paths[0] ?? null,
      };
      if (c.status === "approved" && !isAdmin) update.status = "pending";

      let updateQuery = supabase.from("campaigns").update(update).eq("id", id);
      if (!isAdmin) updateQuery = updateQuery.eq("user_id", user.id);
      const { error } = await updateQuery;
      if (error) throw error;

      toast.success("Campanha atualizada!");
      navigate({ to: isAdmin ? "/admin/campanhas" : "/painel" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar campanha");
    } finally {
      setBusy(false);
    }
  };

  const waitingAuth = authLoading || !user;
  const waitingCampaign = waitingAuth || isPending || isLoading || (Boolean(c) && !photosReady);

  if (waitingCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || (isFetched && !c)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Campanha não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta campanha não existe ou você não tem permissão para editá-la.
          </p>
          <Button asChild className="mt-6">
            <Link to={isAdmin ? "/admin/campanhas" : "/painel"}>
              {isAdmin ? "Voltar ao admin" : "Voltar ao painel"}
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!c) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">
          Editar campanha{isAdmin ? " (admin)" : ""}
        </h1>
        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div>
            <Label>Título *</Label>
            <Input name="title" required defaultValue={c.title} maxLength={120} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta (R$) *</Label>
              <Input
                name="goal_amount"
                type="number"
                step="0.01"
                min="1"
                required
                defaultValue={c.goal_amount}
              />
            </div>
            <div>
              <Label>Arrecadado (R$)</Label>
              <Input
                name="raised_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={c.raised_amount}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Atualize conforme o extrato do seu banco (PIX cai direto na sua conta).
              </p>
            </div>
          </div>
          <div>
            <Label>História *</Label>
            <Textarea
              name="story"
              required
              minLength={50}
              maxLength={8000}
              rows={8}
              defaultValue={c.story}
            />
          </div>

          <CampaignImagePicker value={photos} onChange={setPhotos} disabled={busy} />

          <div>
            <Label>Chave PIX *</Label>
            <Input name="pix_key" required defaultValue={c.pix_key} />
          </div>
          <div>
            <Label>Beneficiário *</Label>
            <Input
              name="beneficiary_name"
              required
              defaultValue={c.beneficiary_name}
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label>Cidade *</Label>
              <Input name="city" required defaultValue={c.city} maxLength={80} />
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAZIL_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link to={isAdmin ? "/admin/campanhas" : "/painel"}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="flex-1 gradient-warm text-primary-foreground"
            >
              {busy ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
