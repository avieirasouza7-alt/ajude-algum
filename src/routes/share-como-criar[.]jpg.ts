import { createFileRoute } from "@tanstack/react-router";
import { getOgShareImageBytes } from "@/lib/og-share-image.server";

function jpegResponse() {
  const body = getOgShareImageBytes();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Mesma imagem da lanterna — rota dedicada para o guia /como-criar.html */
export const Route = createFileRoute("/share-como-criar.jpg")({
  server: {
    handlers: {
      GET: async () => jpegResponse(),
      HEAD: async () => jpegResponse(),
    },
  },
});
