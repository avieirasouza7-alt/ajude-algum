import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CampaignCard, type CampaignCardData } from "@/components/CampaignCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/format";
import { Search } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { applyPublicCampaignFilters, CAMPAIGN_CARD_SELECT } from "@/lib/campaign-queries";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — Ajude Alguém" },
      { name: "description", content: "Explore campanhas solidárias ativas em todo o Brasil." },
      { property: "og:title", content: "Campanhas — Ajude Alguém" },
      { property: "og:url", content: "/campanhas" },
    ],
    links: [{ rel: "canonical", href: "/campanhas" }],
  }),
  component: List,
});

function List() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", cat],
    queryFn: async () => {
      let query = applyPublicCampaignFilters(
        supabase.from("campaigns").select(CAMPAIGN_CARD_SELECT).order("created_at", { ascending: false }),
      );
      if (cat !== "todas") query = query.eq("category", cat);
      const { data } = await query;
      return (data ?? []) as CampaignCardData[];
    },
  });

  const filtered = (data ?? []).filter((c) =>
    !q ? true : (c.title + " " + c.city + " " + c.state).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Todas as campanhas</h1>
        <p className="mt-2 text-muted-foreground">Encontre uma causa para apoiar hoje.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, cidade ou estado..."
              className="pl-9"
            />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AdSlot className="mt-8" placement="list" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
              ))
            : filtered.map((c) => <CampaignCard key={c.id} c={c} />)}
        </div>
        {!isLoading && filtered.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">Nenhuma campanha encontrada.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
