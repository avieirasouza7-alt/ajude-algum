import { supabase } from "@/integrations/supabase/client";
import type { CareKind } from "@/lib/growthConfig";
import type { Caregiver, CommunitySeedling } from "@/lib/communityGarden";
import { mergeCommunitySeedlings, normalizeSeedling } from "@/lib/communityGarden";

export type GardenOnlinePlayer = {
  userId: string;
  fullName: string;
  selectedSeedlingId: string | null;
  lastSeen: string;
  /** Quando entrou no jardim — quem entrou primeiro aparece primeiro na lista. */
  joinedAt: string;
};

export type GardenChatMessage = {
  id: string;
  userId: string;
  fullName: string;
  body: string;
  hidden: boolean;
  createdAt: string;
};

export type GardenWorldState = {
  id: string;
  revision: number;
  raining: boolean;
  clearing: boolean;
  weather_until: string | null;
  last_tick: string;
  updated_at: string;
};

export type GardenSnapshot = {
  world: GardenWorldState;
  seedlings: CommunitySeedling[];
  online: GardenOnlinePlayer[];
  chat: GardenChatMessage[];
  serverNow: string;
};

export type GardenModerationAction = "mute" | "unmute" | "kick" | "ban" | "unban";

export type GardenAdminOnlinePlayer = GardenOnlinePlayer & {
  mutedUntil: string | null;
  bannedUntil: string | null;
};

export type GardenModerationEntry = {
  userId: string;
  fullName: string;
  mutedUntil: string | null;
  bannedUntil: string | null;
  kickedAt: string | null;
  reason: string | null;
  updatedAt: string;
};

