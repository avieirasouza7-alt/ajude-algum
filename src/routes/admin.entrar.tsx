import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@/components/admin/AdminLoginPage";

export const Route = createFileRoute("/admin/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar no painel admin — Ajude Alguém" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});
