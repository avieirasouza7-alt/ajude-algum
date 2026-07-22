import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Droplets,
  Scissors,
  Sprout,
  Leaf,
  Volume2,
  VolumeX,
  X,
  HeartHandshake,
  Bug,
  Settings as SettingsIcon,
  Palette,
  History,
  Bell,
  Lock,
  Check,
  Trophy,
  Sparkles as SparklesIcon,
  Users,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Sun,
  Moon,
  Coins,
} from "lucide-react";
import track1Url from "@/assets/music/moonlit-fern-path-1.mp3";
import track2Url from "@/assets/music/moonlit-fern-path-2.mp3";
import track3Url from "@/assets/music/moonlit-river-loop-1.mp3";
import track4Url from "@/assets/music/moonlit-river-loop-2.mp3";
import Scene3D from "@/components/Scene3D";
import { GardenSocialPanels } from "@/components/garden/GardenSocialPanels";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGardenProfile } from "@/hooks/use-garden-profile";
import {
  loadGardenPrefs,
  saveGardenPrefs,
  useGardenMultiplayer,
  type GardenPersonalPrefs,
} from "@/hooks/use-garden-multiplayer";
import { GardenAudio } from "@/lib/gardenAudio";
import { pickNatureTrack, RAIN_TRACKS } from "@/lib/gardenNatureTracks";
import { friendlyGardenError } from "@/lib/garden-realtime";
import {
  COMMUNITY_SEEDLING_COUNT,
  createCommunitySeedlings,
  gardenCoinCycleProgress,
  seedlingVitalsPerfect,
  type CommunitySeedling,
} from "@/lib/communityGarden";
import {
  GARDEN_SKIN_PRICE,
  GARDEN_SKINS,
  getGardenSkin,
  type GardenSkinId,
} from "@/lib/gardenSkins";
import {
  type Stage,
  type CareKind,
  STAGES,
  CARE_COOLDOWN_MS,
  CARE_LABELS,
  needsPruneCare,
  stageOf,
} from "@/lib/growthConfig";

/** Fern Path 1 → 2 → River Loop 1 → 2 → reinicia. */
const MUSIC_TRACKS = [track1Url, track2Url, track3Url, track4Url];

type Settings = GardenPersonalPrefs["settings"];
type SoundMode = Settings["soundMode"];

/** Estatísticas pessoais da sessão usadas para conquistas. */
type PlayerStats = {
  growth: number;
  totalCareActions: number;
  streak: number;
  rareEventsCount: number;
};

/* ==================== Achievements ==================== */

type Achievement = { id: string; name: string; icon: string; check: (s: PlayerStats) => boolean };
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-care",
    name: "Primeiro gesto de amor",
    icon: "💚",
    check: (s) => s.totalCareActions >= 1,
  },
  {
    id: "care-25",
    name: "Jardineiro dedicado",
    icon: "🌱",
    check: (s) => s.totalCareActions >= 25,
  },
  {
    id: "care-100",
    name: "Guardião do jardim",
    icon: "🌿",
    check: (s) => s.totalCareActions >= 100,
  },
  { id: "streak-3", name: "3 dias de esperança", icon: "🔥", check: (s) => s.streak >= 3 },
  { id: "streak-7", name: "Uma semana de bondade", icon: "⭐", check: (s) => s.streak >= 7 },
  { id: "streak-30", name: "Um mês de cuidado", icon: "🏆", check: (s) => s.streak >= 30 },
  { id: "flowering", name: "Primeira floração", icon: "🌸", check: (s) => s.growth >= 1600 },
  { id: "hope", name: "Jardim da Esperança", icon: "✨", check: (s) => s.growth >= 2500 },
  {
    id: "rare-5",
    name: "Colecionador de milagres",
    icon: "🦋",
    check: (s) => s.rareEventsCount >= 5,
  },
];

/**
 * Visão local do estado do mundo. É apenas um espelho do snapshot do servidor
 * (via useGardenMultiplayer) — nunca cresce nem decai localmente.
 */
type WorldView = {
  growth: number;
  water: number;
  light: number;
  fertilizer: number;
  cleanliness: number;
  pestFree: number;
  lastCareAt: number;
  gardenSeedlings: CommunitySeedling[];
};

/** Vitais de cuidado praticamente zerados no servidor. */
function careVitalsDrained(seedlings: CommunitySeedling[]): boolean {
  return (
    seedlings.length > 0 &&
    seedlings.every(
      (s) =>
        Math.round(s.water) <= 5 &&
        Math.round(s.beauty ?? 0) <= 5 &&
        Math.round(s.light) <= 5 &&
        Math.round(s.fertilizer) <= 5 &&
        Math.round(s.cleanliness) <= 5 &&
        Math.round(s.pestFree) <= 5,
    )
  );
}

/** Zera os vitais de cuidado (água, beleza, adubo, limpeza, pragas) — próximo ciclo. */
function withZeroedCareVitals(seedlings: CommunitySeedling[]): CommunitySeedling[] {
  return seedlings.map((seedling) => ({
    ...seedling,
    water: 0,
    light: 0,
    fertilizer: 0,
    cleanliness: 0,
    pestFree: 0,
    beauty: 0,
  }));
}

const initialWorld = (): WorldView => {
  const gardenSeedlings = createCommunitySeedlings();
  const selected = gardenSeedlings.find((s) => s.id === "esperanca-central") ?? gardenSeedlings[0];
  return {
    growth: selected.growth,
    water: selected.water,
    light: selected.light,
    fertilizer: selected.fertilizer,
    cleanliness: selected.cleanliness,
    pestFree: selected.pestFree,
    lastCareAt: Date.now(),
    gardenSeedlings,
  };
};

type ToastEvent = { id: number; icon: string; text: string };

type Cooldowns = Record<CareKind, number>;

const emptyCd = (): Cooldowns => ({
  water: 0,
  prune: 0,
  fertilizer: 0,
  clean: 0,
  pest: 0,
});