export type GardenEvent = {
  id: string;
  eventType:
    | "join"
    | "leave"
    | "chat"
    | "care"
    | "mute"
    | "unmute"
    | "kick"
    | "ban"
    | "unban"
    | "chat_hidden";
  userId: string | null;
  fullName: string | null;
  actorName: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type GardenAdminOverview = {
  onlineCount: number;
  online: GardenAdminOnlinePlayer[];
  moderation: GardenModerationEntry[];
  events: GardenEvent[];
  recentActions: Array<{
    id: string;
    userId: string;
    fullName: string;
    seedlingId: string;
    seedlingName: string;
    kind: CareKind;
    growthDelta: number;
    createdAt: string;
  }>;
  recentChat: GardenChatMessage[];
  world: {
    revision: number;
    raining: boolean;
    clearing: boolean;
    updatedAt: string;
  } | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapSeedling(raw: Record<string, unknown>): CommunitySeedling {
  const position: [number, number, number] = Array.isArray(raw.position)
    ? (raw.position as [number, number, number])
    : [0, 0, 0];
  return normalizeSeedling({
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Muda"),
    species: String(raw.species ?? ""),
    position,
    growth: Number(raw.growth ?? 0),
    water: Number(raw.water ?? 60),
    light: Number(raw.light ?? 60),
    fertilizer: Number(raw.fertilizer ?? 40),
    cleanliness: Number(raw.cleanliness ?? 100),
    pestFree: Number(raw.pestFree ?? 100),
    beauty: Number(raw.beauty ?? 18),
    fertilizerActions: Number(raw.fertilizerActions ?? 0),
    lastPrunedAt: Number(raw.lastPrunedAt ?? 0),
    totalCareActions: Number(raw.totalCareActions ?? 0),
    lastCareAt: Number(raw.lastCareAt ?? Date.now()),
    caregivers: asArray<Caregiver>(raw.caregivers),
  });
}

function mapChat(raw: Record<string, unknown>): GardenChatMessage {
  return {
    id: String(raw.id ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? "Sem nome"),
    body: String(raw.body ?? ""),
    hidden: Boolean(raw.hidden),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
  };
}

function mapOnline(raw: Record<string, unknown>): GardenOnlinePlayer {
  return {
    userId: String(raw.userId ?? raw.user_id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? "Sem nome"),
    selectedSeedlingId: (raw.selectedSeedlingId ?? raw.selected_seedling_id ?? null) as
      | string
      | null,
    lastSeen: String(raw.lastSeen ?? raw.last_seen ?? new Date().toISOString()),
    joinedAt: String(
      raw.joinedAt ?? raw.joined_at ?? raw.lastSeen ?? raw.last_seen ?? new Date().toISOString(),
    ),
  };
}

/** Ordena por ordem de chegada: quem entrou primeiro fica em cima. */
export function sortOnlineByJoinOrder(players: GardenOnlinePlayer[]): GardenOnlinePlayer[] {
  return [...players].sort(
    (a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.userId.localeCompare(b.userId),
  );
}

export const GARDEN_CHAT_TTL_MS = 15 * 60 * 1000;

export function parseGardenSnapshot(raw: unknown): GardenSnapshot {
  const data = (raw ?? {}) as Record<string, unknown>;
  const worldRaw = (data.world ?? {}) as Record<string, unknown>;
  const serverNow = String(data.serverNow ?? new Date().toISOString());
  const serverMs = Date.parse(serverNow) || Date.now();
  const chatCutoff = serverMs - GARDEN_CHAT_TTL_MS;
  return {
    world: {
      id: String(worldRaw.id ?? "global"),
      revision: Number(worldRaw.revision ?? 1),
      raining: Boolean(worldRaw.raining),
      clearing: Boolean(worldRaw.clearing),
      weather_until: (worldRaw.weather_until as string | null) ?? null,
      last_tick: String(worldRaw.last_tick ?? new Date().toISOString()),
      updated_at: String(worldRaw.updated_at ?? new Date().toISOString()),
    },
    seedlings: mergeCommunitySeedlings(
      asArray<Record<string, unknown>>(data.seedlings).map(mapSeedling),
    ),
    online: asArray<Record<string, unknown>>(data.online).map(mapOnline),
    chat: asArray<Record<string, unknown>>(data.chat)
      .map(mapChat)
      .filter((message) => {
        const created = Date.parse(message.createdAt);
        return Number.isFinite(created) ? created >= chatCutoff : false;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    serverNow,
  };
}

export async function fetchGardenSnapshot(): Promise<GardenSnapshot> {
  /* Se a migration já rodou, cria as mudas laterais (idempotente). Falha não impede entrar. */
  const side = await supabase.rpc("garden_ensure_side_seedlings");
  if (side.error) {
    console.warn("[jardim] garden_ensure_side_seedlings:", side.error.message);
  }
  const { data, error } = await supabase.rpc("garden_get_snapshot");
  if (error) throw error;
  return parseGardenSnapshot(data);
}

export async function pulseGardenPresence(
  selectedSeedlingId?: string | null,
): Promise<GardenOnlinePlayer[]> {
  const { data, error } = await supabase.rpc("garden_pulse_presence", {
    p_selected_seedling_id: selectedSeedlingId ?? null,
  });
  if (error) throw error;
  const payload = (data ?? {}) as { online?: unknown };
  return asArray<Record<string, unknown>>(payload.online).map(mapOnline);
}

export async function leaveGardenPresence(): Promise<void> {
  await supabase.rpc("garden_leave_presence");
}

export async function performGardenCare(
  seedlingId: string,
  kind: CareKind,
): Promise<GardenSnapshot> {
  const { data, error } = await supabase.rpc("garden_care_action", {
    p_seedling_id: seedlingId,
    p_kind: kind,
  });
  if (error) throw error;
  return parseGardenSnapshot(data);
}

/** Esvazia os vitais das mudas para recomeçar o ciclo da moeda. */
export async function resetGardenVitalsNewCycle(): Promise<GardenSnapshot> {
  const { data, error } = await supabase.rpc("garden_reset_vitals_new_cycle");
  if (error) throw error;

  const payload = (data ?? {}) as {
    ok?: boolean;
    drained?: boolean;
    revision?: number;
  };

  /* Sempre monta snapshot com barras em 0 — não depende de fetch que pode vir atrasado. */
  const fresh = await fetchGardenSnapshot();
  const zeroed: GardenSnapshot = {
    ...fresh,
    world: {
      ...fresh.world,
      revision:
        typeof payload.revision === "number" && payload.revision > 0
          ? Math.max(fresh.world.revision, payload.revision)
          : fresh.world.revision + 1,
    },
    seedlings: fresh.seedlings.map((s) => ({
      ...s,
      water: 0,
      light: 0,
      fertilizer: 0,
      cleanliness: 0,
      pestFree: 0,
      beauty: 0,
    })),
  };

  /* Se o servidor ainda não drenou, tenta de novo em background (sem falhar a UI). */
  if (payload.drained === false) {
    void (async () => {
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        const { error: retryErr } = await supabase.rpc("garden_reset_vitals_new_cycle");
        if (retryErr) continue;
        const check = await fetchGardenSnapshot();
        const ok = check.seedlings.every(
          (s) =>
            Math.round(s.water) <= 8 &&
            Math.round(s.beauty ?? 0) <= 8 &&
            Math.round(s.light) <= 8 &&
            Math.round(s.fertilizer) <= 8 &&
            Math.round(s.cleanliness) <= 8 &&
            Math.round(s.pestFree) <= 8,
        );
        if (ok) return;
      }
    })();
  }

  return zeroed;
}

export async function sendGardenChat(body: string): Promise<GardenChatMessage> {
  const { data, error } = await supabase.rpc("garden_send_chat", { p_body: body });
  if (error) throw error;
  return mapChat((data ?? {}) as Record<string, unknown>);
}

export async function hideGardenChat(messageId: string): Promise<void> {
  const { error } = await supabase.rpc("garden_hide_chat", { p_message_id: messageId });
  if (error) throw error;
}

export async function moderateGardenPlayer(input: {
  targetUserId: string;
  action: GardenModerationAction;
  minutes?: number | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("garden_admin_moderate", {
    p_target: input.targetUserId,
    p_action: input.action,
    p_minutes: input.minutes ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) throw new Error(friendlyGardenError(error.message));
}

function mapAdminOnline(raw: Record<string, unknown>): GardenAdminOnlinePlayer {
  return {
    ...mapOnline(raw),
    mutedUntil: (raw.mutedUntil as string | null) ?? null,
    bannedUntil: (raw.bannedUntil as string | null) ?? null,
  };
}

export async function fetchGardenAdminOverview(): Promise<GardenAdminOverview> {
  const { data, error } = await supabase.rpc("garden_admin_overview");
  if (error) throw error;
  const payload = (data ?? {}) as Record<string, unknown>;
  const world = (payload.world ?? null) as Record<string, unknown> | null;
  return {
    onlineCount: Number(payload.onlineCount ?? 0),
    online: asArray<Record<string, unknown>>(payload.online).map(mapAdminOnline),
    moderation: asArray<Record<string, unknown>>(payload.moderation).map((row) => ({
      userId: String(row.userId ?? ""),
      fullName: String(row.fullName ?? "Sem nome"),
      mutedUntil: (row.mutedUntil as string | null) ?? null,
      bannedUntil: (row.bannedUntil as string | null) ?? null,
      kickedAt: (row.kickedAt as string | null) ?? null,
      reason: (row.reason as string | null) ?? null,
      updatedAt: String(row.updatedAt ?? ""),
    })),
    events: asArray<Record<string, unknown>>(payload.events).map((row) => ({
      id: String(row.id ?? ""),
      eventType: String(row.eventType ?? "join") as GardenEvent["eventType"],
      userId: (row.userId as string | null) ?? null,
      fullName: (row.fullName as string | null) ?? null,
      actorName: (row.actorName as string | null) ?? null,
      detail: (row.detail ?? {}) as Record<string, unknown>,
      createdAt: String(row.createdAt ?? ""),
    })),
    recentActions: asArray<Record<string, unknown>>(payload.recentActions).map((row) => ({
      id: String(row.id ?? ""),
      userId: String(row.userId ?? ""),
      fullName: String(row.fullName ?? "Sem nome"),
      seedlingId: String(row.seedlingId ?? ""),
      seedlingName: String(row.seedlingName ?? ""),
      kind: String(row.kind ?? "water") as CareKind,
      growthDelta: Number(row.growthDelta ?? 0),
      createdAt: String(row.createdAt ?? ""),
    })),
    recentChat: asArray<Record<string, unknown>>(payload.recentChat).map(mapChat),
    world: world
      ? {
          revision: Number(world.revision ?? 1),
          raining: Boolean(world.raining),
          clearing: Boolean(world.clearing),
          updatedAt: String(world.updatedAt ?? ""),
        }
      : null,
  };
}

export function subscribeGardenRealtime(onChange: () => void) {
  const channel = supabase
    .channel("garden-global")
    .on("postgres_changes", { event: "*", schema: "public", table: "garden_seedlings" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "garden_world_state" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "garden_chat_messages" },
      onChange,
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "garden_presence" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function friendlyGardenError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("chat on cooldown")) {
    return "Aguarde alguns segundos antes de enviar outra mensagem.";
  }
  if (lower.includes("care on cooldown")) {
    return "Essa ação ainda está em espera. Tente de novo em instantes.";
  }
  if (lower.includes("rain is watering")) {
    return "A chuva já está regando o jardim.";
  }
  if (lower.includes("seedling not found")) {
    return "Essa muda não está mais no jardim. Escolha outra para cuidar.";
  }
  if (lower.includes("not authenticated") || lower.includes("jwt")) {
    return "Entre na sua conta para jogar o Jogo Jardim da Esperança.";
  }
  if (lower.includes("account not active")) {
    return "Sua conta não está ativa para jogar.";
  }
  if (lower.includes("invalid chat body")) {
    return "Mensagem inválida. Use até 280 caracteres.";
  }
  if (lower.includes("garden muted")) {
    return "Você foi silenciado por um administrador e não pode falar no chat agora.";
  }
  if (lower.includes("garden kicked")) {
    return "Você foi removido do jardim por um administrador.";
  }
  if (lower.includes("garden banned")) {
    return "Você foi bloqueado do Jogo Jardim da Esperança por um administrador.";
  }
  if (lower.includes("cannot moderate admin")) {
    return "Não é possível punir outro administrador.";
  }
  if (lower.includes("cannot moderate self")) {
    return "Você não pode punir a si mesmo.";
  }
  return message;
}

/** Erros que significam que o jogador deve sair do jogo imediatamente. */
export function isGardenRemovalError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("garden kicked") || lower.includes("garden banned");
}
