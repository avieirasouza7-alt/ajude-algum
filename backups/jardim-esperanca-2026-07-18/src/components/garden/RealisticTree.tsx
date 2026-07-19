import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Stage } from "@/lib/growthConfig";
import { bloomIntensity } from "@/lib/growthConfig";

export type TreeRenderQuality = "low" | "balanced";

type SpeciesKey = "ipe" | "jacaranda" | "pauBrasil" | "quaresmeira" | "manaca";

type SpeciesBotany = {
  key: SpeciesKey;
  leaf: string;
  deep: string;
  young: string;
  bark: string;
  barkDeep: string;
  flowers: string[];
  fruit: string[];
  /** Em plena floração: quase sem folhas (ipê/jacarandá). */
  bloomLeafless: number;
  crownFlatten: number;
  /** Forma da flor individual. */
  flowerStyle: "trumpet" | "bell" | "panicle" | "open";
};

function speciesKeyOf(species: string): SpeciesKey {
  const key = species.toLocaleLowerCase("pt-BR");
  if (key.includes("jacarandá") || key.includes("jacaranda")) return "jacaranda";
  if (key.includes("ipê") || key.includes("ipe")) return "ipe";
  if (key.includes("pau-brasil") || key.includes("pau brasil")) return "pauBrasil";
  if (key.includes("quaresmeira")) return "quaresmeira";
  return "manaca";
}

