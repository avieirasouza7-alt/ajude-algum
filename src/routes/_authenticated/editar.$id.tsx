import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
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
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  const { data: c, isLoading } = useQuery({
    queryKey: ["edit-campaign", id],
    queryFn: async () =>
      (await supabase.from("campaigns").select("*").eq("id", id).maybeSingle()).data,
  });

  useEffect(() => {
    if (c) {
      setCategory(c.category);
      setState(c.state);
    }
  }, [c]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const update: TablesUpdate<"campaigns"> = {
      title: String(fd.get("title")),
      category,
      story: String(fd.get("story")),
      goal_amount: Number(fd.get("goal_amount")),
      pix_key: String(fd.get("pix_key")),
      beneficiary_name: String(fd.get("beneficiary_name")),
      city: String(fd.get("city")),
      state,
    };
    // se já estava aprovada e o dono edita, volta para "pending"
    if (c?.status === "approved") update.status = "pending";
    const { error } = await supabase.from("campaigns").update(update).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Campanha atualizada!");
    navigate({ to: "/painel" });
  };

  if (isLoading || !c) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold">Editar campanha</h1>
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
              <Link to="/painel">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="flex-1 gradient-warm text-primary-foreground"
            >
              Salvar alterações
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
