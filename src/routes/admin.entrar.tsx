import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@/components/admin/AdminLoginPage";
import { SITE_NAME } from "@/lib/site-meta";

export const Route = createFileRoute("/admin/entrar")({
  head: () => ({
    meta: [
      { title: `Entrar no painel admin — ${SITE_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});