function botanyOf(species: string): SpeciesBotany {
  const key = speciesKeyOf(species);
  if (key === "jacaranda") {
    return {
      key,
      leaf: "#3a8a48",
      deep: "#2a6a36",
      young: "#6dac5f",
      bark: "#77644e",
      barkDeep: "#4a3b2c",
      flowers: ["#7c5cd6", "#9b7dff", "#b39dfa", "#6a4ac2", "#8a6ae8"],
      fruit: ["#8b6b3a", "#a67c3d"],
      bloomLeafless: 0.94,
      crownFlatten: 0.88,
      flowerStyle: "panicle",
    };
  }
  if (key === "ipe") {
    return {
      key,
      leaf: "#4a8c42",
      deep: "#326a34",
      young: "#78ad62",
      bark: "#83684a",
      barkDeep: "#50402c",
      flowers: ["#ffd21e", "#ffc400", "#ffdd55", "#f2b800", "#ffe270"],
      fruit: ["#8a6a28", "#c4a03a"],
      bloomLeafless: 0.96,
      crownFlatten: 0.84,
      flowerStyle: "trumpet",
    };
  }
  if (key === "pauBrasil") {
    return {
      key,
      leaf: "#387d41",
      deep: "#285f33",
      young: "#70a85e",
      bark: "#8a5540",
      barkDeep: "#54301f",
      flowers: ["#ffb428", "#ff9a2e", "#ffd066", "#f08018", "#ffc84a"],
      fruit: ["#c0392b", "#e74c3c"],
      bloomLeafless: 0.78,
      crownFlatten: 0.9,
      flowerStyle: "open",
    };
  }
  if (key === "quaresmeira") {
    return {
      key,
      leaf: "#377d47",
      deep: "#285f37",
      young: "#73a967",
      bark: "#7c6650",
      barkDeep: "#4c3d2e",
      flowers: ["#d81b7a", "#e91e8c", "#c2185b", "#f062ab", "#b01360"],
      fruit: ["#6d4c41", "#8d6e63"],
      bloomLeafless: 0.7,
      crownFlatten: 0.95,
      flowerStyle: "bell",
    };
  }
  return {
    key: "manaca",
    leaf: "#42894a",
    deep: "#2e6a39",
    young: "#79ad68",
    bark: "#80694d",
    barkDeep: "#4e3f2d",
    flowers: ["#f6f3fa", "#e8c7ee", "#c795d8", "#f4aed0", "#a86ec4"],
    fruit: ["#7b5e3b", "#a07840"],
    bloomLeafless: 0.6,
    crownFlatten: 1,
    flowerStyle: "open",
  };
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSpecies(species: string): number {
  let h = 2166136261;
  for (let i = 0; i < species.length; i++) {
    h ^= species.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Casca realista: sulcos verticais profundos e escuros, placas claras entre
 * eles, rachaduras horizontais e manchas de líquen — como ipê/jacarandá reais.
 */
function createBarkTexture(base: [number, number, number]) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = base[0] * 7919 + base[1] * 104729 + base[2] * 15485863;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Deslocamento serpenteante de cada sulco vertical
  const wobble: number[] = [];
  for (let y = 0; y < size; y++) {
    wobble.push(Math.sin(y * 0.045) * 5 + Math.sin(y * 0.013 + 2.1) * 9);
  }
  // Brilho lento por linha (troncos reais têm faixas mais claras/escuras)
  const bandLight: number[] = [];
  for (let y = 0; y < size; y++) {
    bandLight.push(Math.sin(y * 0.02 + 1.3) * 10 + Math.sin(y * 0.006) * 8);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const gx = x + wobble[y];

      // Sulcos verticais: vales estreitos e escuros
      const ridgeWave = Math.sin(gx * 0.22) * 0.5 + Math.sin(gx * 0.075 + 1.7) * 0.5;
      const crevice = Math.pow(Math.max(0, -ridgeWave), 1.6); // só os vales
      const plateau = Math.max(0, ridgeWave); // placas elevadas

      // Rachaduras horizontais finas ocasionais
      const crackY = Math.sin(y * 0.9 + Math.sin(x * 0.05) * 3);
      const crack = crackY > 0.985 ? 26 : 0;

      // Grão fino + poros
      const grain = (random() - 0.5) * 22;
      const pore = random() > 0.988 ? -30 : 0;

      // Líquen: manchas claras esverdeadas espalhadas
      const lichenNoise =
        Math.sin(x * 0.09 + 4.2) * Math.sin(y * 0.07 + 1.1) + (random() - 0.5) * 0.6;
      const lichen = lichenNoise > 0.82 ? 24 : 0;

      const light = plateau * 30 - crevice * 52 - crack + grain + pore + bandLight[y];

      data[i] = THREE.MathUtils.clamp(base[0] + light + lichen * 0.8, 0, 255);
      data[i + 1] = THREE.MathUtils.clamp(base[1] + light * 0.9 + lichen, 0, 255);
      data[i + 2] = THREE.MathUtils.clamp(base[2] + light * 0.7 + lichen * 0.5, 0, 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.6, 2.6);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* ---------------- skeleton ---------------- */

type BranchSeg = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
};

type Skeleton = {
  trunkPoints: THREE.Vector3[];
  branches: BranchSeg[];
  /** Pontas dos galhos — onde nascem os tufos de flores. */
  tips: THREE.Vector3[];
  crownCenter: THREE.Vector3;
};

/**
 * Galhos sobem e bifurcam como ipê/jacarandá reais.
 * As pontas ficam espalhadas pelo volume do domo (incluindo o topo).
 */
function buildSkeleton(
  trunkH: number,
  trunkR: number,
  canopyR: number,
  crownFlatten: number,
  stage: Stage,
  rnd: () => number,
  low: boolean,
): Skeleton {
  const lean = (rnd() - 0.5) * 0.08;
  const splitY = trunkH * 0.58;
  const trunkPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.35, trunkH * 0.32, -lean * 0.2),
    new THREE.Vector3(-lean * 0.15, splitY, lean * 0.25),
  ];

  const crownCenter = new THREE.Vector3(0, trunkH + canopyR * crownFlatten * 0.22, 0);
  const branches: BranchSeg[] = [];
  const tips: THREE.Vector3[] = [];

  const primaryCount =
    stage === "small" ? (low ? 4 : 5) : stage === "young" ? (low ? 5 : 6) : low ? 6 : 7;

  for (let i = 0; i < primaryCount; i++) {
    const a = (i / primaryCount) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const attach = new THREE.Vector3(
      Math.cos(a) * trunkR * 0.35,
      splitY - rnd() * trunkH * 0.1,
      Math.sin(a) * trunkR * 0.35,
    );
    // Ângulo: sobe bastante (como nas fotos), abre para fora
    const upBias = 0.55 + rnd() * 0.25;
    const outBias = 0.45 + rnd() * 0.25;
    const primLen = canopyR * (0.5 + rnd() * 0.28);
    const primTip = new THREE.Vector3(
      attach.x + Math.cos(a) * primLen * outBias,
      attach.y + primLen * upBias,
      attach.z + Math.sin(a) * primLen * outBias,
    );
    const r0 = trunkR * (0.38 + rnd() * 0.1);
    branches.push({ from: attach, to: primTip, radius: r0 });

    const forks = low ? 2 : 3;
    for (let f = 0; f < forks; f++) {
      const fa = a + (f - (forks - 1) / 2) * (0.55 + rnd() * 0.3);
      const secLen = canopyR * (0.38 + rnd() * 0.28);
      const secTip = new THREE.Vector3(
        primTip.x + Math.cos(fa) * secLen * 0.5,
        primTip.y + secLen * (0.5 + rnd() * 0.35),
        primTip.z + Math.sin(fa) * secLen * 0.5,
      );
      branches.push({ from: primTip, to: secTip, radius: r0 * 0.52 });
      tips.push(secTip.clone());

      // Terciários finos — chegam no topo e nas bordas do domo
      const twigCount = low ? 1 : 2;
      for (let t = 0; t < twigCount; t++) {
        const ta = fa + (rnd() - 0.5) * 0.9;
        const terLen = canopyR * (0.22 + rnd() * 0.2);
        // Empurra algumas pontas para o topo (y alto)
        const reachTop = t === 0 && f === Math.floor(forks / 2);
        const terTip = new THREE.Vector3(
          secTip.x + Math.cos(ta) * terLen * (reachTop ? 0.15 : 0.45),
          secTip.y + terLen * (reachTop ? 0.85 : 0.55 + rnd() * 0.3),
          secTip.z + Math.sin(ta) * terLen * (reachTop ? 0.15 : 0.45),
        );
        branches.push({ from: secTip, to: terTip, radius: r0 * 0.26 });
        tips.push(terTip.clone());
      }
    }
  }

  // Pontas extras no topo do domo (a "parte de cima" que faltava)
  const topFill = low ? 4 : 8;
  for (let i = 0; i < topFill; i++) {
    const a = (i / topFill) * Math.PI * 2 + rnd() * 0.4;
    const r = canopyR * (0.08 + rnd() * 0.35);
    tips.push(
      new THREE.Vector3(
        crownCenter.x + Math.cos(a) * r,
        crownCenter.y + canopyR * crownFlatten * (0.45 + rnd() * 0.35),
        crownCenter.z + Math.sin(a) * r,
      ),
    );
  }

  return { trunkPoints, branches, tips, crownCenter };
}

/* ---------------- flower / leaf instances ---------------- */

type Pose = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  color: THREE.Color;
};

