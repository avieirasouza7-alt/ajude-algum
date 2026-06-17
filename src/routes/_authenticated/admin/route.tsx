import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminAccessPage } from "@/components/admin/AdminAccessPage";
import { checkIsAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { ok, user } = await checkIsAdmin();
    return { isAdmin: ok, adminUser: user };
  },
  component: AdminShell,
});

function AdminShell() {
  const { isAdmin } = Route.useRouteContext();
  if (!isAdmin) return <AdminAccessPage />;
  return <AdminLayout />;
}
