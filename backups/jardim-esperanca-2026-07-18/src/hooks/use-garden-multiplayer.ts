import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGardenSnapshot,
  leaveGardenPresence,
  performGardenCare,
  pulseGardenPresence,
  sendGardenChat,
  subscribeGardenRealtime,
  friendlyGardenError,
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
  muted: true,
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
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      unlockedSkins: parsed.unlockedSkins?.length ? parsed.unlockedSkins : base.unlockedSkins,
      timeline: parsed.timeline ?? [],
      achievements: parsed.achievements ?? [],
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
  const selectedRef = useRef("esperanca-central");
  const refreshTimer = useRef<number | null>(null);
  /* Só mostra "Erro de conexão" após falhas seguidas — 1 tropeço isolado não conta. */
  const failureCountRef = useRef(0);

  const applySnapshot = useCallback((next: GardenSnapshot) => {
    setSnapshot(next);
    setOnline(next.online);
    setChat(next.chat);
    setConnected(true);
    setError(null);
    failureCountRef.current = 0;
  }, []);

  const reportFailure = useCallback((message: string) => {
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
            setOnline(players);
            setConnected(true);
            failureCountRef.current = 0;
          }
        })
        .catch(() => {
          if (!cancelled) {
            failureCountRef.current += 1;
            if (failureCountRef.current >= 2) setConnected(false);
          }
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
      .then(setOnline)
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
    refresh,
    care,
    sendChat,
    setSelectedSeedlingId,
  };
}
