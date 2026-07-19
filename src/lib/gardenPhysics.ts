/**
 * Lightweight 2D (XZ) collision helpers for the garden.
 * Keeps animals / flyers from clipping through plots, borders, and each other
 * without a heavy physics engine.
 */

export type CircleObstacle = {
  x: number;
  z: number;
  r: number;
};

/** Seedling dirt circles — animals walk around, not through */
export const SEEDLING_OBSTACLES: CircleObstacle[] = [
  { x: 0, z: 0, r: 1.55 },
  { x: -5, z: -5, r: 1.55 },
  { x: 5, z: -5, r: 1.55 },
  { x: -5, z: 5, r: 1.55 },
  { x: 5, z: 5, r: 1.55 },
];

export type MeadowSpot = { x: number; z: number; s: number; roll: number };

/**
 * Gerador ÚNICO das moitas do campo — usado pelo visual (Ground.meadow) e pela
 * física. Consome sempre o mesmo número de aleatórios por item, então as
 * posições batem exatamente: nada de colidir com moita invisível.
 */
export function buildMeadowSpots(count: number): MeadowSpot[] {
  let seed = 5150;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const a = rnd() * Math.PI * 2;
    const r = 11 + rnd() * 6.5;
    const s = 0.5 + rnd() * 0.9;
    const roll = rnd();
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, s, roll };
  });
}

function buildMeadowObstacles(count = 54): CircleObstacle[] {
  return buildMeadowSpots(count).map((spot) => ({
    x: spot.x,
    z: spot.z,
    r: 0.7 * spot.s + 0.55,
  }));
}

export type HorizonTreeSpec = {
  x: number;
  z: number;
  ring: number;
  height: number;
  width: number;
  rotation: number;
  lean: number;
  conifer: boolean;
  shade: number;
  crownSquash: number;
};

/**
 * Gerador ÚNICO das árvores do anel próximo (HorizonTreeLine) — o visual e a
 * física leem a mesma sequência, então cada tronco físico existe na tela.
 */
export function buildHorizonTreeLine(count: number): HorizonTreeSpec[] {
  let seed = 918273;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => {
    const ringPick = random();
    const ring = ringPick < 0.4 ? 0 : ringPick < 0.72 ? 1 : 2;
    const baseR = ring === 0 ? 18.5 : ring === 1 ? 21.5 : 24.5;
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.18;
    const radius = baseR + random() * 2.4;
    const height = 2.6 + random() * 3.4 + ring * 0.35;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      ring,
      height,
      width: 1.15 + random() * 1.05,
      rotation: random() * Math.PI,
      lean: (random() - 0.5) * 0.08,
      conifer: random() < 0.32,
      shade: 0.78 + random() * 0.32,
      crownSquash: 0.48 + random() * 0.22,
    };
  });
}

/** Troncos do anel interno como obstáculos (raio fino, igual ao visual). */
function buildNearTreeObstacles(): CircleObstacle[] {
  return buildHorizonTreeLine(120)
    .filter((tree) => tree.ring === 0)
    .map((tree) => ({
      x: tree.x,
      z: tree.z,
      r: 0.2 + tree.width * 0.14,
    }));
}

const STATIC_OBSTACLES: CircleObstacle[] = [
  ...SEEDLING_OBSTACLES,
  ...buildMeadowObstacles(54),
  ...buildNearTreeObstacles(),
];

/** Garden square stone border — keep wildlife outside the reserved plots when possible,
 *  but allow rabbits closer; deer stay outside the box. */
export function pushOutOfSquare(
  x: number,
  z: number,
  bodyR: number,
  half = 9.55,
): { x: number; z: number } {
  const inner = half - bodyR;
  // Only push if clearly inside the stone walls corridor (on the border strip)
  const ax = Math.abs(x);
  const az = Math.abs(z);
  if (ax <= inner && az <= inner) return { x, z };
  // If overlapping the border wall itself, slide along outside
  if (ax < half + bodyR && az < half + bodyR) {
    const outsideX = half + bodyR + 0.05;
    const outsideZ = half + bodyR + 0.05;
    if (ax >= az) {
      return { x: Math.sign(x || 1) * Math.max(ax, outsideX), z };
    }
    return { x, z: Math.sign(z || 1) * Math.max(az, outsideZ) };
  }
  return { x, z };
}

