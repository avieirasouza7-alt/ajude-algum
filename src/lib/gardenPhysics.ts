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

/** Detritos do chão da floresta — visual (LivingLawn) e física compartilham. */
export type ForestDebrisSpot = {
  x: number;
  z: number;
  s: number;
  rotY: number;
  rotX: number;
  rotZ: number;
  roll: number;
};

export type ForestFloorDebris = {
  pebbles: ForestDebrisSpot[];
  logs: ForestDebrisSpot[];
  branches: ForestDebrisSpot[];
  stumps: ForestDebrisSpot[];
};

function forestFloorSeededSpot(
  rnd: () => number,
  preferOuter: boolean,
): { x: number; z: number } {
  for (let attempt = 0; attempt < 10; attempt++) {
    const outer = preferOuter || rnd() < 0.72;
    let x: number;
    let z: number;
    if (outer) {
      const a = rnd() * Math.PI * 2;
      const r = 10.6 + rnd() * 7.4;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    } else {
      x = (rnd() - 0.5) * 17.2;
      z = (rnd() - 0.5) * 17.2;
      if (Math.abs(x) < 1.05 || Math.abs(z) < 1.05) continue;
    }
    const beds: [number, number][] = [
      [0, 0],
      [-5, -5],
      [5, -5],
      [-5, 5],
      [5, 5],
    ];
    let near = false;
    for (const [bx, bz] of beds) {
      if ((x - bx) * (x - bx) + (z - bz) * (z - bz) < 3.2) {
        near = true;
        break;
      }
    }
    if (!near) return { x, z };
  }
  return { x: 13.2, z: -11.4 };
}

/**
 * Pedrinhas, troncos caídos, galhos secos e tocos — mesma sequência no visual
 * e nos obstáculos (só troncos/tocos bloqueiam o passo).
 * Sempre gera o conjunto completo; em `low` só exibe um subconjunto (mesmas posições).
 */
export function buildForestFloorDebris(low = false): ForestFloorDebris {
  let seed = 62401;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const make = (n: number, preferOuter: boolean, scale: () => number): ForestDebrisSpot[] =>
    Array.from({ length: n }, () => {
      const { x, z } = forestFloorSeededSpot(rnd, preferOuter);
      return {
        x,
        z,
        s: scale(),
        rotY: rnd() * Math.PI * 2,
        rotX: (rnd() - 0.5) * 0.35,
        rotZ: (rnd() - 0.5) * 0.4,
        roll: rnd(),
      };
    });

  const full: ForestFloorDebris = {
    pebbles: make(36, false, () => 0.028 + rnd() * 0.045),
    logs: make(8, true, () => 0.55 + rnd() * 0.55),
    branches: make(20, true, () => 0.35 + rnd() * 0.45),
    stumps: make(6, true, () => 0.35 + rnd() * 0.4),
  };

  if (!low) return full;
  return {
    pebbles: full.pebbles.slice(0, 18),
    logs: full.logs.slice(0, 4),
    branches: full.branches.slice(0, 10),
    stumps: full.stumps.slice(0, 3),
  };
}

function buildForestDebrisObstacles(): CircleObstacle[] {
  /* Obstáculos usam o conjunto completo (low=false) — bate com o visual high
     e, em low, ainda evita atravessar troncos/tocos que podem estar ocultos. */
  const debris = buildForestFloorDebris(false);
  return [
    ...debris.logs.map((log) => ({
      x: log.x,
      z: log.z,
      r: 0.45 + log.s * 0.35,
    })),
    ...debris.stumps.map((stump) => ({
      x: stump.x,
      z: stump.z,
      r: 0.35 + stump.s * 0.45,
    })),
  ];
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
  ...buildForestDebrisObstacles(),
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

export type GroundWildlifeSpecies =
  | "rabbit"
  | "fox"
  | "deer"
  | "squirrel"
  | "lizard"
  | "frog"
  | "turtle"
  | "hedgehog";

export function bodyRadiusFor(species: GroundWildlifeSpecies): number {
  if (species === "deer") return 1.15;
  if (species === "fox") return 0.85;
  if (species === "squirrel") return 0.38;
  if (species === "turtle") return 0.42;
  if (species === "hedgehog") return 0.36;
  if (species === "frog") return 0.34;
  if (species === "lizard") return 0.3;
  return 0.58;
}

export function groundYFor(species: GroundWildlifeSpecies): number {
  if (species === "deer") return 1.28;
  if (species === "fox") return 0.68;
  if (species === "squirrel") return 0.32;
  if (species === "turtle") return 0.18;
  if (species === "hedgehog") return 0.22;
  if (species === "frog") return 0.16;
  if (species === "lizard") return 0.1;
  return 0.45;
}