export default function ArvoreDaEsperanca({ onClose }: { onClose?: () => void }) {
  const isMobile = useIsMobile();
  const profile = useGardenProfile();
  const multiplayer = useGardenMultiplayer(true);
  const {
    snapshot,
    online,
    chat,
    raining,
    clearing,
    loading: worldLoading,
    connected,
    error: worldError,
    removed,
    care,
    resetVitalsForNewCycle,
    sendChat,
    setSelectedSeedlingId: setServerSelectedSeedlingId,
  } = multiplayer;

  // Preferências pessoais (skin, timeline, conquistas, som…) ficam no localStorage.
  const [prefs, setPrefs] = useState<GardenPersonalPrefs>(() => loadGardenPrefs());
  // Estado do mundo (mudas, vitais, clima) vem sempre do servidor.
  const [world, setWorld] = useState<WorldView>(() => initialWorld());
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const [panel, setPanel] = useState<null | "settings" | "skins" | "timeline">(null);
  /* Painel das mudas é retrátil: abre ao aproximar o mouse e fecha sozinho em 30s. */
  const [navOpen, setNavOpen] = useState(false);
  const navCloseTimerRef = useRef<number | null>(null);
  /* Dica de controles aparece só de vez em quando, não fica fixa na tela. */
  const [showControlsHint, setShowControlsHint] = useState(true);
  /* Barra de ferramentas do topo fica escondida atrás do ícone de engrenagem. */
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsCloseTimerRef = useRef<number | null>(null);
  const [cooldowns, setCooldowns] = useState<Cooldowns>(emptyCd);
  const [careFx, setCareFx] = useState<CareKind | null>(null);
  const [careFxKey, setCareFxKey] = useState(0);
  const careFxTimerRef = useRef<number | null>(null);
  const [now, setNow] = useState(Date.now());
  // Estatísticas pessoais da sessão (não são progresso do mundo).
  const [personalCareActions, setPersonalCareActions] = useState(0);
  const [rareEventsCount, setRareEventsCount] = useState(0);
  const [streak] = useState(1);
  const [lastReminderShown, setLastReminderShown] = useState(0);
  const [butterflySeeds] = useState(() => Array.from({ length: 16 }, (_, i) => 10_000 + i * 7919));
  const audioRef = useRef<GardenAudio>(new GardenAudio());
  const idRef = useRef(0);
  const prevStageRef = useRef<Stage | null>(null);
  const prevRainingRef = useRef<boolean | null>(null);
  const pruneHintAtRef = useRef(0);
  const pestHintAtRef = useRef(0);
  /** Impede +2 moedas se o efeito rodar duas vezes antes do prefs atualizar. */
  const coinAwardLockRef = useRef(false);
  /** Evita chamar reset de vitais em loop após moeda. */
  const pendingVitalsResetRef = useRef(false);
  /** Segura UI em 0 até o servidor confirmar o reset (evita snapshot antigo restaurar as barras). */
  const vitalsDrainHoldRef = useRef(false);
  const initialSelectedRef = useRef(prefs.selectedSeedlingId);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const natureRef = useRef<HTMLAudioElement | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [rainTrackIdx, setRainTrackIdx] = useState(0);
  /** When Lovable CDN tracks fail locally, use procedural pad instead. */
  const [usePadMusic, setUsePadMusic] = useState(false);

  const muted = prefs.muted;

  useEffect(() => {
    saveGardenPrefs(prefs);
  }, [prefs]);

  // Informa ao servidor qual muda o jogador estava cuidando na última sessão.
  useEffect(() => {
    setServerSelectedSeedlingId(initialSelectedRef.current);
  }, [setServerSelectedSeedlingId]);

  /* Abre o painel das mudas e agenda o fechamento automático em 30s. */
  const openNav = useCallback(() => {
    setNavOpen(true);
    if (navCloseTimerRef.current) window.clearTimeout(navCloseTimerRef.current);
    navCloseTimerRef.current = window.setTimeout(() => setNavOpen(false), 30_000);
  }, []);

  useEffect(() => {
    return () => {
      if (navCloseTimerRef.current) window.clearTimeout(navCloseTimerRef.current);
    };
  }, []);

  /* Abre a barra de ferramentas e agenda fechamento automático em 30s. */
  const openTools = useCallback(() => {
    setToolsOpen(true);
    if (toolsCloseTimerRef.current) window.clearTimeout(toolsCloseTimerRef.current);
    toolsCloseTimerRef.current = window.setTimeout(() => setToolsOpen(false), 30_000);
  }, []);

  useEffect(() => {
    return () => {
      if (toolsCloseTimerRef.current) window.clearTimeout(toolsCloseTimerRef.current);
    };
  }, []);

  /* Mostra a dica por 6s ao entrar e depois reaparece por 6s a cada 2 minutos. */
  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setShowControlsHint(false), 6_000));
    const interval = window.setInterval(() => {
      setShowControlsHint(true);
      timers.push(window.setTimeout(() => setShowControlsHint(false), 6_000));
    }, 120_000);
    return () => {
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Espelha o snapshot do servidor: mudas + vitais da muda selecionada.
  useEffect(() => {
    if (!snapshot || snapshot.seedlings.length === 0) return;

    const serverDrained = careVitalsDrained(snapshot.seedlings);
    const holdingDrain = vitalsDrainHoldRef.current || prefs.needsVitalsDrain;

    /* Servidor já zerou (RPC ok ou SQL manual): libera o hold da UI. */
    if (holdingDrain && serverDrained) {
      vitalsDrainHoldRef.current = false;
      pendingVitalsResetRef.current = false;
      if (prefs.needsVitalsDrain) {
        setPrefs((p) =>
          p.needsVitalsDrain
            ? { ...p, needsVitalsDrain: false, coinCooldownIds: [], clearedSeedlingIds: [] }
            : p,
        );
      }
    }

    /* Enquanto o reset pós-moeda não confirmou: UI fica em 0 (não deixa care/realtime restaurar). */
    const seedlings = holdingDrain
      ? withZeroedCareVitals(snapshot.seedlings)
      : snapshot.seedlings;
    const selected = seedlings.find((s) => s.id === prefs.selectedSeedlingId) ?? seedlings[0];
    // Preferência antiga / muda removida do servidor → corrige para uma muda válida.
    if (selected && selected.id !== prefs.selectedSeedlingId) {
      setPrefs((p) =>
        p.selectedSeedlingId === selected.id ? p : { ...p, selectedSeedlingId: selected.id },
      );
      setServerSelectedSeedlingId(selected.id);
    }
    setWorld({
      gardenSeedlings: seedlings,
      growth: selected.growth,
      water: selected.water,
      light: selected.light,
      fertilizer: selected.fertilizer,
      cleanliness: selected.cleanliness,
      pestFree: selected.pestFree,
      lastCareAt: selected.lastCareAt,
    });
  }, [snapshot, prefs.selectedSeedlingId, prefs.needsVitalsDrain, setServerSelectedSeedlingId]);

  const activeSeedling =
    world.gardenSeedlings.find((seedling) => seedling.id === prefs.selectedSeedlingId) ??
    world.gardenSeedlings[0];

  const selectSeedling = useCallback(
    (seedlingId: string) => {
      setPrefs((p) =>
        p.selectedSeedlingId === seedlingId ? p : { ...p, selectedSeedlingId: seedlingId },
      );
      setServerSelectedSeedlingId(seedlingId);
      setWorld((current) => {
        const seedling = current.gardenSeedlings.find((item) => item.id === seedlingId);
        if (!seedling) return current;
        return {
          ...current,
          growth: seedling.growth,
          water: seedling.water,
          light: seedling.light,
          fertilizer: seedling.fertilizer,
          cleanliness: seedling.cleanliness,
          pestFree: seedling.pestFree,
          lastCareAt: seedling.lastCareAt,
        };
      });
    },
    [setServerSelectedSeedlingId],
  );

  const stage = stageOf(world.growth);
  const stageInfo = STAGES.find((s) => s.id === stage)!;
  const nextStage = STAGES[STAGES.findIndex((s) => s.id === stage) + 1];
  const progress = nextStage
    ? ((world.growth - stageInfo.min) / (nextStage.min - stageInfo.min)) * 100
    : 100;
  const activeBeauty = activeSeedling?.beauty ?? 18;
  const pruneNeeded = needsPruneCare(world.growth, activeBeauty, world.fertilizer);
  const pestRemovalNeeded = world.pestFree < 55;
  const gardenGoal = gardenCoinCycleProgress(
    world.gardenSeedlings,
    prefs.clearedSeedlingIds,
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Segue o relógio local real. Os segundos mantêm o movimento do sol contínuo,
  // e o entardecer se estende até 20h15 para escurecer devagar como na vida real.
  const localDate = new Date(now);
  const localHour =
    localDate.getHours() + localDate.getMinutes() / 60 + localDate.getSeconds() / 3600;
  const isNight = localHour < 5.25 || localHour >= 20.25;
  const musicEnabled = prefs.settings.soundMode !== "nature";
  const natureEnabled = prefs.settings.soundMode !== "music";
  const natureSource = pickNatureTrack({
    raining,
    localHour,
    rainTrackIdx,
  });

  const pushToast = useCallback((icon: string, text: string, recordTimeline = false) => {
    const id = ++idRef.current;
    void audioRef.current.chime("event");
    setToasts((t) => [...t, { id, icon, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    if (recordTimeline) {
      setRareEventsCount((n) => n + 1);
      setPrefs((p) => ({
        ...p,
        timeline: [{ ts: Date.now(), kind: "event", icon, text }, ...p.timeline].slice(0, 200),
      }));
    }
  }, []);

  /* Avisa quando o servidor confirma o zero pós-moeda (depois de pushToast existir). */
  const wasDrainingRef = useRef(false);
  useEffect(() => {
    if (prefs.needsVitalsDrain) {
      wasDrainingRef.current = true;
      return;
    }
    if (
      wasDrainingRef.current &&
      snapshot &&
      careVitalsDrained(snapshot.seedlings)
    ) {
      wasDrainingRef.current = false;
      pushToast("🌿", "Barras de cuidado zeradas — comece o próximo ciclo!");
    }
  }, [prefs.needsVitalsDrain, snapshot, pushToast]);

  /* Migração: quem já tinha moeda no schema antigo precisa esvaziar as barras uma vez. */
  useEffect(() => {
    if (prefs.coinCycleSchema >= 2) return;
    setPrefs((p) => {
      if (p.coinCycleSchema >= 2) return p;
      const alreadyWon = p.coins > 0;
      return {
        ...p,
        coinCycleSchema: 2,
        clearedSeedlingIds: alreadyWon ? [] : p.clearedSeedlingIds,
        needsVitalsDrain: alreadyWon || p.needsVitalsDrain,
      };
    });
  }, [prefs.coinCycleSchema, prefs.coins]);

  /* Schema 3: corrige flag preso que deixava as barras eternamente em 0. */
  useEffect(() => {
    if (prefs.coinCycleSchema >= 3) return;
    setPrefs((p) => {
      if (p.coinCycleSchema >= 3) return p;
      return {
        ...p,
        coinCycleSchema: 3,
        needsVitalsDrain: false,
      };
    });
    pendingVitalsResetRef.current = false;
  }, [prefs.coinCycleSchema]);

  /* Schema 4: se ganhou moeda há pouco e as barras ainda estão cheias, força novo reset.
     (Bug antigo: cuidar logo após a moeda cancelava o zerar no servidor.) */
  useEffect(() => {
    if (prefs.coinCycleSchema >= 4) return;
    if (!snapshot || snapshot.seedlings.length === 0) return;
    const lastCoin = prefs.timeline.find((t) => t.kind === "coin");
    const coinRecent =
      !!lastCoin && Date.now() - lastCoin.ts < 2 * 60 * 60 * 1000; /* 2h */
    const stillFull = !careVitalsDrained(snapshot.seedlings);
    setPrefs((p) => {
      if (p.coinCycleSchema >= 4) return p;
      return {
        ...p,
        coinCycleSchema: 4,
        needsVitalsDrain: coinRecent && stillFull ? true : p.needsVitalsDrain,
      };
    });
    if (coinRecent && stillFull) {
      vitalsDrainHoldRef.current = true;
      pendingVitalsResetRef.current = false;
    }
  }, [prefs.coinCycleSchema, prefs.timeline, snapshot]);

  /* Schema 5: enquanto a última moeda for recente e o servidor não zerou, insiste no drain.
     Não libera a UI até careVitalsDrained — evita barras voltarem cheias. */
  useEffect(() => {
    if (prefs.coinCycleSchema < 5) {
      setPrefs((p) => (p.coinCycleSchema >= 5 ? p : { ...p, coinCycleSchema: 5 }));
    }
    if (!snapshot || snapshot.seedlings.length === 0) return;
    const lastCoin = prefs.timeline.find((t) => t.kind === "coin");
    if (!lastCoin) return;
    const coinRecent = Date.now() - lastCoin.ts < 15 * 60 * 1000; /* 15 min */
    if (!coinRecent) return;
    if (careVitalsDrained(snapshot.seedlings)) return;
    if (prefs.needsVitalsDrain) {
      vitalsDrainHoldRef.current = true;
      return;
    }
    vitalsDrainHoldRef.current = true;
    pendingVitalsResetRef.current = false;
    setPrefs((p) => (p.needsVitalsDrain ? p : { ...p, needsVitalsDrain: true }));
  }, [prefs.coinCycleSchema, prefs.timeline, prefs.needsVitalsDrain, snapshot]);

  useEffect(() => {
    if (!snapshot || snapshot.seedlings.length < COMMUNITY_SEEDLING_COUNT) return;
    const shouldDrain =
      prefs.needsVitalsDrain ||
      (prefs.clearedSeedlingIds.length === 0 && prefs.coinCooldownIds.length > 0);
    if (!shouldDrain) {
      pendingVitalsResetRef.current = false;
      return;
    }
    if (pendingVitalsResetRef.current) return;
    pendingVitalsResetRef.current = true;

    const drain = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await resetVitalsForNewCycle();
          /* Só libera needsVitalsDrain quando o snapshot do servidor confirmar (efeito acima). */
          pendingVitalsResetRef.current = false;
          return;
        } catch (err) {
          lastError = err;
          await new Promise((r) => window.setTimeout(r, 400 * (attempt + 1)));
        }
      }
      pendingVitalsResetRef.current = false;
      console.warn("[jardim] falha ao zerar vitais", lastError);
      pushToast("⚠️", "Não deu para zerar as barras no servidor. Tente recarregar o jogo.");
    };

    void drain();
  }, [
    snapshot,
    prefs.needsVitalsDrain,
    prefs.clearedSeedlingIds.length,
    prefs.coinCooldownIds.length,
    resetVitalsForNewCycle,
    pushToast,
  ]);

  /* Progresso por árvore: zerar uma conta (mesmo se os vitais caírem depois).
     Na 5ª do ciclo → +1 moeda. Depois cada árvore precisa sair de 100%
     antes de contar de novo. */
  useEffect(() => {
    const seedlings = world.gardenSeedlings;
    if (seedlings.length < COMMUNITY_SEEDLING_COUNT) return;
    if (coinAwardLockRef.current) return;

    const perfectIds = new Set(
      seedlings.filter((s) => seedlingVitalsPerfect(s)).map((s) => s.id),
    );
    const gardenIds = seedlings.map((s) => s.id);
    const nameById = new Map(seedlings.map((s) => [s.id, s.name]));

    const cooldownStillActive = prefs.coinCooldownIds.filter((id) => perfectIds.has(id));
    const cooldownSet = new Set(cooldownStillActive);
    const clearedSet = new Set(prefs.clearedSeedlingIds);
    const freshIds = gardenIds.filter(
      (id) => perfectIds.has(id) && !clearedSet.has(id) && !cooldownSet.has(id),
    );
    const cooldownChanged =
      cooldownStillActive.length !== prefs.coinCooldownIds.length ||
      cooldownStillActive.some((id, i) => id !== prefs.coinCooldownIds[i]);

    if (freshIds.length === 0 && !cooldownChanged) return;

    const nextCleared = [...new Set([...prefs.clearedSeedlingIds, ...freshIds])].filter((id) =>
      gardenIds.includes(id),
    );
    const cycleDone =
      gardenIds.length >= COMMUNITY_SEEDLING_COUNT &&
      gardenIds.every((id) => nextCleared.includes(id));

    coinAwardLockRef.current = true;

    if (cycleDone) {
      /* Zera na tela na hora e segura até o servidor confirmar. */
      vitalsDrainHoldRef.current = true;
      pendingVitalsResetRef.current = false;
      setWorld((current) => {
        const zeroed = withZeroedCareVitals(current.gardenSeedlings);
        const selected =
          zeroed.find((s) => s.id === prefs.selectedSeedlingId) ?? zeroed[0];
        return {
          ...current,
          gardenSeedlings: zeroed,
          water: selected?.water ?? 0,
          light: selected?.light ?? 0,
          fertilizer: selected?.fertilizer ?? 0,
          cleanliness: selected?.cleanliness ?? 0,
          pestFree: selected?.pestFree ?? 0,
        };
      });
      setPrefs((p) => ({
        ...p,
        coins: p.coins + 1,
        clearedSeedlingIds: [],
        coinCooldownIds: [],
        needsVitalsDrain: true,
        timeline: [
          {
            ts: Date.now(),
            kind: "coin",
            icon: "🪙",
            text: "Você zerou as 5 árvores (uma de cada vez)! +1 moeda. Progresso reiniciado.",
          },
          ...p.timeline,
        ].slice(0, 200),
      }));
      pushToast(
        "🪙",
        "Ciclo completo! +1 moeda. Barras zeradas — comece de novo nas 5 árvores.",
      );
      void audioRef.current.chime("event");

      const drainNow = async () => {
        pendingVitalsResetRef.current = true;
        let lastError: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            await resetVitalsForNewCycle();
            /* Mantém hold/needsVitalsDrain até o snapshot confirmar zeros no servidor. */
            pendingVitalsResetRef.current = false;
            return;
          } catch (err) {
            lastError = err;
            await new Promise((r) => window.setTimeout(r, 500 * (attempt + 1)));
          }
        }
        pendingVitalsResetRef.current = false;
        console.warn("[jardim] falha ao zerar vitais após moeda", lastError);
        pushToast(
          "⚠️",
          "Moeda ok, mas as barras não zeraram no servidor. Recarregue ou rode o SQL de reset.",
        );
      };
      void drainNow();
    } else if (freshIds.length > 0) {
      const names = freshIds.map((id) => nameById.get(id) ?? "Árvore").join(", ");
      const count = nextCleared.length;
      setPrefs((p) => ({
        ...p,
        clearedSeedlingIds: nextCleared,
        coinCooldownIds: cooldownStillActive,
        timeline: [
          {
            ts: Date.now(),
            kind: "event",
            icon: "🌳",
            text: `${names} zerada! Progresso ${count}/5 para a moeda.`,
          },
          ...p.timeline,
        ].slice(0, 200),
      }));
      pushToast(
        "🌳",
        `${names} em 100%! ${count}/5 — pode ir para a próxima árvore.`,
      );
      void audioRef.current.chime("event");
    } else {
      setPrefs((p) => ({ ...p, coinCooldownIds: cooldownStillActive }));
    }
  }, [
    world.gardenSeedlings,
    prefs.clearedSeedlingIds,
    prefs.coinCooldownIds,
    prefs.selectedSeedlingId,
    pushToast,
    resetVitalsForNewCycle,
  ]);

  useEffect(() => {
    coinAwardLockRef.current = false;
  }, [prefs.clearedSeedlingIds, prefs.coinCooldownIds, prefs.coins]);

  // Clima vem do servidor — aqui só anunciamos as transições.
  useEffect(() => {
    if (worldLoading) return;
    const prev = prevRainingRef.current;
    prevRainingRef.current = raining;
    if (prev === null || prev === raining) return;
    if (raining) {
      pushToast("🌧️", "Uma chuva suave começou no jardim comunitário", true);
    } else {
      pushToast("☀️", "A chuva passou e o sol abriu no jardim", true);
    }
  }, [raining, worldLoading, pushToast]);

  // Eventos raros apenas cosméticos (não alteram o mundo — isso é papel do servidor).
  useEffect(() => {
    const events: [string, string][] = [
      ["🦋", "Uma borboleta rara pousou no jardim!"],
      ["🐦", "Um passarinho visitou a árvore!"],
      ["🌸", "Uma flor especial desabrochou!"],
      ["✨", "O jardim brilhou por um instante!"],
      ["🌿", "Uma nova muda surgiu sozinha!"],
    ];
    const t = setInterval(() => {
      if (Math.random() < 0.28) {
        const [icon, text] = events[Math.floor(Math.random() * events.length)];
        pushToast(icon, text, true);
      }
    }, 60000);
    return () => clearInterval(t);
  }, [pushToast]);

  const act = useCallback(
    (kind: CareKind) => {
      if (!profile.userId) {
        pushToast("🔒", "Entre com sua conta para cuidar das plantas.");
        return;
      }
      if (!snapshot) {
        pushToast("⏳", "Aguarde o jardim terminar de sincronizar.");
        return;
      }
      /* Não cuidar enquanto zera pós-moeda — antes o care cancelava o reset e as barras voltavam. */
      if (vitalsDrainHoldRef.current || prefs.needsVitalsDrain) {
        pushToast("🌿", "Zerando as barras após a moeda… aguarde um instante e tente de novo.");
        return;
      }
      const until = cooldowns[kind];
      if (Date.now() < until) return;
      const seedlingId =
        snapshot.seedlings.find((s) => s.id === prefs.selectedSeedlingId)?.id ??
        snapshot.seedlings[0]?.id;
      if (!seedlingId) {
        pushToast("⚠️", "Nenhuma muda disponível para cuidar agora.");
        return;
      }
      if (!muted) {
        void (async () => {
          await audioRef.current.unlockFromGesture();
          audioRef.current.setVolume(prefs.settings.volume);
          await audioRef.current.chime(kind);
        })();
      }
      if (careFxTimerRef.current) window.clearTimeout(careFxTimerRef.current);
      setCareFx(kind);
      setCareFxKey((k) => k + 1);
      careFxTimerRef.current = window.setTimeout(() => setCareFx(null), 1400);
      // Cooldown otimista; o crescimento real vem do snapshot do servidor.
      setCooldowns((c) => ({ ...c, [kind]: Date.now() + CARE_COOLDOWN_MS }));
      setPersonalCareActions((n) => n + 1);

      void care(seedlingId, kind)
        .then(() => {
          if (kind === "fertilizer") {
            pushToast("🌿", "O adubo alimentou as raízes — a muda cresceu mais rápido!");
          }
          if (kind === "prune") {
            pushToast("✂️", "Poda feita! A copa ficou mais bonita e colorida.");
          }
          if (kind === "pest") {
            pushToast("🐞", "Pragas removidas! A muda pode voltar a crescer saudável.");
          }
        })
        .catch((err: unknown) => {
          setCooldowns((c) => ({ ...c, [kind]: 0 }));
          setPersonalCareActions((n) => Math.max(0, n - 1));
          const raw = err instanceof Error ? err.message : "Não foi possível registrar o cuidado.";
          pushToast("⚠️", friendlyGardenError(raw));
        });
    },
    [
      care,
      cooldowns,
      muted,
      prefs.needsVitalsDrain,
      prefs.selectedSeedlingId,
      prefs.settings.volume,
      profile.userId,
      pushToast,
      snapshot,
    ],
  );

  const startPlayback = useCallback(async () => {
    audioRef.current.setVolume(prefs.settings.volume);
    await audioRef.current.unlockFromGesture();
    if (!musicEnabled) {
      musicRef.current?.pause();
      await audioRef.current.stopMusic();
      return;
    }
    const a = musicRef.current;
    if (!usePadMusic && a) {
      const duck =
        prefs.settings.soundMode === "both" ? (raining ? 0.3 : isNight ? 0.42 : 0.58) : 0.82;
      a.volume = Math.min(1, prefs.settings.volume * duck);
      try {
        await a.play();
        return;
      } catch {
        /* Autoplay / ainda carregando — usa o pad até o MP3 estar pronto. */
        await audioRef.current.startMusic();
        return;
      }
    }
    await audioRef.current.startMusic();
  }, [
    isNight,
    musicEnabled,
    raining,
    prefs.settings.soundMode,
    prefs.settings.volume,
    usePadMusic,
  ]);

  const startNaturePlayback = useCallback(async () => {
    const nature = natureRef.current;
    if (!nature || !natureEnabled || !natureSource) return;
    const natureLevel = raining ? 0.74 : isNight ? 0.4 : 0.34;
    nature.volume = Math.min(
      1,
      prefs.settings.volume * natureLevel * (prefs.settings.soundMode === "both" ? 0.88 : 1),
    );
    try {
      await nature.play();
    } catch {
      /* Ainda bloqueado — o gesto seguinte tenta de novo. */
    }
  }, [
    isNight,
    natureEnabled,
    natureSource,
    raining,
    prefs.settings.soundMode,
    prefs.settings.volume,
  ]);

  /** Tem de rodar DENTRO do clique — play() fora do gesto o navegador silencia. */
  const kickstartAudio = useCallback(async () => {
    audioRef.current.setVolume(prefs.settings.volume);
    await audioRef.current.unlockFromGesture();
    await startPlayback();
    await startNaturePlayback();
  }, [prefs.settings.volume, startNaturePlayback, startPlayback]);

  const stopPlayback = useCallback(async () => {
    musicRef.current?.pause();
    natureRef.current?.pause();
    await audioRef.current.stopMusic();
  }, []);

  const handleCloseGame = useCallback(() => {
    void stopPlayback().finally(() => {
      const music = musicRef.current;
      if (music) {
        music.pause();
        music.removeAttribute("src");
        try {
          music.load();
        } catch {
          /* noop */
        }
      }
      const nature = natureRef.current;
      if (nature) {
        nature.pause();
        nature.removeAttribute("src");
        try {
          nature.load();
        } catch {
          /* noop */
        }
      }
      audioRef.current.dispose();
      onClose?.();
    });
  }, [onClose, stopPlayback]);

  const toggleSound = () => {
    setPrefs((p) => {
      const nextMuted = !p.muted;
      if (nextMuted) {
        void stopPlayback();
      } else {
        void kickstartAudio();
      }
      return { ...p, muted: nextMuted, soundChosen: true };
    });
  };

  const enableSound = useCallback(() => {
    setPrefs((p) => ({ ...p, muted: false, soundChosen: true }));
    void kickstartAudio();
  }, [kickstartAudio]);

  useEffect(
    () => () => {
      if (careFxTimerRef.current) window.clearTimeout(careFxTimerRef.current);
      const music = musicRef.current;
      if (music) {
        music.pause();
        music.removeAttribute("src");
        try {
          music.load();
        } catch {
          /* noop */
        }
      }
      const nature = natureRef.current;
      if (nature) {
        nature.pause();
        nature.removeAttribute("src");
        try {
          nature.load();
        } catch {
          /* noop */
        }
      }
      void audioRef.current.stopMusic();
      audioRef.current.dispose();
    },
    [],
  );
  useEffect(() => {
    audioRef.current.setVolume(prefs.settings.volume);
    const a = musicRef.current;
    const duck =
      prefs.settings.soundMode === "both" ? (raining ? 0.3 : isNight ? 0.42 : 0.58) : 0.82;
    if (a) a.volume = Math.min(1, prefs.settings.volume * duck);
    const nature = natureRef.current;
    if (nature) {
      const natureLevel = raining ? 0.74 : isNight ? 0.4 : 0.34;
      nature.volume = Math.min(
        1,
        prefs.settings.volume * natureLevel * (prefs.settings.soundMode === "both" ? 0.88 : 1),
      );
    }
  }, [isNight, raining, prefs.settings.soundMode, prefs.settings.volume]);

  // Keep HTML track and pad music in sync with mute / track changes
  useEffect(() => {
    if (muted) {
      void stopPlayback();
      return;
    }
    void startPlayback();
  }, [muted, trackIdx, usePadMusic, musicEnabled, startPlayback, stopPlayback]);

  /* Toque suave em toda ação: qualquer botão do jogo emite uma "gotinha" musical. */
  const gameRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gameRootRef.current;
    if (!el) return;
    const onDown = (event: Event) => {
      if (muted) return;
      const target = event.target as HTMLElement | null;
      /* Botões de cuidado já tocam SFX próprio (regar/podar/…). */
      if (target?.closest("[data-care-sfx]")) return;
      if (target?.closest("button")) void audioRef.current.uiClick();
    };
    el.addEventListener("pointerdown", onDown, true);
    return () => el.removeEventListener("pointerdown", onDown, true);
  }, [muted]);

  /* 1º toque: libera áudio no mesmo gesto (não esperar o useEffect). */
  useEffect(() => {
    if (prefs.soundChosen) return;
    const unlockOnFirstTap = () => {
      enableSound();
    };
    window.addEventListener("pointerdown", unlockOnFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", unlockOnFirstTap);
  }, [prefs.soundChosen, enableSound]);

  useEffect(() => {
    const nature = natureRef.current;
    if (!nature) return;
    if (muted || !natureEnabled || !natureSource) {
      nature.pause();
      return;
    }
    void startNaturePlayback();
  }, [
    muted,
    natureEnabled,
    natureSource,
    raining,
    isNight,
    prefs.settings.soundMode,
    prefs.settings.volume,
    startNaturePlayback,
  ]);

  /** Avança para a próxima faixa e volta ao início ao terminar a última. */
  const handleTrackEnd = () => {
    setTrackIdx((i) => (i + 1) % MUSIC_TRACKS.length);
  };
  const handleTrackError = () => {
    setUsePadMusic(true);
    if (!muted && musicEnabled) void audioRef.current.startMusic();
  };

  useEffect(() => {
    const prev = prevStageRef.current;
    if (prev && prev !== stage) {
      const info = STAGES.find((x) => x.id === stage)!;
      setPrefs((p) => ({
        ...p,
        timeline: [
          {
            ts: Date.now(),
            kind: "stage",
            icon: info.emoji,
            text: `Nova fase: ${info.name}`,
          },
          ...p.timeline,
        ].slice(0, 200),
      }));
      pushToast(info.emoji, `Nova fase: ${info.name}`, false);
      if (stage === "flowering" || stage === "fruiting" || stage === "hope") {
        pushToast(
          "✨",
          activeBeauty >= 55
            ? "Surpresa! A árvore explodiu em cores vivas — a poda valeu a pena!"
            : "A árvore cresceu! Podar agora deixa a floração ainda mais colorida.",
          false,
        );
      }
    }
    prevStageRef.current = stage;
  }, [stage, pushToast, activeBeauty]);

  useEffect(() => {
    if (!pruneNeeded) return;
    const nowTs = Date.now();
    if (nowTs - pruneHintAtRef.current < 50_000) return;
    pruneHintAtRef.current = nowTs;
    pushToast(
      "✂️",
      "Hora de podar! O adubo deu força — a poda deixa a muda linda e colorida.",
      false,
    );
  }, [pruneNeeded, pushToast, prefs.selectedSeedlingId]);

  useEffect(() => {
    if (!pestRemovalNeeded) return;
    const nowTs = Date.now();
    if (nowTs - pestHintAtRef.current < 50_000) return;
    pestHintAtRef.current = nowTs;
    pushToast("🐛", "Atenção: apareceram pragas nesta muda. Use Remover Pragas!", false);
  }, [pestRemovalNeeded, pushToast, prefs.selectedSeedlingId]);

  useEffect(() => {
    const stats: PlayerStats = {
      growth: world.growth,
      totalCareActions: personalCareActions,
      streak,
      rareEventsCount,
    };
    setPrefs((p) => {
      let changed = false;
      let timeline = p.timeline;
      let achievements = p.achievements;
      for (const a of ACHIEVEMENTS) {
        if (!achievements.includes(a.id) && a.check(stats)) {
          changed = true;
          achievements = [...achievements, a.id];
          timeline = [
            {
              ts: Date.now(),
              kind: "achievement",
              icon: a.icon,
              text: `Conquista: ${a.name}`,
            },
            ...timeline,
          ].slice(0, 200);
        }
      }
      return changed ? { ...p, achievements, timeline } : p;
    });
  }, [world.growth, personalCareActions, streak, rareEventsCount]);

  useEffect(() => {
    if (!prefs.settings.remindersEnabled) return;
    const check = () => {
      const t = Date.now();
      const hoursSinceCare = (t - world.lastCareAt) / (1000 * 60 * 60);
      const hoursSinceReminder = (t - lastReminderShown) / (1000 * 60 * 60);
      const currentHour = new Date().getHours();
      if (
        hoursSinceCare >= 20 &&
        hoursSinceReminder >= 12 &&
        currentHour === prefs.settings.reminderHour &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("🌱 Jogo Jardim da Esperança", {
            body: "Sua plantinha sente sua falta — venha cuidar dela hoje!",
            icon: "/favicon.ico",
          });
        } catch {
          /* noop */
        }
        setLastReminderShown(Date.now());
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [
    prefs.settings.remindersEnabled,
    prefs.settings.reminderHour,
    world.lastCareAt,
    lastReminderShown,
  ]);

  const cdRemaining = (kind: CareKind) => Math.max(0, cooldowns[kind] - now);

  return (
    <div ref={gameRootRef} className="fixed inset-0 z-[100] flex flex-col bg-black">
      {!usePadMusic && (
        <audio
          key={trackIdx}
          ref={musicRef}
          src={MUSIC_TRACKS[trackIdx]}
          onEnded={handleTrackEnd}
          onError={handleTrackError}
          onLoadedData={() => {
            if (muted || !musicEnabled) return;
            const a = musicRef.current;
            if (!a) return;
            const duck =
              prefs.settings.soundMode === "both" ? (raining ? 0.3 : isNight ? 0.42 : 0.58) : 0.82;
            a.volume = Math.min(1, prefs.settings.volume * duck);
            void a.play().catch(() => {
              void audioRef.current.startMusic();
            });
          }}
          preload="auto"
        />
      )}
      {natureSource && (
        <audio
          key={natureSource}
          ref={natureRef}
          src={natureSource}
          loop={!raining}
          preload="auto"
          onEnded={() => {
            if (raining) setRainTrackIdx((index) => (index + 1) % RAIN_TRACKS.length);
          }}
          onLoadedData={() => {
            const nature = natureRef.current;
            if (!nature || muted || !natureEnabled) return;
            const natureLevel = raining ? 0.74 : isNight ? 0.4 : 0.34;
            nature.volume = Math.min(
              1,
              prefs.settings.volume *
                natureLevel *
                (prefs.settings.soundMode === "both" ? 0.88 : 1),
            );
            void nature.play().catch(() => {
              // Starts after the player's first sound interaction when autoplay is restricted.
            });
          }}
        />
      )}

      {/* Header: hora | título + moedas | ferramentas */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="z-10 shrink-0">
          <GameClock isNight={isNight} />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden px-1 sm:gap-2">
          <div className="flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2 rounded-2xl bg-black/45 px-2.5 py-1.5 backdrop-blur-md sm:gap-3 sm:px-3">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-warm text-primary-foreground shadow-warm sm:h-10 sm:w-10 sm:rounded-2xl">
              <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-1.5 text-[10px] font-bold text-primary shadow">
                {streak}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="fire-text truncate text-xs font-semibold sm:text-sm">
                {stageInfo.emoji} Jogo Jardim da Esperança
              </h2>
              <p className="truncate text-[10px] text-white/65 sm:text-[11px]">
                {profile.fullName} · {activeSeedling?.totalCareActions ?? 0} cuidados ·{" "}
                {Math.floor(progress)}%
              </p>
            </div>
            <span
              title={worldError ?? undefined}
              className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold sm:inline-flex ${
                connected ? "bg-emerald-500/25 text-emerald-200" : "bg-red-500/25 text-red-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
              />
              {connected ? "Ao vivo" : worldError ? "Erro de conexão" : "Reconectando…"}
            </span>
          </div>

          <div
            className="flex w-[10.5rem] shrink-0 items-center gap-1.5 rounded-2xl bg-black/45 px-2 py-1.5 backdrop-blur-md sm:w-48 sm:gap-2 sm:px-2.5"
            title="Zere uma árvore de cada vez (água, beleza, adubo, limpeza e sem pragas em 100%). Cada uma conta no progresso; na 5ª você ganha 1 moeda — mesmo se as outras já tiverem baixado."
          >
            <div
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 sm:px-2 ${
                gardenGoal.clearedCount >= gardenGoal.total
                  ? "bg-amber-400/35 text-amber-100 ring-1 ring-amber-300/60"
                  : "bg-amber-400/20 text-amber-200"
              }`}
            >
              <Coins className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11px] font-bold tabular-nums">{prefs.coins}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 text-[8px] font-semibold text-white/70 sm:text-[9px]">
                <span className="truncate">
                  {gardenGoal.clearedCount}/5 árvores
                </span>
                <span className="tabular-nums text-amber-100/90">{gardenGoal.percent}%</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-500"
                  style={{ width: `${gardenGoal.percent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="max-w-[7.5rem] shrink-0 truncate rounded-2xl bg-black/45 px-2 py-1.5 text-[9px] font-medium text-white backdrop-blur-md sm:max-w-[14rem] sm:px-3 sm:text-xs">
            {stageInfo.emoji} {stageInfo.name}
            {nextStage && (
              <span className="text-white/60">
                {" "}
                → {nextStage.name} · {Math.floor(progress)}%
              </span>
            )}
          </div>
        </div>

        <div className="z-10 flex shrink-0 items-center gap-1.5">
          {onClose && (
            <button
              type="button"
              onClick={handleCloseGame}
              className="inline-flex items-center gap-1 rounded-2xl bg-black/45 px-2.5 py-2 text-[11px] font-semibold text-white/75 backdrop-blur-md transition hover:bg-black/60 hover:text-white sm:py-2.5"
              aria-label="Voltar ao site"
              title="Voltar ao site"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Voltar ao site</span>
            </button>
          )}
          <div className="flex shrink-0 items-center gap-0.5 rounded-2xl bg-black/45 p-1 backdrop-blur-md">
            {toolsOpen && (
              <div
                className="flex items-center gap-0.5"
                style={{ animation: "pop-in 0.25s cubic-bezier(0.34,1.5,0.64,1)" }}
              >
                <IconBtn onClick={() => setPanel("timeline")} label="Linha do tempo">
                  <History className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconBtn>
                <IconBtn onClick={() => setPanel("skins")} label="Aparências">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconBtn>
                <IconBtn onClick={() => setPanel("settings")} label="Configurações">
                  <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconBtn>
                <IconBtn onClick={toggleSound} label="Som">
                  {muted ? (
                    <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </IconBtn>
                {onClose && (
                  <IconBtn onClick={handleCloseGame} label="Fechar">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </IconBtn>
                )}
              </div>
            )}
            <IconBtn
              onClick={() => (toolsOpen ? setToolsOpen(false) : openTools())}
              label={toolsOpen ? "Esconder opções" : "Abrir opções"}
            >
              {toolsOpen ? (
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </IconBtn>
          </div>
        </div>
      </div>

      {/* 3D Scene full bleed */}
      <div
        className={`relative min-h-0 flex-1 ${prefs.settings.reduceMotion ? "reduce-motion" : ""} ${
          prefs.settings.highContrast ? "contrast-125 saturate-150" : ""
        }`}
        style={{ filter: getGardenSkin(prefs.skin).filter }}
      >
        <Scene3D
          stage={stage}
          growth={world.growth}
          isNight={isNight}
          solarHour={localHour}
          raining={raining}
          clearing={clearing}
          reduceMotion={prefs.settings.reduceMotion}
          isMobile={isMobile}
          careFx={careFx}
          careFxKey={careFxKey}
          butterflySeeds={butterflySeeds}
          seedlings={world.gardenSeedlings}
          selectedSeedlingId={prefs.selectedSeedlingId}
          onSelectSeedling={selectSeedling}
          skinId={prefs.skin}
        />
        {/* Lavagem de cor / vinheta da aparência — imersão sem pesar a GPU */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-700"
          style={{ background: getGardenSkin(prefs.skin).overlay }}
        />

        {/* Community garden navigator — retrátil: abre ao aproximar o mouse, fecha sozinho em 30s */}
        <div
          className="pointer-events-auto absolute left-2 right-2 top-16 z-20 sm:left-3 sm:right-auto sm:top-20 sm:w-60"
          onMouseEnter={openNav}
          onMouseMove={navOpen ? openNav : undefined}
        >
          {/* Zona invisível de aproximação: chegar perto já abre o painel */}
          {!navOpen && (
            <div aria-hidden onMouseEnter={openNav} className="absolute -inset-6 sm:-inset-8" />
          )}
          {!navOpen ? (
            <button
              onClick={openNav}
              onMouseEnter={openNav}
              className="relative flex flex-col items-start gap-0.5 rounded-2xl border border-amber-300/40 bg-black/45 px-3 py-2 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/60"
              aria-label="Abrir painel das mudas"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 animate-pulse text-amber-300" />
                <span className="text-[11px] font-semibold">Mudas do jardim</span>
                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
              </span>
              <span className="text-[9px] font-medium text-amber-200/90">
                {isMobile ? "Toque aqui para abrir" : "Passe o mouse aqui para abrir"}
              </span>
            </button>
          ) : (
            <div
              className="flex gap-1.5 overflow-x-auto rounded-2xl bg-black/35 p-1.5 backdrop-blur-md sm:flex-col sm:overflow-visible"
              style={{ animation: "pop-in 0.25s cubic-bezier(0.34,1.5,0.64,1)" }}
            >
              <div className="hidden items-center gap-2 px-2 py-1 text-white sm:flex">
                <Users className="h-4 w-4 text-emerald-300" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">{profile.fullName}</p>
                  <p className="text-[9px] text-white/55">entrou no jardim comunitário</p>
                </div>
              </div>
              {world.gardenSeedlings.map((seedling) => {
                const selected = seedling.id === prefs.selectedSeedlingId;
                const perfect = seedlingVitalsPerfect(seedling);
                const counted = gardenGoal.clearedIds.has(seedling.id);
                return (
                  <button
                    key={seedling.id}
                    onClick={() => selectSeedling(seedling.id)}
                    className={`flex min-w-[8.5rem] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition active:scale-[0.98] sm:min-w-0 ${
                      selected
                        ? "border-amber-300/70 bg-amber-100/20 text-white"
                        : counted
                          ? "border-amber-400/45 bg-amber-500/15 text-white"
                          : perfect
                            ? "border-emerald-400/50 bg-emerald-500/15 text-white"
                            : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {counted ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    ) : perfect ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                    ) : (
                      <MapPin
                        className={`h-3.5 w-3.5 shrink-0 ${selected ? "text-amber-300" : ""}`}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold">
                        {seedling.name}
                      </span>
                      <span className="block truncate text-[8px] text-white/50">
                        {counted
                          ? "Conta na moeda"
                          : perfect
                            ? "100% completa"
                            : seedling.species}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showControlsHint && (
          <div
            className="pointer-events-none absolute bottom-[7.5rem] left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[10px] text-white/85 backdrop-blur-sm sm:bottom-[8.5rem] sm:text-[11px]"
            style={{ animation: "toast-in 0.4s cubic-bezier(0.34,1.5,0.64,1)" }}
          >
            {isMobile
              ? "Arraste para girar · pinça para zoom"
              : "Arraste para girar · scroll para zoom"}
          </div>
        )}

        <div className="absolute left-1/2 top-16 z-30 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-20">
          {muted && (
            <button
              type="button"
              onClick={enableSound}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-black/55 px-3.5 py-1.5 text-[11px] font-semibold text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-black/70 sm:text-xs"
              aria-label="Ativar som do jardim"
            >
              <VolumeX className="h-3.5 w-3.5" aria-hidden />
              {prefs.soundChosen ? "Som desligado — toque para ligar" : "Toque para ouvir o jardim"}
            </button>
          )}
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-black/50 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md"
              style={{ animation: "toast-in 0.4s cubic-bezier(0.34,1.5,0.64,1)" }}
            >
              <span className="mr-2 text-lg">{t.icon}</span>
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* Chat + jogadores online (multiplayer) */}
      <GardenSocialPanels
        online={online}
        chat={chat}
        currentUserId={profile.userId}
        connected={connected}
        chatReady={!worldLoading}
        onSend={async (body) => {
          await sendChat(body);
        }}
      />

      {/* Care bar — touch friendly */}
      <div className="relative z-20 border-t border-white/10 bg-black/55 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:px-4 sm:pt-3">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1.5 sm:gap-2">
          <StatMini label="Água" value={world.water} color="oklch(0.72 0.15 230)" />
          <StatMini label="Beleza" value={activeBeauty} color="oklch(0.72 0.14 140)" />
          <StatMini label="Adubo" value={world.fertilizer} color="oklch(0.7 0.14 60)" />
          <StatMini label="Limpeza" value={world.cleanliness} color="var(--color-leaf)" />
          <StatMini label="Sem pragas" value={world.pestFree} color="var(--color-blossom)" />
        </div>
        <div className="mx-auto mt-2 grid max-w-3xl grid-cols-5 gap-1.5 sm:mt-3 sm:gap-2">
          <ActionBtn
            onClick={() => act("water")}
            icon={<Droplets />}
            label={raining ? "Chovendo" : CARE_LABELS.water}
            tint="230"
            cdMs={cdRemaining("water")}
            overrideDisabled={raining || !profile.userId || !snapshot}
            overrideNote={
              raining
                ? "A chuva rega"
                : !profile.userId
                  ? "Entre para cuidar"
                  : !snapshot
                    ? "Conectando…"
                    : undefined
            }
          />
          <ActionBtn
            onClick={() => act("prune")}
            icon={<Scissors />}
            label={CARE_LABELS.prune}
            tint="140"
            cdMs={cdRemaining("prune")}
            overrideDisabled={!profile.userId || !snapshot}
            overrideNote={
              !profile.userId ? "Entre para cuidar" : !snapshot ? "Conectando…" : undefined
            }
            highlight={pruneNeeded}
            highlightNote={pruneNeeded ? "Podar agora" : undefined}
          />
          <ActionBtn
            onClick={() => act("fertilizer")}
            icon={<Sprout />}
            label={CARE_LABELS.fertilizer}
            tint="60"
            cdMs={cdRemaining("fertilizer")}
            overrideDisabled={!profile.userId || !snapshot}
            overrideNote={
              !profile.userId ? "Entre para cuidar" : !snapshot ? "Conectando…" : undefined
            }
          />
          <ActionBtn
            onClick={() => act("clean")}
            icon={<Leaf />}
            label={CARE_LABELS.clean}
            tint="140"
            cdMs={cdRemaining("clean")}
            overrideDisabled={!profile.userId || !snapshot}
            overrideNote={
              !profile.userId ? "Entre para cuidar" : !snapshot ? "Conectando…" : undefined
            }
          />
          <ActionBtn
            onClick={() => act("pest")}
            icon={<Bug />}
            label={CARE_LABELS.pest}
            tint="15"
            cdMs={cdRemaining("pest")}
            overrideDisabled={!profile.userId || !snapshot}
            overrideNote={
              !profile.userId ? "Entre para cuidar" : !snapshot ? "Conectando…" : undefined
            }
            highlight={pestRemovalNeeded}
            highlightNote={pestRemovalNeeded ? "Pragas!" : undefined}
          />
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/50 sm:mt-2">
          {pestRemovalNeeded
            ? "🐛 Há pragas na muda — use Remover Pragas para protegê-la"
            : pruneNeeded
              ? "✂️ Adubo deu força — podar agora deixa a copa linda e colorida"
              : world.fertilizer >= 70
                ? "🌿 Adubo alto: a muda cresce mais rápido. Depois podar para florir"
                : "Quanto mais adubar, mais cresce · podar deixa as cores vivas"}
        </p>
      </div>

      {panel && (
        <PanelOverlay
          panel={panel}
          prefs={prefs}
          setPrefs={setPrefs}
          onClose={() => setPanel(null)}
          pushToast={pushToast}
        />
      )}

      {worldLoading && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm">
          <div className="text-center text-white">
            <Sprout className="mx-auto h-10 w-10 animate-pulse" aria-hidden />
            <p className="mt-3 text-sm font-medium">Sincronizando o jardim comunitário…</p>
            <p className="mt-1 text-xs text-white/60">Buscando as mudas e o clima em tempo real</p>
          </div>
        </div>
      )}

      {removed && (
        <div className="absolute inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-red-400/30 bg-red-950/60 p-6 text-center text-white shadow-2xl">
            <p className="text-3xl" aria-hidden>
              🚫
            </p>
            <h3 className="mt-2 text-base font-bold">Você foi removido do jardim</h3>
            <p className="mt-2 text-sm text-white/80">{removed}</p>
            <button
              onClick={() => (onClose ? handleCloseGame() : window.location.assign("/"))}
              className="mt-5 w-full rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-red-900 transition hover:bg-white"
            >
              Sair do jardim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Relógio com a hora real, no clima do jardim: sol de dia, lua à noite. */
function GameClock({ isNight }: { isNight: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <div
      className="pointer-events-none flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 shadow-lg backdrop-blur-md"
      aria-label={`Hora atual: ${hh}:${mm}`}
    >
      {isNight ? (
        <Moon className="h-3.5 w-3.5 shrink-0 text-sky-200" aria-hidden />
      ) : (
        <Sun className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
      )}
      <span className="text-xs font-bold tabular-nums text-white sm:text-sm">
        {hh}:{mm}
        <span className="ml-0.5 text-[10px] font-semibold text-emerald-300/90 sm:text-[11px]">
          :{ss}
        </span>
      </span>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full p-2 text-white/75 transition active:scale-95 hover:bg-white/15 hover:text-white"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/10 px-1.5 py-1 sm:rounded-xl sm:px-2 sm:py-1.5">
      <div className="flex items-center justify-between text-[9px] font-medium text-white/75 sm:text-[10px]">
        <span className="truncate">{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="relative mt-0.5 h-1 w-full overflow-hidden rounded-full bg-black/30 sm:mt-1 sm:h-1.5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, oklch(0.95 0.1 90))`,
          }}
        />
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  tint,
  cdMs,
  overrideDisabled = false,
  overrideNote,
  highlight = false,
  highlightNote,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  tint: string;
  cdMs: number;
  overrideDisabled?: boolean;
  overrideNote?: string;
  highlight?: boolean;
  highlightNote?: string;
}) {
  const busy = cdMs > 0;
  const sec = Math.ceil(cdMs / 1000);
  const disabled = busy || overrideDisabled;
  return (
    <button
      type="button"
      data-care-sfx=""
      onClick={onClick}
      disabled={disabled}
      className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border px-1 py-2 text-[10px] font-medium text-white shadow-md transition-all active:scale-95 disabled:opacity-55 sm:min-h-[3.75rem] sm:rounded-2xl sm:text-[11px] sm:py-2.5 ${
        highlight && !busy
          ? "border-amber-300/90 ring-2 ring-amber-300/50 animate-pulse"
          : "border-white/20"
      }`}
      style={{
        background: `linear-gradient(135deg, oklch(0.55 0.12 ${tint} / 0.65), oklch(0.35 0.08 ${tint} / 0.75))`,
      }}
    >
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold tabular-nums">
          {sec}s
        </span>
      )}
      {!busy && overrideDisabled && overrideNote && (
        <span className="absolute inset-0 flex items-center justify-center bg-sky-900/45 text-[9px] font-semibold">
          {overrideNote}
        </span>
      )}
      {!busy && !overrideDisabled && highlight && highlightNote && (
        <span className="absolute right-0.5 top-0.5 rounded bg-amber-300/90 px-1 text-[7px] font-bold text-black">
          {highlightNote}
        </span>
      )}
      <span className="relative [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-5 sm:[&_svg]:w-5">{icon}</span>
      <span className="relative">{busy ? "Aguarde" : label}</span>
    </button>
  );
}

function PanelOverlay({
  panel,
  prefs,
  setPrefs,
  onClose,
  pushToast,
}: {
  panel: "settings" | "skins" | "timeline";
  prefs: GardenPersonalPrefs;
  setPrefs: Dispatch<SetStateAction<GardenPersonalPrefs>>;
  onClose: () => void;
  pushToast: (icon: string, text: string) => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl"
        style={{ animation: "pop-in 0.35s cubic-bezier(0.34,1.5,0.64,1)" }}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <h3 className="text-base font-semibold text-foreground">
            {panel === "settings" && "Configurações"}
            {panel === "skins" && "Loja de Aparências"}
            {panel === "timeline" && "Linha do tempo"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-foreground/70 hover:bg-black/10"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {panel === "settings" && (
            <SettingsPanel prefs={prefs} setPrefs={setPrefs} pushToast={pushToast} />
          )}
          {panel === "skins" && <SkinsPanel prefs={prefs} setPrefs={setPrefs} />}
          {panel === "timeline" && <TimelinePanel prefs={prefs} />}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  prefs,
  setPrefs,
  pushToast,
}: {
  prefs: GardenPersonalPrefs;
  setPrefs: Dispatch<SetStateAction<GardenPersonalPrefs>>;
  pushToast: (icon: string, text: string) => void;
}) {
  const s = prefs.settings;
  const update = (patch: Partial<Settings>) =>
    setPrefs((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const requestReminders = async () => {
    if (typeof Notification === "undefined") {
      pushToast("⚠️", "Seu navegador não suporta lembretes.");
      return;
    }
    if (Notification.permission === "granted") {
      update({ remindersEnabled: true });
      pushToast("🔔", "Lembretes ativados!");
      return;
    }
    const p = await Notification.requestPermission();
    if (p === "granted") {
      update({ remindersEnabled: true });
      pushToast("🔔", "Lembretes ativados!");
    } else {
      pushToast("⚠️", "Permissão de notificação negada.");
    }
  };

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <SparklesIcon className="h-4 w-4" /> Acessibilidade
        </h4>
        <Toggle
          label="Reduzir animações"
          hint="Ideal se você prefere movimento mínimo."
          value={s.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
        />
        <Toggle
          label="Alto contraste"
          hint="Realça cores para melhor leitura."
          value={s.highContrast}
          onChange={(v) => update({ highContrast: v })}
        />
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Volume2 className="h-4 w-4" /> Volume
        </h4>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
          {(
            [
              ["music", "Música"],
              ["nature", "Natureza"],
              ["both", "Ambos"],
            ] as [SoundMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => update({ soundMode: mode })}
              className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                s.soundMode === mode
                  ? "bg-white text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-foreground/55">
          Em “Ambos”, a música abaixa automaticamente durante a chuva e à noite.
        </p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={(e) => update({ volume: parseFloat(e.target.value) })}
          className="w-full accent-[var(--color-leaf)]"
        />
        <div className="text-right text-xs text-foreground/60">{Math.round(s.volume * 100)}%</div>
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Bell className="h-4 w-4" /> Lembretes diários
        </h4>
        <Toggle
          label="Ativar lembretes"
          hint={s.remindersEnabled ? "Ativado" : "Desativado"}
          value={s.remindersEnabled}
          onChange={(v) => (v ? requestReminders() : update({ remindersEnabled: false }))}
        />
        <label className="mt-3 block text-xs text-foreground/70">
          Horário preferido
          <select
            value={s.reminderHour}
            onChange={(e) => update({ reminderHour: parseInt(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-black/5"
    >
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-[11px] text-foreground/60">{hint}</div>}
      </div>
      <div
        className={`relative h-6 w-11 rounded-full transition ${value ? "bg-[var(--color-leaf)]" : "bg-black/20"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? "left-[calc(100%-1.375rem)]" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function SkinsPanel({
  prefs,
  setPrefs,
}: {
  prefs: GardenPersonalPrefs;
  setPrefs: Dispatch<SetStateAction<GardenPersonalPrefs>>;
}) {
  const buySkin = (skinId: GardenSkinId) => {
    const skin = getGardenSkin(skinId);
    setPrefs((p) => {
      if (p.unlockedSkins.includes(skinId)) {
        return p.skin === skinId ? p : { ...p, skin: skinId };
      }
      if (skin.price <= 0) {
        return {
          ...p,
          skin: skinId,
          unlockedSkins: p.unlockedSkins.includes(skinId)
            ? p.unlockedSkins
            : [...p.unlockedSkins, skinId],
        };
      }
      if (p.coins < skin.price) return p;
      return {
        ...p,
        coins: p.coins - skin.price,
        skin: skinId,
        unlockedSkins: [...p.unlockedSkins, skinId],
        timeline: [
          {
            ts: Date.now(),
            kind: "skin",
            icon: "🎨",
            text: `Comprou a aparência ${skin.name} por ${skin.price} moedas.`,
          },
          ...p.timeline,
        ].slice(0, 200),
      };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-amber-500/15 px-3 py-2 text-sm">
        <span className="font-medium text-foreground/80">Suas moedas</span>
        <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-amber-800">
          <Coins className="h-4 w-4" aria-hidden />
          {prefs.coins}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-foreground/60">
        Cada aparência muda luz, névoa e atmosfera do jardim. As pagas custam{" "}
        <strong className="text-foreground/80">{GARDEN_SKIN_PRICE} moedas</strong> — ganhe cuidando
        das 5 árvores.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GARDEN_SKINS.map((sk) => {
          const owned = prefs.unlockedSkins.includes(sk.id) || sk.price <= 0;
          const selected = prefs.skin === sk.id;
          const canAfford = prefs.coins >= sk.price;
          return (
            <button
              key={sk.id}
              type="button"
              onClick={() => buySkin(sk.id)}
              disabled={!owned && !canAfford}
              className={`group relative overflow-hidden rounded-2xl border-2 p-3 text-left transition ${
                selected
                  ? "border-[var(--color-leaf)] bg-white/60 ring-1 ring-[var(--color-leaf)]/40"
                  : "border-border bg-white/40 hover:bg-white/60"
              } ${!owned && !canAfford ? "opacity-55" : ""}`}
            >
              <div
                className="relative mb-2 flex h-16 items-center justify-center overflow-hidden rounded-lg"
                style={{
                  background: sk.preview,
                  filter: owned ? "none" : "grayscale(0.85) brightness(0.9)",
                }}
              >
                <span className="text-3xl drop-shadow-md" aria-hidden>
                  🌳
                </span>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{ background: sk.overlay === "transparent" ? undefined : sk.overlay }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="truncate text-sm font-semibold text-foreground">{sk.name}</div>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-leaf)]" />}
                {!owned && <Lock className="h-3 w-3 shrink-0 text-foreground/50" />}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-foreground/60">
                {owned ? sk.description : sk.mood}
              </div>
              <div className="mt-1.5 text-[10px] font-semibold tabular-nums text-amber-800/90">
                {owned
                  ? selected
                    ? "Em uso"
                    : "Usar"
                  : canAfford
                    ? `${sk.price} moedas`
                    : `Faltam ${sk.price - prefs.coins}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelinePanel({ prefs }: { prefs: GardenPersonalPrefs }) {
  const unlockedAch = ACHIEVEMENTS.filter((a) => prefs.achievements.includes(a.id));
  return (
    <div className="space-y-5">
      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Trophy className="h-4 w-4" /> Conquistas ({unlockedAch.length}/{ACHIEVEMENTS.length})
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const on = prefs.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                  on
                    ? "border-[var(--color-leaf)] bg-white/50"
                    : "border-border bg-muted/40 opacity-50"
                }`}
                title={a.name}
              >
                <span className="text-xl">{on ? a.icon : "🔒"}</span>
                <span className="mt-1 line-clamp-2 text-[10px] font-medium text-foreground">
                  {a.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <History className="h-4 w-4" /> Momentos do seu jardim
        </h4>
        {prefs.timeline.length === 0 ? (
          <p className="rounded-xl bg-muted/50 p-4 text-center text-xs text-foreground/60">
            Nenhum momento registrado ainda. Cuide do seu jardim para começar sua jornada 🌱
          </p>
        ) : (
          <ol className="relative space-y-2 border-l-2 border-border pl-4">
            {prefs.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.35rem] top-1.5 h-3 w-3 rounded-full bg-[var(--color-leaf)] ring-2 ring-white" />
                <div className="rounded-xl bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="text-base">{t.icon}</span>
                    <span className="font-medium">{t.text}</span>
                  </div>
                  <div className="text-[10px] text-foreground/50">
                    {new Date(t.ts).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
