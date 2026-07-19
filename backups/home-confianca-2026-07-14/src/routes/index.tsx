import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DonationSection } from "@/components/DonationSection";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CampaignHowToCarousel } from "@/components/CampaignHowToCarousel";
import { CampaignCard, type CampaignCardData } from "@/components/CampaignCard";
import { AdSlot } from "@/components/AdSlot";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { applyPublicCampaignFilters, CAMPAIGN_CARD_SELECT } from "@/lib/campaign-queries";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE_NAME} — Vaquinhas solidárias com PIX` },
      {
        name: "description",
        content:
          "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência e o poder da comunidade.",
      },
      ...buildDefaultOgMeta({
        title: `${SITE_NAME} — Vaquinhas solidárias`,
        description: "Crie e apoie campanhas de arrecadação via PIX. Sem taxas, com transparência.",
        path: "/",
        includeImage: false,
      }),
    ],
    links: [canonicalHeadLink("/")],
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
  if (featured.error) throw featured.error;
  if (recent.error) throw recent.error;
  return {
    featured: (featured.data ?? []) as CampaignCardData[],
    recent: (recent.data ?? []) as CampaignCardData[],
  };
}

function Home() {
  const { data, isError, refetch } = useQuery({ queryKey: ["home"], queryFn: fetchHome });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <HeroCarousel />

      {isError && (
        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as campanhas. Tente novamente.
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <CampaignHowToCarousel />

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
            <Button asChild variant="ghost" size="sm">
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
          {(data?.recent?.length ?? 0) > 0 && (
            <div className="mt-8 flex justify-center sm:hidden">
              <Button asChild className="gradient-warm text-primary-foreground">
                <Link to="/campanhas">
                  Ver campanhas <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
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

        <DonationSection />
      </main>

      <Footer />
    </div>
  );
}
