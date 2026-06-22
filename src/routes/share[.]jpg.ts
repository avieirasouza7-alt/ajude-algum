import { createFileRoute } from "@tanstack/react-router";
import { getOgShareImageBytes } from "@/lib/og-share-image.server";

export const Route = createFileRoute("/share.jpg")({
  server: {
    handlers: {
      GET: async () => {
        const body = getOgShareImageBytes();
        return new Response(body, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
