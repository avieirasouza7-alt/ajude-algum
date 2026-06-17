import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
import { toast } from "sonner";
import { z } from "zod";
import { Upload } from "lucide-react";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

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
    if (!file) return toast.error("Envie uma foto principal");

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("campaign-images")
        .upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      const baseSlug = slugify(parsed.data.title);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

      const { error } = await supabase.from("campaigns").insert({
        ...parsed.data,
        slug,
        image_path: path,
        user_id: user.id,
        status: "pending",
      });
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      await qc.invalidateQueries({ queryKey: ["admin"] });

      toast.success("Campanha enviada! Ela aparece no seu painel e será publicada após aprovação.");
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
      } else if (/bucket|storage/i.test(message)) {
        toast.error("Erro ao enviar a foto. Verifique o arquivo e tente outra imagem.");
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
          Conte sua história. Após enviar, nossa equipe revisa antes de publicar.
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

          <div>
            <Label>Foto principal *</Label>
            <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground hover:border-primary hover:bg-primary/5">
              {preview ? (
                <img src={preview} alt="" className="max-h-48 rounded-lg" />
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span>Clique para enviar uma foto (jpg, png)</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

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
            {busy ? "Enviando..." : "Enviar para análise"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
