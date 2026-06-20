import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getSiteBaseUrl } from "@/lib/campaign-queries";

const STATIC_PATHS = ["/", "/campanhas", "/sobre", "/denuncias", "/termos-de-uso", "/politica-de-privacidade"];

function createSitemapClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const baseUrl = getSiteBaseUrl(request).replace(/\/$/, "");
        const paths = [...STATIC_PATHS];

        try {
          const supabase = createSitemapClient();
          if (supabase) {
            const { data } = await supabase
              .from("campaigns")
              .select("slug")
              .eq("status", "approved")
              .eq("hidden", false)
              .order("updated_at", { ascending: false })
              .limit(500);
            for (const row of data ?? []) {
              paths.push(`/campanha/${row.slug}`);
            }
          }
        } catch {
          /* mantém só páginas estáticas */
        }

        const urls = paths
          .map(
            (p) =>
              `  <url>\n    <loc>${baseUrl}${p}</loc>\n    <changefreq>daily</changefreq>\n  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