/**
 * Tufo (pom-pom) = massa volumétrica + várias flores miúdas.
 * Sem a massa, a copa fica "vazia" (só pontinhos).
 */
function expandPomPom(
  center: THREE.Vector3,
  pomR: number,
  flowerCount: number,
  palette: string[],
  style: SpeciesBotany["flowerStyle"],
  intensity: number,
  rnd: () => number,
  out: Pose[],
  massOut: Pose[],
) {
  // Miolo discreto do tufo — só fecha o buraco entre as florzinhas
  const massColor = new THREE.Color(palette[Math.floor(rnd() * palette.length)]);
  massColor.offsetHSL(0, 0.04, -0.05 + rnd() * 0.05);
  massOut.push({
    position: center.clone(),
    quaternion: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI),
    ),
    scale: new THREE.Vector3(
      pomR * (0.85 + rnd() * 0.25),
      pomR * (0.7 + rnd() * 0.2),
      pomR * (0.85 + rnd() * 0.25),
    ),
    color: massColor,
  });

  for (let i = 0; i < flowerCount; i++) {
    // Empacota no volume do tufo (mais na casca)
    const u = rnd();
    const v = rnd();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const shell = 0.45 + rnd() * 0.65;
    const ox = Math.sin(phi) * Math.cos(theta) * pomR * shell;
    const oy = Math.cos(phi) * pomR * shell * 0.85;
    const oz = Math.sin(phi) * Math.sin(theta) * pomR * shell;

    const pos = new THREE.Vector3(center.x + ox, center.y + oy, center.z + oz);
    const outward = new THREE.Vector3(ox, oy, oz).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      outward.lengthSq() < 0.01 ? new THREE.Vector3(0, 1, 0) : outward,
    );

    let sx: number;
    let sy: number;
    let sz: number;
    if (style === "trumpet") {
      const s = pomR * (0.38 + rnd() * 0.28);
      sx = s * 0.55;
      sy = s * 1.35;
      sz = s * 0.55;
    } else if (style === "bell") {
      const s = pomR * (0.4 + rnd() * 0.25);
      sx = s * 0.7;
      sy = s;
      sz = s * 0.7;
    } else if (style === "panicle") {
      const s = pomR * (0.32 + rnd() * 0.22);
      sx = s * 0.5;
      sy = s * 1.5;
      sz = s * 0.5;
    } else {
      const s = pomR * (0.4 + rnd() * 0.25);
      sx = s;
      sy = s * 0.7;
      sz = s;
    }

    const color = new THREE.Color(palette[Math.floor(rnd() * palette.length)]);
    color.offsetHSL(
      (rnd() - 0.5) * 0.02,
      0.03 + intensity * 0.04,
      (rnd() - 0.5) * 0.08 + (shell > 0.7 ? 0.06 : -0.04),
    );

    out.push({
      position: pos,
      quaternion: quat,
      scale: new THREE.Vector3(sx, sy, sz),
      color,
    });
  }
}

