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

  const applySnapshot = useCallback((next: GardenSnapshot) => {
    setSnapshot(next);
    setOnline(sortOnlineByJoinOrder(next.online));
    setChat(next.chat);
    snapshotReadyRef.current = true;
    setConnected(true);
    setError(null);
    failureCountRef.current = 0;
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
      const next = await resetGardenVitalsNewCycle();
      applySnapshot(next);
      return next;
    } finally {
      setSyncing(false);
    }
  }, [applySnapshot]);

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
    sendChat,
    setSelectedSeedlingId,
  };
}
