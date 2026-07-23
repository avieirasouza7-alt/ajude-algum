import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGardenSnapshot,
  leaveGardenPresence,
  performGardenCare,
  pulseGardenPresence,
  resetGardenVitalsNewCycle,
  sendGardenChat,
  subscribeGardenRealtime,
  friendlyGardenError,
  isGardenRemovalError,
  sortOnlineByJoinOrder,
  type GardenChatMessage,
  type GardenOnlinePlayer,
  type GardenSnapshot,
} from "@/lib/garden-realtime";
import type { CareKind } from "@/lib/growthConfig";
import type { CommunitySeedling } from "@/lib/communityGarden";

const PRESENCE_MS = 12_000;
const PREFS_KEY = "jardim-da-esperanca.prefs.v1";

export type GardenPersonalPrefs = {
  skin: string;
  unlockedSkins: string[];
  timeline: Array<{ ts: number; kind: string; icon: string; text: string }>;
  achievements: string[];
  settings: {
    reduceMotion: boolean;
    highContrast: boolean;
    volume: number;
    soundMode: "music" | "nature" | "both";
    remindersEnabled: boolean;
    reminderHour: number;
  };
  selectedSeedlingId: string;
  muted: boolean;
  /** Só respeita o mute salvo se a própria pessoa escolheu — o padrão é som ligado. */
  soundChosen: boolean;
  /** Moedas ganhas ao zerar as 5 árvores (uma de cada vez no ciclo). */
  coins: number;
  /**
   * IDs das mudas já zeradas neste ciclo de moeda.
   * Quando a árvore chega a 100%, o ID entra aqui e permanece mesmo se os vitais caírem.
   * Ao completar as 5, ganha 1 moeda e a lista zera para o próximo ciclo.
   */
  clearedSeedlingIds: string[];
  /**
   * Após ganhar moeda: IDs que ainda estão em 100% e só voltam a contar
   * quando os vitais caírem (evita ganhar moeda em loop).
   */
  coinCooldownIds: string[];
  /** true até o servidor esvaziar os vitais após a moeda. */
  needsVitalsDrain: boolean;
  /** Schema do ciclo de moeda (2 = esvazia vitais após moeda). */
  coinCycleSchema: number;
};

const defaultPrefs = (): GardenPersonalPrefs => ({
  skin: "classic",
  unlockedSkins: ["classic"],
  timeline: [],
  achievements: [],
  settings: {
    reduceMotion: false,
    highContrast: false,
    volume: 0.6,
    soundMode: "both",
    remindersEnabled: false,
    reminderHour: 20,
  },
  selectedSeedlingId: "esperanca-central",
  /** Começa mudo até o 1º toque (política do navegador); o jogo oferecee ativar o som. */
  muted: true,
  soundChosen: false,
  coins: 0,
  clearedSeedlingIds: [],
  coinCooldownIds: [],
  needsVitalsDrain: false,
  coinCycleSchema: 2,
});

export function loadGardenPrefs(): GardenPersonalPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<GardenPersonalPrefs>;
    const base = defaultPrefs();
    return {
      ...base,
      ...parsed,
      /* Sem autoplay: só toca se a pessoa já escolheu ligar o som. */
      muted: parsed.soundChosen ? (parsed.muted ?? false) : true,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      unlockedSkins: (() => {
        const list = parsed.unlockedSkins?.length ? parsed.unlockedSkins : base.unlockedSkins;
        return list.includes("classic") ? list : ["classic", ...list];
      })(),
      timeline: parsed.timeline ?? [],
      achievements: parsed.achievements ?? [],
      coins: typeof parsed.coins === "number" ? Math.max(0, Math.floor(parsed.coins)) : 0,
      clearedSeedlingIds: Array.isArray(parsed.clearedSeedlingIds)
        ? parsed.clearedSeedlingIds.filter((id): id is string => typeof id === "string")
        : [],
      coinCooldownIds: Array.isArray(parsed.coinCooldownIds)
        ? parsed.coinCooldownIds.filter((id): id is string => typeof id === "string")
        : [],
      needsVitalsDrain: Boolean(parsed.needsVitalsDrain),
      coinCycleSchema: typeof parsed.coinCycleSchema === "number" ? parsed.coinCycleSchema : 1,
    };
  } catch {
    return defaultPrefs();
  }
}