/** Tufo de folhas = massa verde + pedaços menores. */
function expandLeafPom(
  center: THREE.Vector3,
  pomR: number,
  leafCount: number,
  botany: SpeciesBotany,
  beauty: number,
  rnd: () => number,
  out: Pose[],
) {
  // Miolo verde discreto do tufo de folha
  const mass = new THREE.Color(rnd() < 0.4 ? botany.deep : botany.leaf);
  mass.offsetHSL(0, (beauty / 100) * 0.04, -0.05 + rnd() * 0.05);
  out.push({
    position: center.clone(),
    quaternion: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rnd() * 0.8, rnd() * Math.PI, rnd() * 0.8),
    ),
    scale: new THREE.Vector3(
      pomR * (0.9 + rnd() * 0.25),
      pomR * (0.75 + rnd() * 0.2),
      pomR * (0.9 + rnd() * 0.25),
    ),
    color: mass,
  });

  for (let i = 0; i < leafCount; i++) {
    const u = rnd();
    const v = rnd();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const shell = 0.35 + rnd() * 0.75;
    const ox = Math.sin(phi) * Math.cos(theta) * pomR * shell;
    const oy = Math.cos(phi) * pomR * shell * 0.7;
    const oz = Math.sin(phi) * Math.sin(theta) * pomR * shell;
    const pos = new THREE.Vector3(center.x + ox, center.y + oy, center.z + oz);
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rnd() - 0.5) * 1.4, theta, (rnd() - 0.5) * 0.8),
    );
    const s = pomR * (0.7 + rnd() * 0.55);
    const color = new THREE.Color(
      rnd() < 0.28 ? botany.deep : rnd() < 0.5 ? botany.young : botany.leaf,
    );
    color.offsetHSL(0, (beauty / 100) * 0.05, (rnd() - 0.5) * 0.07);
    out.push({
      position: pos,
      quaternion: quat,
      scale: new THREE.Vector3(s * 1.15, s * 0.85, s * 1.05),
      color,
    });
  }
}

function buildFoliageAndBloom(
  tips: THREE.Vector3[],
  crownCenter: THREE.Vector3,
  canopyR: number,
  crownFlatten: number,
  botany: SpeciesBotany,
  blooming: boolean,
  fruiting: boolean,
  intensity: number,
  beauty: number,
  low: boolean,
  rnd: () => number,
): { flowers: Pose[]; flowerMass: Pose[]; leaves: Pose[] } {
  const flowers: Pose[] = [];
  const flowerMass: Pose[] = [];
  const leaves: Pose[] = [];
  const palette = fruiting && !blooming ? botany.fruit : botany.flowers;

  const flowerShare = blooming
    ? THREE.MathUtils.clamp(botany.bloomLeafless * (0.65 + intensity * 0.3), 0, 0.95)
    : fruiting
      ? 0.28
      : 0;

  const rx = canopyR;
  const ry = canopyR * crownFlatten * 0.78;

  // Muitos tufos PEQUENOS (grão fino, como milhares de flores nas fotos)
  const volumeCount = low ? 220 : 400;
  for (let i = 0; i < volumeCount; i++) {
    const yNorm = -0.35 + rnd() * 1.35;
    const ring = Math.sqrt(Math.max(0, 1 - Math.min(1, yNorm) * Math.min(1, yNorm)));
    const a = rnd() * Math.PI * 2;
    const onShell = rnd() < 0.62;
    const rScale = onShell ? 0.82 + rnd() * 0.22 : 0.25 + rnd() * 0.5;
    const center = new THREE.Vector3(
      crownCenter.x + Math.cos(a) * ring * rx * rScale,
      crownCenter.y + yNorm * ry * (onShell ? 1 : 0.9),
      crownCenter.z + Math.sin(a) * ring * rx * rScale,
    );

    const pomR = canopyR * (0.028 + rnd() * 0.024);
    const isFlower = rnd() < flowerShare;

    if (isFlower) {
      const count = low ? 4 + Math.floor(rnd() * 3) : 6 + Math.floor(rnd() * 4);
      expandPomPom(
        center,
        pomR,
        count,
        palette,
        botany.flowerStyle,
        intensity,
        rnd,
        flowers,
        flowerMass,
      );
    } else {
      expandLeafPom(center, pomR * 1.3, low ? 32 : 48, botany, beauty, rnd, leaves);
    }
  }

  for (const tip of tips) {
    const pomR = canopyR * (0.026 + rnd() * 0.022);
    if (rnd() < flowerShare) {
      expandPomPom(
        tip,
        pomR,
        low ? 5 : 8,
        palette,
        botany.flowerStyle,
        intensity,
        rnd,
        flowers,
        flowerMass,
      );
    } else {
      expandLeafPom(tip, pomR * 1.2, low ? 32 : 56, botany, beauty, rnd, leaves);
    }
  }

  // Topo do domo com granulação extra
  const topCount = low ? 40 : 70;
  for (let i = 0; i < topCount; i++) {
    const a = (i / topCount) * Math.PI * 2 + rnd() * 0.3;
    const r = canopyR * rnd() * 0.55;
    const center = new THREE.Vector3(
      crownCenter.x + Math.cos(a) * r,
      crownCenter.y + ry * (0.55 + rnd() * 0.4),
      crownCenter.z + Math.sin(a) * r,
    );
    const pomR = canopyR * (0.026 + rnd() * 0.022);
    if (flowerShare > 0.4) {
      expandPomPom(
        center,
        pomR,
        low ? 4 : 7,
        palette,
        botany.flowerStyle,
        intensity,
        rnd,
        flowers,
        flowerMass,
      );
    } else {
      expandLeafPom(center, pomR * 1.15, low ? 32 : 48, botany, beauty, rnd, leaves);
    }
  }

  return { flowers, flowerMass, leaves };
}

