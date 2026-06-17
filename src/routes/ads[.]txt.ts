import { createFileRoute } from "@tanstack/react-router";
import { buildAdsTxt, getAdSenseEnv } from "@/lib/adsense";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const clientId = getAdSenseEnv().clientId;
        const body = buildAdsTxt(clientId);

        if (!body) {
          return new Response(
            "# AdSense: defina VITE_ADSENSE_CLIENT_ID ou configure no painel admin\n",
            {
              status: 404,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          );
        }

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
