/** Slow-growth economy: ~3–4 weeks of daily care to reach Hope. */

export type Stage =
  | "seed"
  | "sprout"
  | "twoleaves"
  | "small"
  | "young"
  | "adult"
  | "flowering"
  | "fruiting"
  | "hope";

export type CareKind = "water" | "prune" | "fertilizer" | "clean" | "pest";

export const STAGES: { id: Stage; name: string; min: number; emoji: string }[] = [
  { id: "seed", name: "Semente", min: 0, emoji: "🌰" },
  { id: "sprout", name: "Broto", min: 80, emoji: "🌱" },
  { id: "twoleaves", name: "Muda", min: 220, emoji: "🌿" },
  { id: "small", name: "Planta pequena", min: 450, emoji: "🪴" },
  { id: "young", name: "Árvore jovem", min: 750, emoji: "🌳" },
  { id: "adult", name: "Árvore adulta", min: 1150, emoji: "🌳" },
  { id: "flowering", name: "Árvore florida", min: 1600, emoji: "🌸" },
  { id: "fruiting", name: "Árvore com frutos", min: 2050, emoji: "🍎" },
  { id: "hope", name: "Jardim da Esperança", min: 2500, emoji: "✨" },
];

export const GROWTH_MAX = 2800;

/** Passive gain per second: base + care-weighted. Cap ~0.0043/s when all vitals full. */
export const TICK_BASE = 0.0008;
export const TICK_CARE_SCALE = 0.0035;

/** Vital decay per second (slow enough for long mobile sessions). */
export const DECAY = {
  water: 0.05,
  light: 0.04,
  fertilizer: 0.015,
  cleanliness: 0.02,
  pestFree: 0.018,
} as const;

export const CARE_BUMP = 22;
export const CARE_GROWTH = 0.25;
/** Adubar dá o maior impulso imediato — quanto mais adubo, mais a muda cresce. */
export const FERTILIZER_CARE_GROWTH = 3.4;
export const PRUNE_BEAUTY_BUMP = 20;
export const CARE_COOLDOWN_MS = 10_000;
export const RARE_EVENT_GROWTH = 0.5;

export const CARE_LABELS: Record<CareKind, string> = {
  water: "Regar",
  prune: "Podar",
  fertilizer: "Adubar",
  clean: "Limpar",
  pest: "Remover Pragas",
};

export function stageOf(g: number): Stage {
  let s: Stage = "seed";
  for (const st of STAGES) if (g >= st.min) s = st.id;
  return s;
}

export function careScore(vitals: {
  water: number;
  light: number;
  fertilizer: number;
  cleanliness: number;
  pestFree: number;
}): number {
  // Fertilizer is the main growth driver; prune (light) shapes beauty more than speed.
  return (
    (vitals.water * 0.2 +
      vitals.light * 0.1 +
      vitals.fertilizer * 0.42 +
      vitals.cleanliness * 0.14 +
      vitals.pestFree * 0.14) /
    100
  );
}

export function growthPerSecond(vitals: Parameters<typeof careScore>[0]): number {
  const fertilizeBoost = 1 + (vitals.fertilizer / 100) * 1.55;
  return (TICK_BASE + careScore(vitals) * TICK_CARE_SCALE) * fertilizeBoost;
}

/** Instant growth from a care action — fertilizer scales with how rich the soil already is. */
export function careInstantGrowth(kind: CareKind, fertilizerLevel: number): number {
  if (kind === "fertilizer") {
    const richness = fertilizerLevel / 100;
    return FERTILIZER_CARE_GROWTH * (0.75 + richness * 1.35);
  }
  if (kind === "prune") return CARE_GROWTH * 0.6;
  return CARE_GROWTH;
}

/**
 * After the plant leaves seedling stages, heavy fertilizing without pruning
 * leaves the canopy messy — the game asks the player to prune for colorful blooms.
 */
export function needsPruneCare(growth: number, beauty: number, fertilizer: number): boolean {
  if (growth < 420) return false;
  const expectedBeauty = Math.min(95, 8 + (growth / GROWTH_MAX) * 88);
  return beauty < expectedBeauty - 14 && fertilizer >= 48;
}

/** How vivid flowers/fruits look (0–1). Pruning unlocks the colorful finale. */
export function bloomIntensity(beauty: number, stage: Stage): number {
  const base =
    stage === "hope"
      ? 1
      : stage === "fruiting"
        ? 0.85
        : stage === "flowering"
          ? 0.75
          : stage === "adult"
            ? 0.35
            : 0.15;
  return Math.min(1.15, base * (0.35 + (beauty / 100) * 0.9));
}

/** How many satellite plants / butterflies unlock by growth. */
export function gardenDensity(growth: number): number {
  return Math.min(1, growth / GROWTH_MAX);
}

export function butterflyCount(growth: number, isMobile: boolean): number {
  const dens = gardenDensity(growth);
  const max = isMobile ? 10 : 16;
  // Always a few butterflies so the garden feels alive from the first visit
  const base = isMobile ? 3 : 4;
  return Math.min(max, Math.max(base, Math.floor(base + dens * (max - base))));
}

/** Migrate v2/v3 save growth (cap ~900) onto the v4 scale (~2500). */
export function migrateGrowth(oldGrowth: number, fromVersion: 2 | 3 | 4): number {
  if (fromVersion >= 4) return Math.min(GROWTH_MAX, oldGrowth);
  return Math.min(GROWTH_MAX, (oldGrowth / 900) * 2500);
}
