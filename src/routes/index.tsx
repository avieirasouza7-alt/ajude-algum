import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CampaignCard, type CampaignCardData } from "@/components/CampaignCard";
import { AdSlot } from "@/components/AdSlot";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { applyPublicCampaignFilters, CAMPAIGN_CARD_SELECT } from "@/lib/campaign-queries";
import { absoluteSiteUrl, buildDefaultOgMeta } from "@/lib/site-meta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ajude Alguém — Vaquinhas solidárias com PIX" },
      {
        name: "description",
        content:
          "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência e o poder da comunidade.",
      },
      ...buildDefaultOgMeta({
        title: "Ajude Alguém — Vaquinhas solidárias",
        description:
          "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência.",
        path: "/",
      }),
    ],
    links: [{ rel: "canonical", href: absoluteSiteUrl("/") }],
  }),
  component: Home,
});

async function fetchHome() {
  const [featured, recent] = await Promise.all([
    applyPublicCampaignFilters(
      supabase
        .from("campaigns")
        .select(CAMPAIGN_CARD_SELECT)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    applyPublicCampaignFilters(
      supabase
        .from("campaigns")
        .select(CAMPAIGN_CARD_SELECT)
        .order("created_at", { ascending: false })
        .limit(6),
    ),
  ]);
  return {
    featured: (featured.data ?? []) as CampaignCardData[],
    recent: (recent.data ?? []) as CampaignCardData[],
  };
}

function Home() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: fetchHome });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <HeroCarousel />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {data && data.featured.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                  ⭐ Campanhas em destaque
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Histórias selecionadas que precisam da sua ajuda agora.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.featured.map((c) => (
                <CampaignCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        )}

        <AdSlot className="mt-12" placement="home" />

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Campanhas recentes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recém-publicadas pela comunidade.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/campanhas">
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.recent ?? []).map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
            {data && data.recent.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <HeartHandshake className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  Ainda não há campanhas aprovadas. Seja o primeiro!
                </p>
                <Button asChild className="mt-4 gradient-warm text-primary-foreground">
                  <Link to="/nova-campanha">Criar a primeira campanha</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-20 rounded-3xl bg-card p-8 shadow-soft sm:p-12">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                t: "1. Crie",
                d: "Cadastre sua campanha com história, foto e chave PIX em poucos minutos.",
              },
              {
                t: "2. Compartilhe",
                d: "Divulgue no WhatsApp e redes sociais para mobilizar sua rede.",
              },
              {
                t: "3. Receba",
                d: "As contribuições chegam direto na sua chave PIX. Sem intermediários.",
              },
            ].map((s) => (
              <div key={s.t}>
                <div className="grid h-10 w-10 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