export function resolveCircles(
  x: number,
  z: number,
  bodyR: number,
  obstacles: CircleObstacle[],
  iterations = 3,
): { x: number; z: number; hit: boolean } {
  let px = x;
  let pz = z;
  let hit = false;
  for (let n = 0; n < iterations; n++) {
    for (const o of obstacles) {
      const dx = px - o.x;
      const dz = pz - o.z;
      const min = o.r + bodyR;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        px += dx * push;
        pz += dz * push;
        hit = true;
      } else if (d2 <= 1e-8) {
        px += min;
        hit = true;
      }
    }
  }
  return { x: px, z: pz, hit };
}

export function resolveStatic(
  x: number,
  z: number,
  bodyR: number,
  opts?: { avoidGardenInterior?: boolean },
): { x: number; z: number; hit: boolean } {
  let px = x;
  let pz = z;
  let hit = false;
  const r1 = resolveCircles(px, pz, bodyR, STATIC_OBSTACLES);
  px = r1.x;
  pz = r1.z;
  hit = r1.hit;
  if (opts?.avoidGardenInterior) {
    // Keep larger animals outside the community square
    const half = 9.7 + bodyR;
    if (Math.abs(px) < half && Math.abs(pz) < half) {
      const ax = Math.abs(px);
      const az = Math.abs(pz);
      if (ax >= az) px = Math.sign(px || 1) * half;
      else pz = Math.sign(pz || 1) * half;
      hit = true;
    }
  }
  // Clamp to playable meadow ring (don't walk into far fog / desert).
  // Outer edge must fit deer habitats (~18.6 + body radius) without constant shove.
  const dist = Math.hypot(px, pz);
  const minR = 10.2;
  const maxR = 20.4;
  if (dist < minR) {
    const s = minR / (dist || 1);
    px *= s;
    pz *= s;
    hit = true;
  } else if (dist > maxR) {
    const s = maxR / dist;
    px *= s;
    pz *= s;
    hit = true;
  }
  return { x: px, z: pz, hit };
}

/** Shared animal positions so individuals don't walk through each other */
const animalSlots = new Map<string, { x: number; z: number; r: number }>();

export function registerAnimal(id: string, x: number, z: number, r: number) {
  animalSlots.set(id, { x, z, r });
}

export function unregisterAnimal(id: string) {
  animalSlots.delete(id);
}

/** Limpa o registro após remount do Canvas (perda de WebGL / crash recovery). */
export function clearAnimalRegistry() {
  animalSlots.clear();
}

export function separateFromAnimals(
  id: string,
  x: number,
  z: number,
  bodyR: number,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const [otherId, o] of animalSlots) {
    if (otherId === id) continue;
    const dx = px - o.x;
    const dz = pz - o.z;
    const min = bodyR + o.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min) {
      if (d2 < 1e-8) {
        px += min;
      } else {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        px += dx * push * 0.55;
        pz += dz * push * 0.55;
      }
    }
  }
  return { x: px, z: pz };
}

/** Keep flyers above ground and away from canopy discs */
export function clampFlight(
  x: number,
  y: number,
  z: number,
  minY: number,
  canopyClearance = 0.4,
): { x: number; y: number; z: number } {
  let px = x;
  let py = Math.max(minY, y);
  let pz = z;
  // Softly lift if too close to a seedling plot center (plant stems)
  for (const o of SEEDLING_OBSTACLES) {
    const dx = px - o.x;
    const dz = pz - o.z;
    const d2 = dx * dx + dz * dz;
    const avoid = o.r * 0.55;
    if (d2 < avoid * avoid && py < 2.2) {
      py = Math.max(py, 2.2 + canopyClearance);
      const d = Math.sqrt(d2) || 0.001;
      px += (dx / d) * 0.15;
      pz += (dz / d) * 0.15;
    }
  }
  return { x: px, y: py, z: pz };
}

export type GroundWildlifeSpecies = "rabbit" | "fox" | "deer" | "squirrel";

export function bodyRadiusFor(species: GroundWildlifeSpecies): number {
  if (species === "deer") return 1.15;
  if (species === "fox") return 0.85;
  if (species === "squirrel") return 0.38;
  return 0.58;
}

export function groundYFor(species: GroundWildlifeSpecies): number {
  if (species === "deer") return 1.28;
  if (species === "fox") return 0.68;
  if (species === "squirrel") return 0.32;
  return 0.45;
}
