import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  EyeOff,
  Gamepad2,
  ListChecks,
  MessageCircle,
  MicOff,
  Radio,
  ShieldCheck,
  Sprout,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { canAccessJardim } from "@/lib/local-preview";
import { CARE_LABELS, type CareKind } from "@/lib/growthConfig";
import {
  fetchGardenAdminOverview,
  hideGardenChat,
  moderateGardenPlayer,
  type GardenEvent,
  type GardenModerationAction,
} from "@/lib/garden-realtime";

export const Route = createFileRoute("/_authenticated/admin/jardim")({
  component: AdminJardim,
});

const MODERATION_LABELS: Record<GardenModerationAction, string> = {
  mute: "silenciado",
  unmute: "voz reativada",
  kick: "expulso",
  ban: "banido",
  unban: "desbanido",
};

function describeEvent(event: GardenEvent): string {
  const name = event.fullName ?? "Alguém";
  const by = event.actorName ? ` por ${event.actorName}` : "";
  switch (event.eventType) {
    case "join":
      return `${name} entrou no jardim`;
    case "leave":
      return `${name} saiu do jardim`;
    case "chat":
      return `${name} disse: "${String(event.detail.body ?? "")}"`;
    case "care": {
      const kind = String(event.detail.kind ?? "");
      const label = CARE_LABELS[kind as CareKind] ?? kind;
      return `${name} cuidou (${label}) de ${String(event.detail.seedlingId ?? "uma muda")}`;
    }
    case "chat_hidden":
      return `Mensagem de ${name} foi ocultada${by}`;
    default:
      return `${name} foi ${MODERATION_LABELS[event.eventType] ?? event.eventType}${by}`;
  }
}

function eventBadge(type: GardenEvent["eventType"]): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (type) {
    case "join":
      return { label: "Entrada", variant: "default" };
    case "leave":
      return { label: "Saída", variant: "secondary" };
    case "chat":
      return { label: "Chat", variant: "outline" };
    case "care":
      return { label: "Cuidado", variant: "outline" };
    case "mute":
    case "kick":
    case "ban":
    case "chat_hidden":
      return { label: "Moderação", variant: "destructive" };
    default:
      return { label: "Moderação", variant: "secondary" };
  }
}

function isActive(until: string | null): boolean {
  return Boolean(until && new Date(until).getTime() > Date.now());
}

