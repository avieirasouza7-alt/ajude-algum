/**
 * TESTE VISUAL: avance/volte o tempo do jardim.
 * true  = todas as mudas viram árvores grandes e floridas
 * false = volta às mudas pequenas (estado normal)
 * Quando o usuário pedir para voltar, deixe false.
 */
export const PREVIEW_FULL_BLOOM = false;

/** Growth na fase "Árvore florida" (1600+) com beleza alta para floração colorida. */
const PREVIEW_GROWTH = 1850;
const PREVIEW_BEAUTY = 92;

export type GardenProfile = {
  userId: string | null;
  fullName: string;
};

export type Caregiver = {
  userId: string | null;
  fullName: string;
  lastCareAt: number;
  actions: number;
};

export type CommunitySeedling = {
  id: string;
  name: string;
  species: string;
  position: [number, number, number];
  growth: number;
  water: number;
  light: number;
  fertilizer: number;
  cleanliness: number;
  pestFree: number;
  /** 0–100 — sobe ao podar; define quão colorida e bem formada fica a copa. */
  beauty: number;
  fertilizerActions: number;
  lastPrunedAt: number;
  totalCareActions: number;
  lastCareAt: number;
  caregivers: Caregiver[];
};

const BASE_VITALS = {
  water: 60,
  light: 60,
  fertilizer: 40,
  cleanliness: 100,
  pestFree: 100,
  beauty: 18,
  fertilizerActions: 0,
  lastPrunedAt: 0,
};

/** Normalize older saves that lack beauty / prune tracking. */
export function normalizeSeedling(seedling: CommunitySeedling): CommunitySeedling {
  const beauty =
    typeof seedling.beauty === "number"
      ? seedling.beauty
      : Math.min(42, 12 + seedling.growth * 0.018);
  return {
    ...seedling,
    beauty,
    fertilizerActions: seedling.fertilizerActions ?? 0,
    lastPrunedAt: seedling.lastPrunedAt ?? 0,
  };
}

/** Aplica (ou não) o preview de árvores floridas sobre a lista de mudas. */
export function applyPreviewBloom(seedlings: CommunitySeedling[]): CommunitySeedling[] {
  if (!PREVIEW_FULL_BLOOM) return seedlings;
  return seedlings.map((seedling) =>
    normalizeSeedling({
      ...seedling,
      growth: PREVIEW_GROWTH,
      beauty: PREVIEW_BEAUTY,
      water: 100,
      light: 100,
      fertilizer: 90,
      cleanliness: 100,
      pestFree: 100,
      fertilizerActions: Math.max(seedling.fertilizerActions, 8),
      lastPrunedAt: Date.now(),
    }),
  );
}

export function createCommunitySeedlings(now = Date.now()): CommunitySeedling[] {
  return [
    {
      id: "esperanca-central",
      name: "Esperança Central",
      species: "Ipê-amarelo",
      position: [0, 0, 0],
      growth: 0,
      ...BASE_VITALS,
      totalCareActions: 0,
      lastCareAt: now,
      caregivers: [],
    },
    {
      id: "muda-nascente",
      name: "Muda do Nascente",
      species: "Manacá-da-serra",
      position: [-5, 0, -5],
      growth: 12,
      ...BASE_VITALS,
      totalCareActions: 0,
      lastCareAt: now,
      caregivers: [],
    },
    {
      id: "muda-abraco",
      name: "Muda do Abraço",
      species: "Jacarandá",
      position: [5, 0, -5],
      growth: 18,
      ...BASE_VITALS,
      totalCareActions: 0,
      lastCareAt: now,
      caregivers: [],
    },
    {
      id: "muda-uniao",
      name: "Muda da União",
      species: "Pau-brasil",
      position: [-5, 0, 5],
      growth: 8,
      ...BASE_VITALS,
      totalCareActions: 0,
      lastCareAt: now,
      caregivers: [],
    },
    {
      id: "muda-futuro",
      name: "Muda do Futuro",
      species: "Quaresmeira",
      position: [5, 0, 5],
      growth: 15,
      ...BASE_VITALS,
      totalCareActions: 0,
      lastCareAt: now,
      caregivers: [],
    },
  ];
}

export function resolveGardenProfile(): GardenProfile {
  if (typeof window === "undefined") return { userId: null, fullName: "Visitante" };
  const query = new URLSearchParams(window.location.search);
  const fullName = query.get("full_name")?.trim() || query.get("userName")?.trim();
  const userId = query.get("user_id") || query.get("userId");
  return {
    userId,
    fullName: fullName || "Visitante",
  };
}

export function recordCaregiver(
  caregivers: Caregiver[],
  profile: GardenProfile,
  now = Date.now(),
): Caregiver[] {
  const key = profile.userId || profile.fullName;
  const existing = caregivers.find((c) => (c.userId || c.fullName) === key);
  const next = existing
    ? caregivers.map((c) =>
        (c.userId || c.fullName) === key
          ? { ...c, fullName: profile.fullName, lastCareAt: now, actions: c.actions + 1 }
          : c,
      )
    : [
        ...caregivers,
        {
          userId: profile.userId,
          fullName: profile.fullName,
          lastCareAt: now,
          actions: 1,
        },
      ];
  return next.sort((a, b) => b.lastCareAt - a.lastCareAt).slice(0, 12);
}
