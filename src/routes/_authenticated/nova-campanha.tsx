import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import { CATEGORIES, BRAZIL_STATES, slugify } from "@/lib/format";
import {
  resolvePhotoStoragePaths,
  revokePhotoDraftPreviews,
  type PhotoDraft,
} from "@/lib/image-upload";
import { logAdminAction } from "@/lib/admin";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/nova-campanha")({
  head: () => ({
    meta: [{ title: "Nova campanha — Ajude Alguém" }, { name: "robots", content: "noindex" }],
  }),
  component: New,
});

const schema = z.object({
  title: z.string().trim().min(5, "Título muito curto").max(120),
  category: z.string().min(1, "Selecione uma categoria"),
  story: z.string().trim().min(50, "Conte sua história com pelo menos 50 caracteres").max(8000),
  goal_amount: z.number().positive("Meta deve ser maior que zero").max(10_000_000),
  pix_key: z.string().trim().min(4, "Informe a chave PIX").max(255),
  beneficiary_name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().length(2, "UF inválida"),
});

function New() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  useEffect(() => () => revokePhotoDraftPreviews(photosRef.current), []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      title: fd.get("title"),
      category,
      story: fd.get("story"),
      goal_amount: Number(fd.get("goal_amount")),
      pix_key: fd.get("pix_key"),
      beneficiary_name: fd.get("beneficiary_name"),
      city: fd.get("city"),
      state,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (photos.length === 0) return toast.error("Envie pelo menos uma foto");

    setBusy(true);
    try {
      const image_paths = await resolvePhotoStoragePaths(user.id, photos);
      const baseSlug = slugify(parsed.data.title);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

      const { data: created, error } = await supabase
        .from("campaigns")
        .insert({
          ...parsed.data,
          slug,
          image_paths,
          image_path: image_paths[0],
          user_id: user.id,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (isAdmin) {
        const { error: approveError } = await supabase
          .from("campaigns")
          .update({ status: "approved" })
          .eq("id", created.id);
        if (approveError) throw approveError;
        await logAdminAction({
          action: "campaign.approve",
          entityType: "campaign",
          entityId: created.id,
          details: { auto: true },
        });
      }

      await qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["home"] });

      toast.success(
        isAdmin
          ? "Campanha publicada! Ela já aparece na página inicial."
          : "Campanha enviada! Nossa equipe revisa antes de publicar.",
      );
      navigate({ to: "/painel" });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String(err.message)
            : "Erro ao criar campanha";
      if (/admin_notifications|trigger/i.test(message)) {
        toast.error(
          "Não foi possível salvar a campanha. Avise o administrador — falta uma configuração no banco.",
        );
      } else if (/bucket|storage|image_paths|column/i.test(message)) {
        toast.error("Erro ao enviar as fotos. Verifique os arquivos ou avise o administrador.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Criar campanha</h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin
            ? "Como administrador, a campanha será publicada assim que você enviar."
            : "Conte sua história. Após enviar, nossa equipe revisa antes de publicar."}
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div>
            <Label htmlFor="title">Título da campanha *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              placeholder="Ex: Ajude o tratamento da Maria"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goal_amount">Meta de arrecadação (R$) *</Label>
              <Input
                id="goal_amount"
                name="goal_amount"
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="5000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="story">História completa *</Label>
            <Textarea
              id="story"
              name="story"
              required
              minLength={50}
              maxLength={8000}
              rows={8}
              placeholder="Conte com detalhes a história e como a doação será usada..."
            />
          </div>

          <CampaignImagePicker value={photos} onChange={setPhotos} disabled={busy} />

          <div>
            <Label htmlFor="pix_key">Chave PIX *</Label>
            <Input
              id="pix_key"
              name="pix_key"
              required
              placeholder="CPF, e-mail, telefone ou aleatória"
            />
          </div>

          <div>
            <Label htmlFor="beneficiary_name">Nome do beneficiário *</Label>
            <Input id="beneficiary_name" name="beneficiary_name" required maxLength={120} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input id="city" name="city" required maxLength={80} />
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
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

          <Button
            type="submit"
            disabled={busy}
            size="lg"
            className="w-full gradient-warm text-primary-foreground shadow-warm"
          >
            {busy ? "Enviando..." : isAdmin ? "Publicar campanha" : "Enviar para análise"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