export function saveGardenPrefs(prefs: GardenPersonalPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

/** Snapshot com vitais de cuidado zerados (pós-moeda). */
function withZeroedCareVitalsSnapshot(snapshot: GardenSnapshot): GardenSnapshot {
  return {
    ...snapshot,
    seedlings: snapshot.seedlings.map((s) => ({
      ...s,
      water: 0,
      light: 0,
      fertilizer: 0,
      cleanliness: 0,
      pestFree: 0,
      beauty: 0,
    })),
  };
}

function careVitalsLookDrained(seedlings: CommunitySeedling[]): boolean {
  return (
    seedlings.length > 0 &&
    seedlings.every(
      (s) =>
        Math.round(s.water) <= 8 &&
        Math.round(s.beauty ?? 0) <= 8 &&
        Math.round(s.light) <= 8 &&
        Math.round(s.fertilizer) <= 8 &&
        Math.round(s.cleanliness) <= 8 &&
        Math.round(s.pestFree) <= 8,
    )
  );
}

/**
 * Após a moeda, um refresh atrasado (realtime) pode trazer vitais cheios de novo.
 * Guard: enquanto ativo, ignora snapshot "cheio" / revision antiga.
 */
type VitalsDrainGuard = {
  active: boolean;
  /** Só aceita snapshot com revision >= este valor (após RPC ok). */
  minRevision: number;
  /** Até quando forçar zero se o snapshot vier cheio. */
  until: number;
  resetOk: boolean;
};

export function useGardenMultiplayer(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<GardenSnapshot | null>(null);
  const [online, setOnline] = useState<GardenOnlinePlayer[]>([]);
  const [chat, setChat] = useState<GardenChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Preenchido quando um admin expulsa/bane o jogador: o jogo deve fechar. */
  const [removed, setRemoved] = useState<string | null>(null);
  const selectedRef = useRef("esperanca-central");
  const refreshTimer = useRef<number | null>(null);
  /* Só mostra "Erro de conexão" após falhas seguidas — 1 tropeço isolado não conta. */
  const failureCountRef = useRef(0);
  /* Presence não marca connected antes do 1º snapshot — evita toasts do histórico do chat. */
  const snapshotReadyRef = useRef(false);
  const vitalsDrainGuardRef = useRef<VitalsDrainGuard>({
    active: false,
    minRevision: 0,
    until: 0,
    resetOk: false,
  });

  const applySnapshot = useCallback((next: GardenSnapshot) => {
    const guard = vitalsDrainGuardRef.current;
    let payload = next;

    if (guard.active) {
      const drained = careVitalsLookDrained(next.seedlings);
      /* Enquanto o reset não confirmou OU ainda dentro da janela: se veio cheio, força 0. */
      if (!guard.resetOk) {
        payload = withZeroedCareVitalsSnapshot(next);
      } else if (!drained && Date.now() < guard.until) {
        /* Snapshot atrasado / race — não deixa as barras voltarem cheias. */
        payload = withZeroedCareVitalsSnapshot(next);
      } else if (drained) {
        /* Confirmado no servidor: pode liberar o guard. */
        guard.active = false;
      } else if (Date.now() >= guard.until) {
        /* Janela acabou e alguém já cuidou de novo (revision nova com vitais) — aceita. */
        guard.active = false;
      }
    }

    setSnapshot(payload);
    setOnline(sortOnlineByJoinOrder(payload.online));
    setChat(payload.chat);
    snapshotReadyRef.current = true;
    setConnected(true);
    setError(null);
    failureCountRef.current = 0;
  }, []);

  /** Liga o bloqueio anti-restauração das barras (chamar ao ganhar a moeda). */
  const armVitalsDrainGuard = useCallback((holdMs = 20_000) => {
    vitalsDrainGuardRef.current = {
      active: true,
      minRevision: 0,
      until: Date.now() + holdMs,
      resetOk: false,
    };
  }, []);

  const reportFailure = useCallback((message: string) => {
    if (isGardenRemovalError(message)) {
      setRemoved(friendlyGardenError(message));
      setConnected(false);
      return;
    }
    failureCountRef.current += 1;
    if (failureCountRef.current < 2) return;
    setConnected(false);
    setError(friendlyGardenError(message));
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await fetchGardenSnapshot();
      applySnapshot(next);
    } catch (err) {
      reportFailure(err instanceof Error ? err.message : "Falha ao sincronizar o jardim");
    }
  }, [applySnapshot, enabled, reportFailure]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      void refresh();
    }, 900);
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    snapshotReadyRef.current = false;

    void (async () => {
      try {
        const next = await fetchGardenSnapshot();
        if (cancelled) return;
        applySnapshot(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            friendlyGardenError(err instanceof Error ? err.message : "Falha ao carregar o jardim"),
          );
          setConnected(false);
          failureCountRef.current = 2;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsubscribe = subscribeGardenRealtime(() => {
      scheduleRefresh();
    });

    const presenceTick = () => {
      void pulseGardenPresence(selectedRef.current)
        .then((players) => {
          if (!cancelled) {
            setOnline(sortOnlineByJoinOrder(players));
            /* Só após o snapshot: senão o chat ainda vazio marca histórico como "novo". */
            if (snapshotReadyRef.current) setConnected(true);
            failureCountRef.current = 0;
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "";
          if (isGardenRemovalError(message)) {
            setRemoved(friendlyGardenError(message));
            setConnected(false);
            return;
          }
          failureCountRef.current += 1;
          if (failureCountRef.current >= 2) setConnected(false);
        });
    };
    presenceTick();
    const presenceTimer = window.setInterval(presenceTick, PRESENCE_MS);

    const onUnload = () => {
      void leaveGardenPresence();
    };
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(presenceTimer);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      window.removeEventListener("pagehide", onUnload);
      void leaveGardenPresence();
    };
  }, [applySnapshot, enabled, scheduleRefresh]);

  const setSelectedSeedlingId = useCallback((seedlingId: string) => {
    selectedRef.current = seedlingId;
    void pulseGardenPresence(seedlingId)
      .then((players) => setOnline(sortOnlineByJoinOrder(players)))
      .catch(() => undefined);
  }, []);

  const care = useCallback(
    async (seedlingId: string, kind: CareKind) => {
      setSyncing(true);
      try {
        const next = await performGardenCare(seedlingId, kind);
        applySnapshot(next);
        return next;
      } finally {
        setSyncing(false);
      }
    },
    [applySnapshot],
  );

  /** Após moeda: esvazia vitais das plantas para recomeçar o ciclo. */
  const resetVitalsForNewCycle = useCallback(async () => {
    setSyncing(true);
    try {
      armVitalsDrainGuard(45_000);
      setSnapshot((prev) => {
        if (!prev) return prev;
        return withZeroedCareVitalsSnapshot(prev);
      });
      const next = await resetGardenVitalsNewCycle();
      const guard = vitalsDrainGuardRef.current;
      guard.resetOk = true;
      guard.minRevision = next.world.revision;
      guard.until = Math.max(guard.until, Date.now() + 20_000);
      guard.active = true;
      applySnapshot(next);
      return next;
    } finally {
      setSyncing(false);
    }
  }, [applySnapshot, armVitalsDrainGuard]);

  const sendChat = useCallback(async (body: string) => {
    const message = await sendGardenChat(body);
    setChat((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].slice(-100);
    });
    return message;
  }, []);

  const seedlings: CommunitySeedling[] = snapshot?.seedlings ?? [];
  const raining = snapshot?.world.raining ?? false;
  const clearing = snapshot?.world.clearing ?? false;

  return {
    snapshot,
    seedlings,
    online,
    chat,
    raining,
    clearing,
    loading,
    syncing,
    connected,
    error,
    removed,
    refresh,
    care,
    resetVitalsForNewCycle,
    armVitalsDrainGuard,
    sendChat,
    setSelectedSeedlingId,
  };
}