function AdminJardim() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "garden-overview"],
    queryFn: fetchGardenAdminOverview,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "garden-overview"] });

  const hideMutation = useMutation({
    mutationFn: hideGardenChat,
    onSuccess: async () => {
      toast.success("Mensagem ocultada");
      await invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível ocultar a mensagem");
    },
  });

  const moderateMutation = useMutation({
    mutationFn: moderateGardenPlayer,
    onSuccess: async (_data, variables) => {
      const verbs: Record<GardenModerationAction, string> = {
        mute: "Jogador silenciado",
        unmute: "Voz reativada",
        kick: "Jogador expulso do jardim",
        ban: "Jogador banido do jardim",
        unban: "Banimento removido",
      };
      toast.success(verbs[variables.action]);
      await invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível aplicar a moderação");
    },
  });

  const moderate = (
    targetUserId: string,
    action: GardenModerationAction,
    minutes?: number | null,
  ) => {
    moderateMutation.mutate({ targetUserId, action, minutes: minutes ?? null });
  };

  const enterGame = () => {
    /* Só a conta dona joga enquanto o jardim está fechado ao público. */
    if (!canAccessJardim({ email: user?.email }, isAdmin)) {
      toast.error("O jogo está fechado por enquanto.");
      return;
    }
    try {
      sessionStorage.setItem("jardim_autoplay", "1");
    } catch {
      /* noop */
    }
    void navigate({ to: "/jardim" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="Jogo Jardim da Esperança"
          description="Controle total: veja quem entra e sai, todo o chat, e puna jogadores quando necessário."
        />
        <Button type="button" onClick={enterGame} className="shrink-0">
          <Gamepad2 className="mr-2 h-4 w-4" aria-hidden />
          Entrar no jogo
        </Button>
      </div>

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
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/15 text-red-600">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Punições ativas
              </p>
              <p className="font-display text-2xl font-extrabold text-foreground">
                {isLoading ? "—" : (data?.moderation.length ?? 0)}
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
          <div className="max-h-96 space-y-2 overflow-y-auto p-4">
            {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
            {!isLoading && !(data?.online.length ?? 0) && (
              <p className="text-sm text-muted-foreground">Ninguém jogando neste momento.</p>
            )}
            {(data?.online ?? []).map((player) => {
              const muted = isActive(player.mutedUntil);
              return (
                <div
                  key={player.userId}
                  className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {player.fullName}
                    </p>
                    {muted && <Badge variant="destructive">Silenciado</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {player.selectedSeedlingId
                      ? `Cuidando de ${player.selectedSeedlingId}`
                      : "No jardim"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {muted ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={moderateMutation.isPending}
                        onClick={() => moderate(player.userId, "unmute")}
                      >
                        <MicOff className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Reativar voz
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={moderateMutation.isPending}
                        onClick={() => moderate(player.userId, "mute", 10)}
                      >
                        <MicOff className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Silenciar 10min
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={moderateMutation.isPending}
                      onClick={() => moderate(player.userId, "kick")}
                    >
                      <UserX className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Expulsar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={moderateMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Banir ${player.fullName} do jardim?`)) {
                          moderate(player.userId, "ban", null);
                        }
                      }}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Banir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-red-500" aria-hidden />
            <h2 className="font-display text-lg font-bold">Punições ativas</h2>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto p-4">
            {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
            {!isLoading && !(data?.moderation.length ?? 0) && (
              <p className="text-sm text-muted-foreground">
                Nenhum jogador silenciado ou banido no momento.
              </p>
            )}
            {(data?.moderation ?? []).map((entry) => {
              const muted = isActive(entry.mutedUntil);
              const banned = isActive(entry.bannedUntil);
              return (
                <div
                  key={entry.userId}
                  className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.fullName}
                    </p>
                    {banned && <Badge variant="destructive">Banido</Badge>}
                    {muted && <Badge variant="destructive">Silenciado</Badge>}
                  </div>
                  {muted && entry.mutedUntil && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Silenciado até {new Date(entry.mutedUntil).toLocaleString("pt-BR")}
                    </p>
                  )}
                  {banned && entry.bannedUntil && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Banido até {new Date(entry.bannedUntil).toLocaleString("pt-BR")}
                    </p>
                  )}
                  {entry.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Motivo: {entry.reason}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {muted && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={moderateMutation.isPending}
                        onClick={() => moderate(entry.userId, "unmute")}
                      >
                        Reativar voz
                      </Button>
                    )}
                    {banned && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={moderateMutation.isPending}
                        onClick={() => moderate(entry.userId, "unban")}
                      >
                        Desbanir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-lg font-bold">Registro de tudo</h2>
          <span className="text-xs text-muted-foreground">
            entradas, saídas, chat, cuidados e punições
          </span>
        </div>
        <div className="max-h-[28rem] space-y-1.5 overflow-y-auto p-4">
          {isLoading && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
          {!isLoading && !(data?.events.length ?? 0) && (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          )}
          {(data?.events ?? []).map((event) => {
            const badge = eventBadge(event.eventType);
            return (
              <div
                key={event.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <Badge variant={badge.variant} className="shrink-0">
                  {badge.label}
                </Badge>
                <span className="min-w-0 flex-1 break-words text-foreground/90">
                  {describeEvent(event)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sprout className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-lg font-bold">Ações recentes</h2>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto p-4">
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

        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-lg font-bold">Chat do jardim</h2>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto p-4">
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
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {!message.hidden && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={hideMutation.isPending}
                      onClick={() => hideMutation.mutate(message.id)}
                    >
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Ocultar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={moderateMutation.isPending}
                    onClick={() => moderate(message.userId, "mute", 10)}
                  >
                    <MicOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Silenciar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