/* ---------------- meshes ---------------- */

function segmentTransform(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = Math.max(0.001, dir.length());
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  return { mid, length, quaternion };
}

/** Tronco + galhos em UMA malha instanciada: 1 draw call em vez de ~25. */
function InstancedBranches({
  segments,
  map,
  castShadow,
}: {
  segments: BranchSeg[];
  map: THREE.Texture;
  castShadow: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    if (!mesh.current || segments.length === 0) return;
    const dummy = new THREE.Object3D();
    segments.forEach((seg, i) => {
      const { mid, length, quaternion } = segmentTransform(seg.from, seg.to);
      dummy.position.copy(mid);
      dummy.quaternion.copy(quaternion);
      dummy.scale.set(seg.radius, length, seg.radius);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <instancedMesh
      key={`branches-${segments.length}`}
      ref={mesh}
      args={[undefined, undefined, segments.length]}
      castShadow={castShadow}
      frustumCulled={false}
    >
      {/* Cilindro unitário: raio/comprimento vêm da escala da instância */}
      <cylinderGeometry args={[0.55, 1, 1, 10, 1]} />
      <meshStandardMaterial
        map={map}
        bumpMap={map}
        bumpScale={0.09}
        roughness={0.94}
        metalness={0}
      />
    </instancedMesh>
  );
}

function applyPoses(mesh: THREE.InstancedMesh, poses: Pose[]) {
  const dummy = new THREE.Object3D();
  poses.forEach((p, i) => {
    dummy.position.copy(p.position);
    dummy.quaternion.copy(p.quaternion);
    dummy.scale.copy(p.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, p.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function InstancedPoses({
  poses,
  geometry,
  roughness,
  castShadow,
  batchId = "a",
}: {
  poses: Pose[];
  geometry: "trumpet" | "bell" | "panicle" | "open" | "leaf";
  roughness: number;
  castShadow: boolean;
  batchId?: string;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    if (!mesh.current || poses.length === 0) return;
    applyPoses(mesh.current, poses);
  }, [poses]);

  if (poses.length === 0) return null;

  return (
    <instancedMesh
      key={`${batchId}-${geometry}-${poses.length}`}
      ref={mesh}
      args={[undefined, undefined, poses.length]}
      castShadow={castShadow}
      frustumCulled={false}
    >
      {geometry === "trumpet" && <coneGeometry args={[1, 1.4, 7]} />}
      {geometry === "bell" && <sphereGeometry args={[1, 7, 6]} />}
      {geometry === "panicle" && <capsuleGeometry args={[0.35, 1.1, 3, 6]} />}
      {geometry === "open" && <sphereGeometry args={[1, 6, 5]} />}
      {geometry === "leaf" && <icosahedronGeometry args={[1, 1]} />}
      <meshStandardMaterial color="#ffffff" roughness={roughness} metalness={0} />
    </instancedMesh>
  );
}

/* ---------------- component ---------------- */

export function RealisticTree({
  stage,
  growth,
  species = "Ipê-amarelo",
  beauty = 40,
  quality = "balanced",
  isMobile = false,
}: {
  stage: Stage;
  growth: number;
  species?: string;
  beauty?: number;
  quality?: TreeRenderQuality;
  isMobile?: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const botany = useMemo(() => botanyOf(species), [species]);
  const intensity = bloomIntensity(beauty, stage);
  const low = quality === "low" || !!isMobile;

  const barkMap = useMemo(() => {
    const c = new THREE.Color(botany.bark);
    return createBarkTexture([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]);
  }, [botany.bark]);

  const gNorm = Math.min(1, growth / 2500);
  const formBonus = 0.92 + (beauty / 100) * 0.18;
  const trunkH = (0.55 + gNorm * 2.6) * formBonus;
  const trunkR = (0.06 + gNorm * 0.24) * (0.95 + (beauty / 100) * 0.1);
  // Copa menor: as mudas ficam a 5 m umas das outras, não podem se encostar
  const canopyR = (0.45 + gNorm * 1.45) * (0.92 + intensity * 0.14);

  const blooming = stage === "flowering" || stage === "hope" || (stage === "adult" && beauty >= 62);
  const fruiting = stage === "fruiting" || stage === "hope";

  const built = useMemo(() => {
    const rnd = mulberry32(hashSpecies(species) ^ Math.floor(growth * 10));
    const skeleton = buildSkeleton(trunkH, trunkR, canopyR, botany.crownFlatten, stage, rnd, low);
    const canopy = buildFoliageAndBloom(
      skeleton.tips,
      skeleton.crownCenter,
      canopyR,
      botany.crownFlatten,
      botany,
      blooming,
      fruiting,
      intensity,
      beauty,
      low,
      rnd,
    );
    // Tronco + galhos juntos para renderizar em 1 draw call
    const allSegments: BranchSeg[] = [];
    for (let i = 0; i < skeleton.trunkPoints.length - 1; i++) {
      allSegments.push({
        from: skeleton.trunkPoints[i],
        to: skeleton.trunkPoints[i + 1],
        radius: trunkR * (1 - i * 0.14),
      });
    }
    allSegments.push(...skeleton.branches);
    return { skeleton, canopy, allSegments };
  }, [
    species,
    growth,
    trunkH,
    trunkR,
    canopyR,
    botany,
    stage,
    low,
    beauty,
    blooming,
    fruiting,
    intensity,
  ]);

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    root.current.rotation.z = Math.sin(t * 0.48) * 0.008;
    root.current.rotation.x = Math.cos(t * 0.39) * 0.004;
  });

  return (
    <group ref={root}>
      {/* Raízes aparentes */}
      {(low ? [0, 1, 2] : [0, 1, 2, 3]).map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={`flare-${i}`}
            position={[Math.cos(a) * trunkR * 1.05, trunkR * 0.3, Math.sin(a) * trunkR * 1.05]}
            rotation={[0.12, -a, 1.08]}
            castShadow={!low}
          >
            <coneGeometry args={[trunkR * 0.48, trunkH * 0.18, 6]} />
            <meshStandardMaterial color={botany.barkDeep} roughness={1} />
          </mesh>
        );
      })}

      {/* Tronco + galhos em uma única malha instanciada */}
      <InstancedBranches segments={built.allSegments} map={barkMap} castShadow={!low} />

      {/* Folhas / massa verde */}
      <InstancedPoses
        batchId="leaves"
        poses={built.canopy.leaves}
        geometry="leaf"
        roughness={0.9}
        castShadow={!low}
      />

      {/* Massa dos tufos de flor (nuvem colorida — evita copa vazia).
          Sombra desligada: a das folhas já cobre e economiza um passe. */}
      <InstancedPoses
        batchId="flower-mass"
        poses={built.canopy.flowerMass}
        geometry="leaf"
        roughness={0.72}
        castShadow={false}
      />

      {/* Flores individuais em cima da massa */}
      <InstancedPoses
        batchId="flowers"
        poses={built.canopy.flowers}
        geometry={botany.flowerStyle}
        roughness={0.58}
        castShadow={false}
      />
    </group>
  );
}
