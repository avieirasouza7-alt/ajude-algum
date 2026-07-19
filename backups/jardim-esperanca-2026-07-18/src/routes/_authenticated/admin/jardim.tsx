import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, MessageCircle, Radio, Sprout, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CARE_LABELS, type CareKind } from "@/lib/growthConfig";
import { fetchGardenAdminOverview, hideGardenChat } from "@/lib/garden-realtime";

export const Route = createFileRoute("/_authenticated/admin/jardim")({
  component: AdminJardim,
});

function AdminJardim() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "garden-overview"],
    queryFn: fetchGardenAdminOverview,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });

  const hideMutation = useMutation({
    mutationFn: hideGardenChat,
    onSuccess: async () => {
      toast.success("Mensagem ocultada");
      await queryClient.invalidateQueries({ queryKey: ["admin", "garden-overview"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível ocultar a mensagem");
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Jardim da Esperança"
        description="Monitore quem está jogando, as ações da comunidade e o chat em tempo real."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <Radio className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Online agora
              </p>
              <p className="font-display text-2xl font-extrabold text-foreground">
                {isLoading ? "—" : (data?.onlineCount ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sprout className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revisão do mundo
              </p>
              <p className="font-display text-2xl font-extrabold text-foreground">
                {isLoading ? "—" : (data?.world?.revision ?? "—")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-600">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Clima
              </p>
              <p className="font-display text-lg font-extrabold text-foreground">
                {isLoading
                  ? "—"
                  : data?.world?.raining
                    ? "Chovendo"
                    : data?.world?.clearing
                      ? "Abrindo o sol"
                      : "Sereno"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar o jardim.{" "}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-lg font-bold">Jogadores online</h2>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto p-4">
            {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
            {!isLoading && !(data?.online.length ?? 0) && (
              <p className="text-sm text-muted-foreground">Ninguém jogando neste momento.</p>
            )}
            {(data?.online ?? []).map((player) => (
              <div
                key={player.userId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {player.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {player.selectedSeedlingId
                      ? `Cuidando de ${player.selectedSeedlingId}`
                      : "No jardim"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/usuarios">Ver usuários</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sprout className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-lg font-bold">Ações recentes</h2>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto p-4">
            {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
            {!isLoading && !(data?.recentActions.length ?? 0) && (
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
            )}
            {(data?.recentActions ?? []).map((action) => (
              <div
                key={action.id}
                className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{action.fullName}</span>
                  <Badge variant="outline">
                    {CARE_LABELS[action.kind as CareKind] ?? action.kind}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.seedlingName} · {new Date(action.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-lg font-bold">Chat do jardim</h2>
        </div>
        <div className="max-h-[28rem] space-y-2 overflow-y-auto p-4">
          {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
          {!isLoading && !(data?.recentChat.length ?? 0) && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {(data?.recentChat ?? []).map((message) => (
            <div
              key={message.id}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{message.fullName}</p>
                  {message.hidden && <Badge variant="destructive">Oculta</Badge>}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
                  {message.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              {!message.hidden && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={hideMutation.isPending}
                  onClick={() => hideMutation.mutate(message.id)}
                >
                  <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Ocultar
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
