import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Cloud,
  ContactShadows,
  OrbitControls,
  PerformanceMonitor,
  Sky,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import {
  SunShafts,
  GroundFog,
  RainbowArc,
  FallingLeaves,
  LivingLawn,
  Ladybug,
  HorizonHaze,
  AmbientParticles,
  SunGlow,
  ForestFerns,
  WindingPaths,
} from "@/components/garden/Atmosphere";
import type { Stage, CareKind } from "@/lib/growthConfig";
import { butterflyCount, stageOf } from "@/lib/growthConfig";
import { ButterflyFlock } from "@/components/garden/RealisticButterfly";
import { GardenPlants } from "@/components/garden/GardenPlants";
import { RealisticFlowerField, HeroFlowers } from "@/components/garden/RealisticFlowers";
import { PremiumWildlife } from "@/components/garden/PremiumWildlife";
import { PremiumHorizonForest } from "@/components/garden/PremiumHorizonForest";
import { RealisticSoilBed } from "@/components/garden/RealisticSoilBed";
import { nightFogColor, RealisticNightSky } from "@/components/garden/RealisticNightSky";
import { RealisticTree } from "@/components/garden/RealisticTree";
import type { CommunitySeedling } from "@/lib/communityGarden";
import { buildHorizonTreeLine, buildMeadowSpots, clearAnimalRegistry } from "@/lib/gardenPhysics";
import {
  detectGardenRenderProfile,
  gardenWildlifeBudget,
  lowerGardenQuality,
  raiseGardenQuality,
  type GardenRenderQuality,
} from "@/lib/gardenRenderQuality";
import { PremiumBirdFlock } from "@/components/garden/PremiumBirds";
import { PremiumBeeSwarm } from "@/components/garden/PremiumBees";
import {
  GardenCritter,
  GardenDragonfly,
  GardenOwl,
  GardenWoodpecker,
} from "@/components/garden/GardenCritters";

interface Scene3DProps {
  stage: Stage;
  growth: number;
  isNight: boolean;
  raining: boolean;
  clearing?: boolean;
  reduceMotion?: boolean;
  isMobile?: boolean;
  careFx?: CareKind | null;
  /** Incrementa a cada ação para reiniciar a animação mesmo com o mesmo tipo. */
  careFxKey?: number;
  butterflySeeds?: number[];
  seedlings?: CommunitySeedling[];
  selectedSeedlingId?: string;
  onSelectSeedling?: (seedlingId: string) => void;
  butterflyGeneration?: number;
  butterfliesLeaving?: boolean;
  solarHour?: number;
}

type RenderQuality = GardenRenderQuality;

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

function WebGLUnavailableNotice() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1a12] p-6">
      <div className="max-w-sm rounded-2xl bg-black/50 p-5 text-center text-white backdrop-blur-md">
        <p className="text-3xl">🌱</p>
        <h3 className="mt-2 text-sm font-semibold">O jardim 3D não pôde ser carregado</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          Seu navegador está sem suporte a WebGL (gráficos 3D). Abra o jogo no Chrome, Edge ou
          Firefox e verifique se a aceleração de hardware está ativada nas configurações do
          navegador.
        </p>
      </div>
    </div>
  );
}

function createNoiseTexture(base: [number, number, number], variation: number, repeat: number) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  let seed = base[0] * 7919 + base[1] * 104729 + base[2] * 15485863;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const broad = Math.sin(x * 0.31) * Math.cos(y * 0.27) * 0.5;
      const noise = (random() - 0.5) * 2 + broad;
      data[i] = THREE.MathUtils.clamp(base[0] + noise * variation, 0, 255);
      data[i + 1] = THREE.MathUtils.clamp(base[1] + noise * variation, 0, 255);
      data[i + 2] = THREE.MathUtils.clamp(base[2] + noise * variation, 0, 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* ---------------- Tree ---------------- */

function speciesPalette(species: string) {
  const key = species.toLocaleLowerCase("pt-BR");
  if (key.includes("jacarandá")) {
    return {
      leaf: "#3f8a47",
      deep: "#2d6a38",
      flowers: ["#6b4fc8", "#9b7dff", "#c4b0ff", "#5a3db8"],
      fruit: ["#8b6b3a", "#a67c3d"],
      sparkle: "#d4c4ff",
    };
  }
  if (key.includes("ipê-roxo") || key.includes("ipe-roxo")) {
    return {
      leaf: "#3f8248",
      deep: "#2c6236",
      flowers: ["#7b2cbf", "#9b59d0", "#c39be8", "#5a189a"],
      fruit: ["#6d4c41", "#8d6e63"],
      sparkle: "#e0b0ff",
    };
  }
  if (key.includes("ipê")) {
    return {
      leaf: "#4c8b42",
      deep: "#356a34",
      flowers: ["#ffe566", "#ffd000", "#fff1a0", "#f5c400"],
      fruit: ["#8a6a28", "#c4a03a"],
      sparkle: "#ffe9a0",
    };
  }
  if (key.includes("sibipiruna")) {
    return {
      leaf: "#3d8644",
      deep: "#2c6635",
      flowers: ["#f4e285", "#e8d44d", "#fff3a8", "#d4bc2a"],
      fruit: ["#8b6914", "#a67c1a"],
      sparkle: "#fff4b0",
    };
  }
  if (key.includes("guapuruvu")) {
    return {
      leaf: "#4a9148",
      deep: "#347038",
      flowers: ["#fff59d", "#ffee58", "#fffde7", "#fbc02d"],
      fruit: ["#795548", "#a1887f"],
      sparkle: "#fff9c4",
    };
  }
  if (key.includes("pau-brasil")) {
    return {
      leaf: "#397d42",
      deep: "#2a5f34",
      flowers: ["#ffb347", "#ff8c42", "#ffe08a", "#e85d04"],
      fruit: ["#c0392b", "#e74c3c"],
      sparkle: "#ffd08a",
    };
  }
  if (key.includes("quaresmeira")) {
    return {
      leaf: "#397d48",
      deep: "#2a5f38",
      flowers: ["#c2185b", "#e91e8c", "#f48fb1", "#ad1457"],
      fruit: ["#6d4c41", "#8d6e63"],
      sparkle: "#ffb6d9",
    };
  }
  // Manacá-da-serra: white → lilac → pink
  return {
    leaf: "#43894b",
    deep: "#2f6a3a",
    flowers: ["#ffffff", "#f8bbd9", "#ce93d8", "#f48fb1"],
    fruit: ["#7b5e3b", "#a07840"],
    sparkle: "#ffe0f0",
  };
}

function Tree({
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
  quality?: RenderQuality;
  isMobile?: boolean;
}) {
  const grp = useRef<THREE.Group>(null!);
  const palette = useMemo(() => speciesPalette(species), [species]);

  useFrame((state) => {
    if (!grp.current) return;
    const t = state.clock.elapsedTime;
    grp.current.rotation.z = Math.sin(t * 0.55) * 0.012;
    grp.current.rotation.x = Math.cos(t * 0.45) * 0.007;
  });

  const gNorm = Math.min(1, growth / 2500);
  const formBonus = 0.92 + (beauty / 100) * 0.18;
  const trunkH = (0.12 + gNorm * 3.8) * formBonus;
  const trunkR = (0.05 + gNorm * 0.34) * (0.95 + (beauty / 100) * 0.08);
  const foliageR = (0.16 + gNorm * 1.95) * 0.95;
  const color = palette.leaf;
  const deep = palette.deep;

  if (stage === "seed") {
    const emergence = THREE.MathUtils.smoothstep(growth, 12, 80);
    const stemHeight = 0.12 + emergence * 0.42;
    return (
      <group scale={1.35}>
        <mesh
          position={[-0.055, 0.065, 0]}
          rotation={[0.15, 0.4, -0.25]}
          scale={[0.78, 1, 0.68]}
          castShadow
        >
          <sphereGeometry args={[0.12, 20, 14]} />
          <meshStandardMaterial color="#765033" roughness={0.98} />
        </mesh>
        <mesh position={[0.028, stemHeight / 2 + 0.05, 0]} rotation={[0, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.012, 0.022, stemHeight, 10]} />
          <meshStandardMaterial color="#477a3d" roughness={0.85} />
        </mesh>
        {emergence > 0.15 && (
          <>
            <mesh
              position={[-0.1 * emergence, stemHeight * 0.82 + 0.08, 0]}
              rotation={[0.15, 0.15, -0.55]}
              scale={[0.16 * emergence, 0.075 * emergence, 0.025]}
              castShadow
            >
              <sphereGeometry args={[1, 14, 8]} />
              <meshPhysicalMaterial
                color="#69a95b"
                roughness={0.75}
                sheen={0.25}
                sheenColor="#b8d99b"
              />
            </mesh>
            <mesh
              position={[0.14 * emergence, stemHeight * 0.94 + 0.07, 0]}
              rotation={[-0.1, -0.2, 0.58]}
              scale={[0.18 * emergence, 0.08 * emergence, 0.025]}
              castShadow
            >
              <sphereGeometry args={[1, 14, 8]} />
              <meshPhysicalMaterial
                color="#57964d"
                roughness={0.78}
                sheen={0.22}
                sheenColor="#b8d99b"
              />
            </mesh>
          </>
        )}
      </group>
    );
  }

  if (stage === "sprout" || stage === "twoleaves") {
    return (
      <group ref={grp}>
        <mesh position={[0, trunkH * 0.5, 0]} castShadow>
          <cylinderGeometry args={[trunkR * 0.5, trunkR, trunkH, 10]} />
          <meshStandardMaterial color="#5a3a1e" roughness={0.95} />
        </mesh>
        <mesh position={[-0.12, trunkH * 0.85, 0]} rotation={[0, 0, 0.6]} castShadow>
          <sphereGeometry args={[foliageR * 0.55, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0.12, trunkH * 0.9, 0]} rotation={[0, 0, -0.55]} castShadow>
          <sphereGeometry args={[foliageR * 0.55, 12, 10]} />
          <meshStandardMaterial color={deep} roughness={0.8} />
        </mesh>
        {stage === "twoleaves" && (
          <mesh position={[0, trunkH + 0.08, 0]} castShadow>
            <sphereGeometry args={[foliageR * 0.4, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <RealisticTree
      stage={stage}
      growth={growth}
      species={species}
      beauty={beauty}
      quality={quality}
      isMobile={isMobile}
    />
  );
}

type SeedlingBotany = {
  leafColor: string;
  youngLeafColor: string;
  stemColor: string;
  leafWidth: number;
  leafLength: number;
  leaflets: number;
  serrated: boolean;
};

function seedlingBotany(species: string): SeedlingBotany {
  const key = species.toLocaleLowerCase("pt-BR");
  if (key.includes("jacarandá")) {
    return {
      leafColor: "#3f8a47",
      youngLeafColor: "#6dac5f",
      stemColor: "#47733e",
      leafWidth: 0.035,
      leafLength: 0.13,
      leaflets: 6,
      serrated: false,
    };
  }
  if (key.includes("ipê")) {
    return {
      leafColor: "#4c8b42",
      youngLeafColor: "#78ad62",
      stemColor: "#4b713b",
      leafWidth: 0.075,
      leafLength: 0.2,
      leaflets: 5,
      serrated: false,
    };
  }
  if (key.includes("pau-brasil")) {
    return {
      leafColor: "#397d42",
      youngLeafColor: "#70a85e",
      stemColor: "#4d7442",
      leafWidth: 0.045,
      leafLength: 0.14,
      leaflets: 4,
      serrated: false,
    };
  }
  if (key.includes("quaresmeira")) {
    return {
      leafColor: "#397d48",
      youngLeafColor: "#73a967",
      stemColor: "#497044",
      leafWidth: 0.09,
      leafLength: 0.22,
      leaflets: 2,
      serrated: false,
    };
  }
  // Manacá-da-serra: opposite, slightly toothed oval leaves.
  return {
    leafColor: "#43894b",
    youngLeafColor: "#79ad68",
    stemColor: "#4d7545",
    leafWidth: 0.085,
    leafLength: 0.21,
    leaflets: 2,
    serrated: true,
  };
}

function SeedlingStem({
  from,
  to,
  radius,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  color: string;
}) {
  const transform = useMemo(() => {
    const direction = to.clone().sub(from);
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [from, to]);
  return (
    <mesh position={transform.position} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius * 0.72, radius, transform.length, 10, 2]} />
      <meshPhysicalMaterial color={color} roughness={0.78} sheen={0.18} sheenColor="#a4c889" />
    </mesh>
  );
}

function BotanicalLeaf({
  length,
  width,
  color,
  yaw,
  height,
  tilt,
  serrated,
}: {
  length: number;
  width: number;
  color: string;
  yaw: number;
  height: number;
  tilt: number;
  serrated: boolean;
}) {
  const shape = useMemo(() => {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    if (serrated) {
      const points = 7;
      for (let i = 1; i <= points; i++) {
        const t = i / points;
        const envelope = Math.sin(t * Math.PI);
        const tooth = i % 2 ? 1 : 0.78;
        leaf.lineTo(t * length, envelope * width * tooth);
      }
      for (let i = points; i >= 1; i--) {
        const t = i / points;
        const envelope = Math.sin(t * Math.PI);
        const tooth = i % 2 ? 1 : 0.78;
        leaf.lineTo(t * length, -envelope * width * tooth);
      }
    } else {
      leaf.bezierCurveTo(length * 0.25, width, length * 0.72, width * 0.92, length, 0);
      leaf.bezierCurveTo(length * 0.72, -width * 0.92, length * 0.25, -width, 0, 0);
    }
    leaf.closePath();
    return leaf;
  }, [length, serrated, width]);

  return (
    <group position={[0, height, 0]} rotation={[0, yaw, 0]}>
      <group rotation={[Math.PI / 2 - tilt, 0, 0]}>
        <mesh castShadow receiveShadow>
          <shapeGeometry args={[shape, 2]} />
          <meshPhysicalMaterial
            color={color}
            side={THREE.DoubleSide}
            roughness={0.72}
            sheen={0.34}
            sheenColor="#b9d99b"
            clearcoat={0.08}
          />
        </mesh>
        {/* Central vein makes the leaf readable up close. */}
        <mesh position={[length * 0.48, 0, 0.002]}>
          <boxGeometry args={[length * 0.9, Math.max(0.004, width * 0.055), 0.003]} />
          <meshStandardMaterial color="#b0c98a" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

function RealisticSeedling({ seedling }: { seedling: CommunitySeedling }) {
  const root = useRef<THREE.Group>(null!);
  const botany = useMemo(() => seedlingBotany(seedling.species), [seedling.species]);
  const palette = useMemo(() => speciesPalette(seedling.species), [seedling.species]);
  const seedTexture = useMemo(() => createNoiseTexture([110, 80, 55], 16, 2), []);
  const maturity = THREE.MathUtils.clamp(seedling.growth / 750, 0, 1);
  const beauty = THREE.MathUtils.clamp((seedling.beauty ?? 18) / 100, 0, 1);
  const height = 0.42 + Math.sqrt(maturity) * 1.28 * (0.95 + beauty * 0.12);
  const radius = 0.018 + maturity * 0.034;
  const nodeCount = 2 + Math.floor(maturity * 4 + beauty * 1.5);
  const seedVisible = seedling.growth < 80;
  const showEarlyBuds = seedling.growth > 380 && beauty > 0.45;

  const stemPoints = useMemo(() => {
    const lean = ((seedling.id.length % 5) - 2) * 0.012;
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean, height * 0.5, -lean * 0.45),
      new THREE.Vector3(-lean * 0.3, height, lean * 0.7),
    ];
  }, [height, seedling.id]);

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime + seedling.id.length;
    root.current.rotation.z = Math.sin(t * 0.72) * 0.012;
    root.current.rotation.x = Math.cos(t * 0.57) * 0.007;
  });

  return (
    <group ref={root} position={[0, 0.12, 0]}>
      {seedVisible && (
        <group position={[-0.045, 0.025, 0.02]} rotation={[0.2, 0.5, -0.25]}>
          <mesh scale={[1, 0.68, 0.72]} castShadow>
            <sphereGeometry args={[0.075, 14, 9]} />
            <meshStandardMaterial
              color="#765039"
              roughness={1}
              bumpMap={seedTexture}
              bumpScale={0.012}
            />
          </mesh>
          <mesh position={[0.035, 0.012, 0.055]} scale={[0.54, 0.45, 0.16]}>
            <sphereGeometry args={[0.055, 10, 7]} />
            <meshStandardMaterial color="#b69468" roughness={0.96} />
          </mesh>
        </group>
      )}

      <SeedlingStem
        from={stemPoints[0]}
        to={stemPoints[1]}
        radius={radius}
        color={botany.stemColor}
      />
      <SeedlingStem
        from={stemPoints[1]}
        to={stemPoints[2]}
        radius={radius * 0.78}
        color={botany.stemColor}
      />

      {/* Rounded cotyledons remain below the first true leaves. */}
      {[0, Math.PI].map((yaw, i) => (
        <BotanicalLeaf
          key={`cotyledon-${i}`}
          length={0.13 + maturity * 0.04}
          width={0.052}
          color={i ? "#78a963" : "#87b56e"}
          yaw={yaw + 0.18}
          height={height * 0.28}
          tilt={0.16}
          serrated={false}
        />
      ))}

      {Array.from({ length: nodeCount }, (_, node) => {
        const nodeHeight = height * (0.48 + (node / Math.max(1, nodeCount - 1)) * 0.47);
        const count = botany.leaflets;
        const sizeFade = 0.72 + (node / Math.max(1, nodeCount - 1)) * 0.28;
        return Array.from({ length: count }, (_, leaflet) => {
          const fan =
            count === 2 ? leaflet * Math.PI : (leaflet / count) * Math.PI * 1.42 - Math.PI * 0.71;
          const baseYaw = node * 2.39996 + (node % 2 ? Math.PI : 0);
          const compoundScale = count > 2 ? 0.7 : 1;
          return (
            <BotanicalLeaf
              key={`true-leaf-${node}-${leaflet}`}
              length={botany.leafLength * sizeFade * compoundScale}
              width={botany.leafWidth * sizeFade * compoundScale}
              color={node === nodeCount - 1 ? botany.youngLeafColor : botany.leafColor}
              yaw={baseYaw + fan}
              height={nodeHeight}
              tilt={0.2 + node * 0.035}
              serrated={botany.serrated}
            />
          );
        });
      })}

      {/* Tender apical bud at the growing tip. */}
      <mesh
        position={[stemPoints[2].x, height + 0.035, stemPoints[2].z]}
        scale={[0.045, 0.075, 0.035]}
        castShadow
      >
        <sphereGeometry args={[1, 10, 7]} />
        <meshPhysicalMaterial
          color={botany.youngLeafColor}
          roughness={0.72}
          sheen={0.28}
          sheenColor="#c8e3a8"
        />
      </mesh>

      {/* After pruning, young plants already hint at species bloom colors. */}
      {showEarlyBuds &&
        [0, 1, 2].map((i) => {
          const a = i * 2.1 + 0.4;
          return (
            <mesh
              key={`bud-${i}`}
              position={[Math.cos(a) * 0.08, height * (0.72 + i * 0.08), Math.sin(a) * 0.08]}
              scale={[0.035, 0.04, 0.035]}
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial
                color={palette.flowers[i % palette.flowers.length]}
                emissive={palette.flowers[i % palette.flowers.length]}
                emissiveIntensity={0.22 + beauty * 0.25}
                roughness={0.5}
              />
            </mesh>
          );
        })}
    </group>
  );
}

/* ---------------- Ground ---------------- */

function Ground({ isMobile, quality }: { isMobile?: boolean; quality: RenderQuality }) {
  const bladeCount =
    quality === "low" ? 110 : quality === "high" ? (isMobile ? 280 : 620) : isMobile ? 180 : 420;
  const grassMesh = useRef<THREE.InstancedMesh>(null!);
  const meadowMesh = useRef<THREE.InstancedMesh>(null!);
  const groundTexture = useMemo(() => createNoiseTexture([78, 128, 62], 18, 16), []);
  const soilTexture = useMemo(() => createNoiseTexture([72, 45, 24], 30, 3), []);
  const soilPatch = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 32;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = 0.9 + Math.sin(i * 2.31) * 0.025 + Math.cos(i * 1.37) * 0.018;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.72;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);
  const grass = useMemo(() => {
    const arr: {
      p: [number, number, number];
      h: number;
      c: string;
      rot: number;
      lean: number;
      w: number;
    }[] = [];
    let clusterX = 0;
    let clusterZ = 0;
    for (let i = 0; i < bladeCount; i++) {
      /* Tufos naturais: a cada 6–8 lâminas, novo centro de mancha. */
      if (i % 7 === 0) {
        const r = 2.2 + Math.sqrt(Math.random()) * 15.5;
        const a = Math.random() * Math.PI * 2;
        clusterX = Math.cos(a) * r;
        clusterZ = Math.sin(a) * r;
      }
      const x = clusterX + (Math.random() - 0.5) * 1.35;
      const z = clusterZ + (Math.random() - 0.5) * 1.35;
      const roll = Math.random();
      arr.push({
        p: [x, 0, z],
        h: 0.1 + Math.random() * 0.28,
        c:
          roll < 0.18
            ? "#6fbf5a"
            : roll < 0.38
              ? "#4a8c42"
              : roll < 0.62
                ? "#5aad55"
                : roll < 0.82
                  ? "#3f7a3a"
                  : "#8bc96e",
        rot: Math.random() * Math.PI,
        lean: (Math.random() - 0.5) * 0.45,
        w: 0.012 + Math.random() * 0.018,
      });
    }
    return arr;
  }, [bladeCount]);

  // Moitas do campo — mesmo gerador da física (buildMeadowSpots), então os
  // animais desviam exatamente das moitas que aparecem na tela.
  const meadow = useMemo(() => {
    const n = quality === "low" ? 26 : 54;
    return buildMeadowSpots(n).map((spot) => ({
      p: [spot.x, 0, spot.z] as [number, number, number],
      s: spot.s,
      c: spot.roll < 0.3 ? "#5f9c52" : spot.roll < 0.65 ? "#4f8a46" : "#6aa85a",
    }));
  }, [quality]);

  useLayoutEffect(() => {
    const helper = new THREE.Object3D();
    const color = new THREE.Color();
    if (grassMesh.current) {
      grass.forEach((g, i) => {
        helper.position.set(g.p[0], g.h * 0.45, g.p[2]);
        helper.rotation.set(g.lean * 0.35, g.rot, g.lean);
        helper.scale.set(g.w / 0.016, g.h, g.w / 0.016);
        helper.updateMatrix();
        grassMesh.current.setMatrixAt(i, helper.matrix);
        grassMesh.current.setColorAt(i, color.set(g.c));
      });
      grassMesh.current.instanceMatrix.needsUpdate = true;
      if (grassMesh.current.instanceColor) grassMesh.current.instanceColor.needsUpdate = true;
    }
    if (meadowMesh.current) {
      meadow.forEach((m, i) => {
        helper.position.set(m.p[0], m.s * 0.32, m.p[2]);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(m.s, m.s * 0.7, m.s);
        helper.updateMatrix();
        meadowMesh.current.setMatrixAt(i, helper.matrix);
        meadowMesh.current.setColorAt(i, color.set(m.c));
      });
      meadowMesh.current.instanceMatrix.needsUpdate = true;
      if (meadowMesh.current.instanceColor) meadowMesh.current.instanceColor.needsUpdate = true;
    }
  }, [grass, meadow]);

  return (
    <group>
      {/* Distant forest floor — deep green that melts into the fog, no bare horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <circleGeometry args={[80, 48]} />
        <meshStandardMaterial color="#3f6a38" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <circleGeometry args={[36, 64]} />
        <meshStandardMaterial map={groundTexture} color="#7a9f5e" roughness={0.98} />
      </mesh>
      {/* Manchas tonais no gramado — variação de cor como campo real */}
      {(
        [
          [6.5, 0.002, -4.2, 3.2, "#6f9454"],
          [-5.8, 0.002, 5.1, 2.8, "#8aaf68"],
          [3.2, 0.002, 7.4, 2.4, "#759a58"],
          [-8.1, 0.002, -2.6, 3.5, "#6a8e50"],
          [10.2, 0.002, 2.1, 2.6, "#82a862"],
          [-2.4, 0.002, -9.5, 2.9, "#739655"],
        ] as const
      ).map(([x, y, z, s, c], i) => (
        <mesh key={`lawn-tone-${i}`} rotation={[-Math.PI / 2, 0, i * 0.7]} position={[x, y, z]}>
          <circleGeometry args={[s, 20]} />
          <meshStandardMaterial
            color={c}
            roughness={1}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Reserved community garden square — enough spacing for mature trees */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[19, 0.08, 19]} />
        <meshStandardMaterial map={groundTexture} color="#95b574" roughness={1} />
      </mesh>
      {/* Natural stone border */}
      {[
        [0, 0.09, -9.55, 19.4, 0.18],
        [0, 0.09, 9.55, 19.4, 0.18],
        [-9.55, 0.09, 0, 0.18, 19.4],
        [9.55, 0.09, 0, 0.18, 19.4],
      ].map(([x, y, z, width, depth], i) => (
        <mesh key={`border-${i}`} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.16, depth]} />
          <meshStandardMaterial color={i % 2 ? "#80796c" : "#928a7c"} roughness={0.98} />
        </mesh>
      ))}
      {/* Cross paths keep each seedling easy to reach */}
      <mesh position={[0, 0.075, 0]} receiveShadow>
        <boxGeometry args={[1.15, 0.035, 18.7]} />
        <meshStandardMaterial color="#b59a77" roughness={1} />
      </mesh>
      <mesh position={[0, 0.078, 0]} receiveShadow>
        <boxGeometry args={[18.7, 0.035, 1.15]} />
        <meshStandardMaterial color="#b59a77" roughness={1} />
      </mesh>
      {/* Colinas suaves em dois anéis — quebram a planície e escondem o fim do mundo */}
      {(
        [
          [13, -0.9, -18, 8, "#7f9f68"],
          [-17, -1.1, -15, 9, "#79a065"],
          [18, -0.8, 13, 7.5, "#84a26c"],
          [-14, -0.95, 17, 8.5, "#7b9c66"],
          [2, -1.3, -23, 10, "#729661"],
          [-22, -1.5, 3, 11, "#6e945e"],
          [22, -1.4, -2, 10.5, "#75995f"],
          [5, -1.6, 24, 12, "#6d925d"],
          [-6, -2.2, -30, 15, "#647f56"],
          [28, -2.4, 12, 16, "#61805a"],
          [-27, -2.3, -12, 15, "#5e7d55"],
          [12, -2.5, 30, 16, "#5c7b54"],
        ] as const
      ).map(([x, y, z, s, c], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s, 1.2, s * 0.85]} receiveShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial map={groundTexture} color={c} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <shapeGeometry args={[soilPatch, 24]} />
        <meshStandardMaterial
          map={soilTexture}
          bumpMap={soilTexture}
          bumpScale={0.025}
          color="#8a6245"
          roughness={1}
        />
      </mesh>
      {/* Capim e moitas instanciados: 2 draw calls no lugar de ~300 meshes */}
      <instancedMesh
        ref={grassMesh}
        args={[undefined, undefined, grass.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.016, 1, 3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={meadowMesh}
        args={[undefined, undefined, meadow.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.98} flatShading />
      </instancedMesh>
    </group>
  );
}

function SeedlingPests({ seedling }: { seedling: CommunitySeedling }) {
  const flying = useRef<THREE.Group>(null!);
  const severity = THREE.MathUtils.clamp((65 - seedling.pestFree) / 65, 0, 1);
  const plantHeight =
    seedling.growth < 750
      ? 0.55 + Math.sqrt(seedling.growth / 750) * 1.25
      : 1.25 + Math.min(1, seedling.growth / 2500) * 3.1;

  const pests = useMemo(() => {
    let seed = 2166136261;
    for (let i = 0; i < seedling.id.length; i++) {
      seed ^= seedling.id.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    seed = (seed ^ 0x6d2b79f5) >>> 0;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = Math.max(2, Math.round(2 + severity * 9));
    return Array.from({ length: count }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 0.08 + random() * (0.18 + severity * 0.2);
      return {
        index,
        angle,
        radius,
        height: plantHeight * (0.32 + random() * 0.58),
        size: 0.018 + random() * 0.014,
        speed: 0.55 + random() * 0.8,
        phase: random() * Math.PI * 2,
        color: index % 3 === 0 ? "#78922f" : index % 3 === 1 ? "#3d2b20" : "#a64b32",
      };
    });
  }, [plantHeight, seedling.id, severity]);

  useFrame((state) => {
    if (!flying.current) return;
    const time = state.clock.elapsedTime;
    flying.current.children.forEach((child, index) => {
      const pest = pests[index];
      if (!pest) return;
      const orbit = pest.angle + time * pest.speed;
      child.position.set(
        Math.cos(orbit) * (0.28 + pest.radius),
        pest.height + Math.sin(time * 2.2 + pest.phase) * 0.07,
        Math.sin(orbit) * (0.28 + pest.radius),
      );
      child.rotation.y = -orbit;
    });
  });

  if (severity <= 0) return null;

  const attachedCount = Math.max(2, Math.round(2 + severity * 7));
  return (
    <group>
      {/* Aphids and small beetles attached to stems/leaves. */}
      {pests.slice(0, attachedCount).map((pest, index) => (
        <group
          key={`attached-pest-${index}`}
          position={[
            Math.cos(pest.angle) * pest.radius,
            pest.height,
            Math.sin(pest.angle) * pest.radius,
          ]}
          rotation={[0.2, -pest.angle, index % 2 ? 0.45 : -0.35]}
          scale={1 + severity * 0.35}
        >
          <mesh castShadow>
            <sphereGeometry args={[pest.size, 8, 6]} />
            <meshStandardMaterial color={pest.color} roughness={0.78} />
          </mesh>
          <mesh position={[pest.size * 0.95, 0, 0]} castShadow>
            <sphereGeometry args={[pest.size * 0.55, 7, 5]} />
            <meshStandardMaterial color={index % 2 ? "#231b16" : "#596f25"} roughness={0.82} />
          </mesh>
          {[0, 1].map((side) => (
            <mesh
              key={side}
              position={[0, (side ? 1 : -1) * pest.size * 0.9, 0]}
              rotation={[0, 0, side ? 0.55 : -0.55]}
            >
              <boxGeometry args={[pest.size * 1.6, 0.003, 0.003]} />
              <meshBasicMaterial color="#241b17" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tiny gnats orbit the affected plant at medium/high infestation. */}
      {severity > 0.28 && (
        <group ref={flying}>
          {pests.slice(0, Math.max(2, Math.round(severity * 6))).map((pest, index) => (
            <group key={`flying-pest-${index}`}>
              <mesh scale={[1.3, 0.65, 0.7]}>
                <sphereGeometry args={[pest.size * 0.72, 7, 5]} />
                <meshStandardMaterial color="#211a16" roughness={0.72} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[0, pest.size * 0.65, side * pest.size * 0.75]}
                  rotation={[side * 0.35, 0, 0]}
                >
                  <circleGeometry args={[pest.size * 0.72, 7]} />
                  <meshPhysicalMaterial
                    color="#d8e1d0"
                    transparent
                    opacity={0.42}
                    roughness={0.25}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* One visible caterpillar appears only in a serious infestation. */}
      {severity > 0.62 && (
        <group position={[0.16, 0.19, -0.13]} rotation={[0, 0.75, 0]}>
          {[0, 1, 2, 3, 4].map((segment) => (
            <mesh
              key={segment}
              position={[segment * 0.027, Math.sin(segment * 1.5) * 0.008, 0]}
              castShadow
            >
              <sphereGeometry args={[0.021, 8, 6]} />
              <meshStandardMaterial
                color={segment === 4 ? "#52691f" : "#809b31"}
                roughness={0.86}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function CommunitySeedlingPlots({
  seedlings,
  selectedSeedlingId,
  onSelectSeedling,
  quality,
  isMobile,
}: {
  seedlings: CommunitySeedling[];
  selectedSeedlingId?: string;
  onSelectSeedling?: (seedlingId: string) => void;
  quality: RenderQuality;
  isMobile?: boolean;
}) {
  return (
    <group>
      {seedlings.map((seedling) => {
        const selected = seedling.id === selectedSeedlingId;
        // Saúde plena = todos os cuidados quase no máximo → aura dourada visível
        const health =
          (seedling.water +
            seedling.fertilizer +
            seedling.cleanliness +
            seedling.pestFree +
            (seedling.beauty ?? 40)) /
          5;
        const radiant = health >= 95 && seedling.growth >= 750;
        const canopyH = 1.2 + Math.min(1, seedling.growth / 2500) * 2.4;
        return (
          <group
            key={seedling.id}
            position={seedling.position}
            onClick={(event) => {
              event.stopPropagation();
              onSelectSeedling?.(seedling.id);
            }}
          >
            <RealisticSoilBed seedling={seedling} selected={selected} />
            <SeedlingPests seedling={seedling} />
            {seedling.growth < 750 ? (
              <RealisticSeedling seedling={seedling} />
            ) : (
              <Tree
                stage={stageOf(seedling.growth)}
                growth={seedling.growth}
                species={seedling.species}
                beauty={seedling.beauty ?? 40}
                quality={quality}
                isMobile={isMobile}
              />
            )}
            {radiant && quality !== "low" && (
              <>
                <Sparkles
                  count={isMobile ? 10 : 18}
                  scale={[2.4, 1.8, 2.4]}
                  size={2.4}
                  speed={0.22}
                  color="#ffe9a8"
                  position={[0, canopyH, 0]}
                />
                <pointLight
                  position={[0, canopyH * 0.85, 0]}
                  intensity={0.22}
                  distance={4.5}
                  color="#ffe9b0"
                />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* Fauna aérea premium: PremiumBirds / PremiumBees */

type DistantShadowSpecies = "deer" | "fox";

function ShadowMaterial({ isNight }: { isNight: boolean }) {
  return (
    <meshBasicMaterial
      color={isNight ? "#050807" : "#152019"}
      transparent
      opacity={0}
      depthWrite={false}
      fog
    />
  );
}

function DistantDeerSilhouette({ isNight }: { isNight: boolean }) {
  return (
    <group scale={0.82}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1.1, 0.68]}>
        <capsuleGeometry args={[0.3, 0.88, 7, 12]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      <mesh position={[0.58, 0.48, 0]} rotation={[0, 0, -0.38]} scale={[0.65, 1.3, 0.65]}>
        <capsuleGeometry args={[0.18, 0.62, 7, 11]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      <mesh position={[0.79, 0.92, 0]} scale={[1.15, 0.75, 0.7]}>
        <sphereGeometry args={[0.23, 10, 8]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      <mesh position={[1.02, 0.83, 0]} scale={[1.45, 0.5, 0.58]}>
        <capsuleGeometry args={[0.1, 0.24, 6, 9]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      {[0.46, -0.46].flatMap((x) =>
        [0.19, -0.19].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.49, z]}>
            <capsuleGeometry args={[0.027, 0.72, 5, 8]} />
            <ShadowMaterial isNight={isNight} />
          </mesh>
        )),
      )}
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[0.72, 1.2, side * 0.1]} rotation={[0, 0, -0.18]}>
            <cylinderGeometry args={[0.012, 0.026, 0.42, 5]} />
            <ShadowMaterial isNight={isNight} />
          </mesh>
          <mesh position={[0.82, 1.34, side * 0.11]} rotation={[0, 0, -0.72]}>
            <cylinderGeometry args={[0.009, 0.017, 0.25, 5]} />
            <ShadowMaterial isNight={isNight} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DistantFoxSilhouette({ isNight }: { isNight: boolean }) {
  return (
    <group scale={0.72}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1.15, 0.66]}>
        <capsuleGeometry args={[0.27, 0.9, 7, 12]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      <mesh position={[0.62, 0.2, 0]} scale={[1, 0.84, 0.72]}>
        <sphereGeometry args={[0.25, 9, 7]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      <mesh position={[0.87, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.15, 0.42, 8]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
      {[0.15, -0.15].map((z) => (
        <mesh key={z} position={[0.55, 0.48, z]}>
          <coneGeometry args={[0.09, 0.24, 7]} />
          <ShadowMaterial isNight={isNight} />
        </mesh>
      ))}
      {[0.42, -0.42].flatMap((x) =>
        [0.17, -0.17].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.43, z]}>
            <capsuleGeometry args={[0.032, 0.56, 5, 8]} />
            <ShadowMaterial isNight={isNight} />
          </mesh>
        )),
      )}
      <mesh position={[-0.73, 0.14, 0]} rotation={[0, 0, 1.05]} scale={[1, 1.25, 0.72]}>
        <capsuleGeometry args={[0.15, 0.62, 7, 11]} />
        <ShadowMaterial isNight={isNight} />
      </mesh>
    </group>
  );
}

function DistantAnimalShadow({
  species,
  radius,
  offset,
  speed,
  isNight,
}: {
  species: DistantShadowSpecies;
  radius: number;
  offset: number;
  speed: number;
  isNight: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    const phase = (t + offset) % 48;
    // Each silhouette is visible for ~13 seconds, then absent for a long time.
    const fadeIn = THREE.MathUtils.smoothstep(phase, 7.5, 10.5);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(phase, 18, 21);
    const opacity = Math.max(0, fadeIn * fadeOut) * (isNight ? 0.3 : 0.2);
    root.current.visible = opacity > 0.006;
    if (!root.current.visible) return;

    const angle = offset * 0.11 + t * speed;
    root.current.position.set(
      Math.cos(angle) * radius,
      species === "deer" ? 0.82 : 0.58,
      Math.sin(angle) * radius,
    );
    root.current.rotation.y = -angle - Math.PI / 2;
    root.current.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
    });
  });

  return (
    <group ref={root} visible={false}>
      {species === "deer" ? (
        <DistantDeerSilhouette isNight={isNight} />
      ) : (
        <DistantFoxSilhouette isNight={isNight} />
      )}
    </group>
  );
}

function DistantWildlifeShadows({
  isNight,
  isMobile,
  quality,
}: {
  isNight: boolean;
  isMobile?: boolean;
  quality: RenderQuality;
}) {
  return (
    <group>
      <DistantAnimalShadow
        species="deer"
        radius={24.2}
        offset={0}
        speed={0.018}
        isNight={isNight}
      />
      {!isMobile && quality !== "low" && (
        <DistantAnimalShadow
          species="fox"
          radius={25.4}
          offset={24}
          speed={0.022}
          isNight={isNight}
        />
      )}
    </group>
  );
}

function Rain({ quality }: { quality: RenderQuality }) {
  const streaks = useRef<THREE.InstancedMesh>(null!);
  const splashes = useRef<THREE.InstancedMesh>(null!);
  const mist = useRef<THREE.Points>(null!);
  const dropCount = quality === "low" ? 220 : quality === "high" ? 700 : 520;
  const splashCount = quality === "low" ? 40 : quality === "high" ? 120 : 90;
  const mistCount = quality === "low" ? 80 : quality === "high" ? 220 : 160;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const splashDummy = useMemo(() => new THREE.Object3D(), []);

  const drops = useMemo(() => {
    return Array.from({ length: dropCount }, () => ({
      x: (Math.random() - 0.5) * 26,
      y: Math.random() * 14,
      z: (Math.random() - 0.5) * 26,
      speed: 7.5 + Math.random() * 5.5,
      length: 0.28 + Math.random() * 0.45,
      drift: 0.35 + Math.random() * 0.55,
    }));
  }, [dropCount]);

  const splashState = useMemo(
    () =>
      Array.from({ length: splashCount }, () => ({
        x: 0,
        z: 0,
        life: -1,
        max: 0.35 + Math.random() * 0.25,
      })),
    [splashCount],
  );

  const mistPositions = useMemo(() => {
    const arr = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = 0.05 + Math.random() * 0.55;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, [mistCount]);

  const splashCursor = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    if (streaks.current) {
      for (let i = 0; i < dropCount; i++) {
        const d = drops[i];
        d.y -= d.speed * dt;
        d.x += d.drift * dt * 0.55;
        if (d.y < 0.02) {
          const splash = splashState[splashCursor.current % splashCount];
          splash.x = d.x;
          splash.z = d.z;
          splash.life = 0;
          splashCursor.current += 1;
          d.y = 10 + Math.random() * 5;
          d.x = (Math.random() - 0.5) * 26;
          d.z = (Math.random() - 0.5) * 26;
        }
        if (d.x > 14) d.x = -14;
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.set(0.012, d.length, 0.012);
        dummy.rotation.set(0.35, 0, -0.18);
        dummy.updateMatrix();
        streaks.current.setMatrixAt(i, dummy.matrix);
      }
      streaks.current.instanceMatrix.needsUpdate = true;
    }

    if (splashes.current) {
      for (let i = 0; i < splashCount; i++) {
        const s = splashState[i];
        if (s.life < 0) {
          splashDummy.position.set(0, -10, 0);
          splashDummy.scale.set(0.001, 0.001, 0.001);
        } else {
          s.life += dt;
          const t = Math.min(1, s.life / s.max);
          const radius = 0.08 + t * 0.55;
          splashDummy.position.set(s.x, 0.03, s.z);
          splashDummy.scale.set(radius, 0.02, radius);
          if (t >= 1) s.life = -1;
        }
        splashDummy.updateMatrix();
        splashes.current.setMatrixAt(i, splashDummy.matrix);
      }
      splashes.current.instanceMatrix.needsUpdate = true;
    }

    if (mist.current) {
      mist.current.rotation.y += dt * 0.04;
    }
  });

  return (
    <group>
      <instancedMesh ref={streaks} args={[undefined, undefined, dropCount]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshBasicMaterial color="#c5daf0" transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={splashes}
        args={[undefined, undefined, splashCount]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshBasicMaterial color="#d7e8f7" transparent opacity={0.35} depthWrite={false} />
      </instancedMesh>
      <points ref={mist} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[mistPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#b8cfdc"
          size={quality === "low" ? 0.12 : 0.18}
          transparent
          opacity={0.22}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      {/* Soft wet-ground sheen while raining */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[18, 32]} />
        <meshBasicMaterial color="#6f8794" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

type CareParticle = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  delay: number;
  spin: number;
};

/**
 * Efeito visual por tipo de cuidado:
 * - water: gotas caem do alto e respingam na base
 * - prune: folhinhas voam da copa girando
 * - fertilizer: grãos de terra saltam e assentam
 * - clean: brilhos sobem em espiral
 * - pest: pontinhos escuros fogem, brilho verde toma o lugar
 */
function CareBurst({
  kind,
  position = [0, 0, 0],
}: {
  kind: CareKind;
  position?: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const life = useRef(0);
  const DURATION = 1.4;

  // Reinicia a animação quando o tipo de cuidado muda no meio do efeito.
  useEffect(() => {
    life.current = 0;
  }, [kind]);

  const config = useMemo(() => {
    switch (kind) {
      case "water":
        return { color: "#6cc4ff", accent: "#bfe8ff", gravity: -6.5, count: 22 };
      case "prune":
        return { color: "#8fd05e", accent: "#c8ec9a", gravity: -1.6, count: 18 };
      case "fertilizer":
        return { color: "#9a6b2f", accent: "#c9a15e", gravity: -7.5, count: 20 };
      case "clean":
        return { color: "#a9f0c1", accent: "#ffffff", gravity: 1.8, count: 20 };
      default:
        return { color: "#3a2f28", accent: "#8dfa96", gravity: 0.4, count: 18 };
    }
  }, [kind]);

  const particles = useMemo<CareParticle[]>(() => {
    return Array.from({ length: config.count }, (_, i) => {
      const a = (i / config.count) * Math.PI * 2 + Math.random() * 0.8;
      const r = 0.15 + Math.random() * 0.4;
      if (kind === "water") {
        // Nascem no alto, quase paradas: a gravidade faz o trabalho.
        return {
          pos: new THREE.Vector3(Math.cos(a) * r, 2.2 + Math.random() * 0.8, Math.sin(a) * r),
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4),
          size: 0.045 + Math.random() * 0.03,
          delay: Math.random() * 0.35,
          spin: 0,
        };
      }
      if (kind === "prune") {
        // Folhas lançadas da copa para os lados, caindo devagar.
        return {
          pos: new THREE.Vector3(Math.cos(a) * 0.25, 1.4 + Math.random() * 0.5, Math.sin(a) * 0.25),
          vel: new THREE.Vector3(
            Math.cos(a) * (1 + Math.random()),
            0.8 + Math.random() * 0.8,
            Math.sin(a) * (1 + Math.random()),
          ),
          size: 0.06 + Math.random() * 0.04,
          delay: Math.random() * 0.2,
          spin: 4 + Math.random() * 6,
        };
      }
      if (kind === "fertilizer") {
        // Grãos saltam do solo em arco curto.
        return {
          pos: new THREE.Vector3(Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2),
          vel: new THREE.Vector3(
            Math.cos(a) * (0.8 + Math.random() * 0.8),
            2.4 + Math.random() * 1.4,
            Math.sin(a) * (0.8 + Math.random() * 0.8),
          ),
          size: 0.035 + Math.random() * 0.03,
          delay: Math.random() * 0.25,
          spin: 2,
        };
      }
      if (kind === "clean") {
        // Brilhos em espiral ascendente.
        return {
          pos: new THREE.Vector3(
            Math.cos(a) * (0.3 + r),
            0.2 + Math.random() * 0.4,
            Math.sin(a) * (0.3 + r),
          ),
          vel: new THREE.Vector3(-Math.sin(a) * 1.2, 1.2 + Math.random() * 0.9, Math.cos(a) * 1.2),
          size: 0.04 + Math.random() * 0.03,
          delay: Math.random() * 0.3,
          spin: 3,
        };
      }
      // pest: fogem radialmente para longe da planta.
      return {
        pos: new THREE.Vector3(Math.cos(a) * 0.3, 0.4 + Math.random() * 0.8, Math.sin(a) * 0.3),
        vel: new THREE.Vector3(
          Math.cos(a) * (2.2 + Math.random() * 1.6),
          0.6 + Math.random(),
          Math.sin(a) * (2.2 + Math.random() * 1.6),
        ),
        size: 0.04 + Math.random() * 0.025,
        delay: Math.random() * 0.15,
        spin: 8,
      };
    });
  }, [kind, config.count]);

  useFrame((_, dt) => {
    life.current += dt;
    const group = ref.current;
    if (!group) return;
    const t = Math.min(1, life.current / DURATION);

    group.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;
      const mesh = child as THREE.Mesh;
      const local = Math.max(0, life.current - p.delay);
      p.vel.y += config.gravity * dt;
      p.pos.addScaledVector(p.vel, local > 0 ? dt : 0);
      // Gotas de água não atravessam o chão: respingam e somem.
      if (kind === "water" && p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.set(p.vel.x * 1.6, 0, p.vel.z * 1.6);
      }
      if (kind === "fertilizer" && p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.setScalar(0);
      }
      mesh.position.copy(p.pos);
      if (p.spin) mesh.rotation.x = mesh.rotation.z += p.spin * dt;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = Math.max(0, (1 - t) * (local > 0 ? 1 : 0));
    });

    // Anel de impacto na base: expande e desvanece.
    if (ringRef.current) {
      const rt = Math.min(1, life.current / 0.8);
      ringRef.current.scale.setScalar(0.3 + rt * 2.2);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.55 * (1 - rt);
    }
  });

  const isLeaf = kind === "prune";
  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.42, 0.52, 40]} />
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={ref}>
        {particles.map((p, i) => (
          <mesh key={i} position={p.pos.toArray()}>
            {isLeaf ? (
              <planeGeometry args={[p.size * 2.2, p.size * 1.2]} />
            ) : (
              <sphereGeometry args={[p.size, 8, 6]} />
            )}
            <meshStandardMaterial
              color={i % 3 === 0 ? config.accent : config.color}
              transparent
              opacity={0.95}
              emissive={i % 3 === 0 ? config.accent : config.color}
              emissiveIntensity={kind === "clean" || kind === "pest" ? 0.9 : 0.45}
              side={isLeaf ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function HorizonTreeLine({
  isNight,
  quality,
  ultraLow = false,
}: {
  isNight: boolean;
  quality: RenderQuality;
  ultraLow?: boolean;
}) {
  const trunks = useRef<THREE.InstancedMesh>(null!);
  const crowns = useRef<THREE.InstancedMesh>(null!);
  const crownSide = useRef<THREE.InstancedMesh>(null!);
  const conifers = useRef<THREE.InstancedMesh>(null!);
  const backRing = useRef<THREE.InstancedMesh>(null!);
  const farRing = useRef<THREE.InstancedMesh>(null!);
  const count = ultraLow ? 36 : quality === "low" ? 70 : quality === "high" ? 150 : 120;
  const backCount = ultraLow ? 24 : quality === "low" ? 50 : quality === "high" ? 115 : 90;
  const farCount = ultraLow ? 0 : quality === "low" ? 40 : quality === "high" ? 90 : 70;
  /* Cor da névoa do horizonte — as árvores distantes desbotam nessa direção. */
  const hazeColor = useMemo(() => new THREE.Color(isNight ? "#263b50" : "#aabf9d"), [isNight]);
  const barkTexture = useMemo(() => createNoiseTexture([145, 145, 145], 52, 5), []);
  const leafTexture = useMemo(() => createNoiseTexture([165, 165, 165], 38, 3), []);
  /* Mesmo gerador da física: cada tronco que colide existe na tela. */
  const trees = useMemo(() => buildHorizonTreeLine(count), [count]);

  const backTrees = useMemo(() => {
    let seed = 55127;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: backCount }, (_, i) => {
      const angle = (i / backCount) * Math.PI * 2 + (random() - 0.5) * 0.25;
      const radius = 28 + random() * 5.5;
      const height = 3.2 + random() * 3.2;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height,
        width: 1.8 + random() * 1.8,
        squash: 0.45 + random() * 0.2,
        shade: 0.8 + random() * 0.3,
      };
    });
  }, [backCount]);

  /* Anel mais distante: silhuetas menores e desbotadas — a floresta "não acaba". */
  const farTrees = useMemo(() => {
    let seed = 77351;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: farCount }, (_, i) => {
      const angle = (i / farCount) * Math.PI * 2 + (random() - 0.5) * 0.3;
      const radius = 35 + random() * 7;
      const height = 3.6 + random() * 3.6;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height,
        width: 2.2 + random() * 2.4,
        squash: 0.42 + random() * 0.2,
        fade: 0.55 + random() * 0.25,
      };
    });
  }, [farCount]);

  useEffect(() => {
    const helper = new THREE.Object3D();
    const color = new THREE.Color();
    let ci = 0;
    let fi = 0;
    trees.forEach((tree) => {
      helper.position.set(tree.x, tree.height * 0.3, tree.z);
      helper.rotation.set(tree.lean, tree.rotation, tree.lean * 0.4);
      helper.scale.set(0.14, tree.height * 0.32, 0.14);
      helper.updateMatrix();
      trunks.current?.setMatrixAt(ci + fi, helper.matrix);

      if (tree.conifer) {
        helper.position.set(tree.x, tree.height * 0.7, tree.z);
        helper.rotation.set(0, tree.rotation, 0);
        helper.scale.set(tree.width * 0.85, tree.height * 0.95, tree.width * 0.75);
        helper.updateMatrix();
        conifers.current?.setMatrixAt(fi, helper.matrix);
        color.setRGB(0.12 * tree.shade, 0.28 * tree.shade, 0.16 * tree.shade);
        conifers.current?.setColorAt(fi, color);
        fi++;
      } else {
        /* Copa achatada + massa lateral — silhueta de árvore, não bola. */
        helper.position.set(tree.x, tree.height * 0.78, tree.z);
        helper.rotation.set(0, tree.rotation, 0);
        helper.scale.set(tree.width, tree.height * tree.crownSquash, tree.width * 0.92);
        helper.updateMatrix();
        crowns.current?.setMatrixAt(ci, helper.matrix);
        color.setRGB(0.16 * tree.shade, 0.34 * tree.shade, 0.18 * tree.shade);
        crowns.current?.setColorAt(ci, color);

        helper.position.set(tree.x + 0.25, tree.height * 0.68, tree.z - 0.15);
        helper.scale.set(
          tree.width * 0.72,
          tree.height * tree.crownSquash * 0.75,
          tree.width * 0.7,
        );
        helper.updateMatrix();
        crownSide.current?.setMatrixAt(ci, helper.matrix);
        color.setRGB(0.14 * tree.shade, 0.3 * tree.shade, 0.16 * tree.shade);
        crownSide.current?.setColorAt(ci, color);
        ci++;
      }
    });
    helper.position.set(0, -50, 0);
    helper.rotation.set(0, 0, 0);
    helper.scale.set(0, 0, 0);
    helper.updateMatrix();
    for (let k = ci; k < count; k++) {
      crowns.current?.setMatrixAt(k, helper.matrix);
      crownSide.current?.setMatrixAt(k, helper.matrix);
    }
    for (let k = fi; k < count; k++) conifers.current?.setMatrixAt(k, helper.matrix);

    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true;
      if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    }
    if (crownSide.current) {
      crownSide.current.instanceMatrix.needsUpdate = true;
      if (crownSide.current.instanceColor) crownSide.current.instanceColor.needsUpdate = true;
    }
    if (conifers.current) {
      conifers.current.instanceMatrix.needsUpdate = true;
      if (conifers.current.instanceColor) conifers.current.instanceColor.needsUpdate = true;
    }

    backTrees.forEach((tree, index) => {
      helper.position.set(tree.x, tree.height * 0.55, tree.z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(tree.width, tree.height * tree.squash, tree.width * 0.9);
      helper.updateMatrix();
      backRing.current?.setMatrixAt(index, helper.matrix);
      /* Verde escuro parcialmente misturado com a cor da névoa (~35%). */
      color.setRGB(0.13 * tree.shade, 0.26 * tree.shade, 0.15 * tree.shade).lerp(hazeColor, 0.35);
      backRing.current?.setColorAt(index, color);
    });
    if (backRing.current) {
      backRing.current.instanceMatrix.needsUpdate = true;
      if (backRing.current.instanceColor) backRing.current.instanceColor.needsUpdate = true;
    }

    farTrees.forEach((tree, index) => {
      helper.position.set(tree.x, tree.height * 0.5, tree.z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(tree.width, tree.height * tree.squash, tree.width * 0.9);
      helper.updateMatrix();
      farRing.current?.setMatrixAt(index, helper.matrix);
      /* Quase da cor do horizonte — sensação de floresta infinita. */
      color.setRGB(0.12, 0.24, 0.14).lerp(hazeColor, tree.fade);
      farRing.current?.setColorAt(index, color);
    });
    if (farRing.current) {
      farRing.current.instanceMatrix.needsUpdate = true;
      if (farRing.current.instanceColor) farRing.current.instanceColor.needsUpdate = true;
    }
  }, [trees, backTrees, farTrees, count, hazeColor]);

  return (
    <group>
      {/* Camada extra no fundo: quase silhueta, some na névoa */}
      {farCount > 0 && (
        <instancedMesh ref={farRing} args={[undefined, undefined, farCount]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" fog />
        </instancedMesh>
      )}
      <instancedMesh ref={backRing} args={[undefined, undefined, backCount]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={isNight ? "#566b64" : "#ffffff"}
          map={ultraLow ? undefined : leafTexture}
          roughness={1}
        />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.7, 1.35, 2, ultraLow ? 5 : quality === "low" ? 6 : 10, 1]} />
        <meshStandardMaterial
          color={isNight ? "#303b38" : "#3f3024"}
          map={ultraLow ? undefined : barkTexture}
          bumpMap={ultraLow ? undefined : barkTexture}
          bumpScale={ultraLow ? 0 : 0.05}
          roughness={1}
        />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={isNight ? "#284239" : "#ffffff"}
          map={ultraLow ? undefined : leafTexture}
          roughness={0.95}
        />
      </instancedMesh>
      {!ultraLow && (
        <instancedMesh ref={crownSide} args={[undefined, undefined, count]}>
          <icosahedronGeometry args={[1, quality === "low" ? 0 : 1]} />
          <meshPhysicalMaterial
            color={isNight ? "#223b33" : "#ffffff"}
            map={leafTexture}
            roughness={0.96}
            sheen={quality === "low" ? 0 : 0.08}
            sheenColor="#5f8554"
          />
        </instancedMesh>
      )}
      <instancedMesh ref={conifers} args={[undefined, undefined, count]}>
        <coneGeometry args={[0.85, 2, ultraLow ? 6 : quality === "low" ? 7 : 11, 1]} />
        <meshStandardMaterial
          color={isNight ? "#20382f" : "#ffffff"}
          map={ultraLow ? undefined : leafTexture}
          roughness={0.97}
        />
      </instancedMesh>
    </group>
  );
}

/* ---------------- Scene ---------------- */

function World({
  stage,
  growth,
  isNight,
  raining,
  clearing = false,
  isMobile,
  careFx,
  careFxKey = 0,
  butterflySeeds,
  seedlings,
  selectedSeedlingId,
  onSelectSeedling,
  butterflyGeneration = 0,
  butterfliesLeaving = false,
  solarHour = 12,
  quality,
  softwareGpu = false,
  reduceMotion = false,
}: Scene3DProps & { quality: RenderQuality; softwareGpu?: boolean }) {
  const lowQuality = quality === "low";
  /* Sem GPU real: mantém só o essencial — cada camada transparente ou árvore
     extra custa milissegundos preciosos na rasterização por CPU. */
  const ultraLow = softwareGpu && lowQuality;
  const budget = useMemo(
    () =>
      gardenWildlifeBudget({
        quality,
        isMobile,
        softwareGpu,
        reduceMotion,
        growth,
      }),
    [quality, isMobile, softwareGpu, reduceMotion, growth],
  );
  const bfCount = Math.min(butterflyCount(growth, !!isMobile), budget.butterflies);
  const selectedSeedling = seedlings?.find((item) => item.id === selectedSeedlingId);
  const selectedPosition = selectedSeedling?.position ?? ([0, 0, 0] as [number, number, number]);
  const generationSeeds = useMemo(
    () => butterflySeeds?.map((seed) => seed + butterflyGeneration * 104729),
    [butterflyGeneration, butterflySeeds],
  );
  const sunArc = ((solarHour - 6) / 12) * Math.PI;
  const sunPosition: [number, number, number] = [
    Math.cos(sunArc) * 12,
    Math.max(0.3, Math.sin(sunArc) * 10),
    4,
  ];
  const moonArc = (((solarHour + 12) % 24) / 24) * Math.PI * 2;
  // Keep the moon high and readable during night (not stuck near the horizon)
  const moonElevation = isNight ? 9.5 + Math.sin(moonArc) * 1.8 : 6.5 + Math.sin(moonArc) * 2;
  const moonPosition: [number, number, number] = [
    Math.cos(moonArc) * 14,
    moonElevation,
    -12 + Math.sin(moonArc) * 3,
  ];
  // Amanhecer e entardecer longos: a posição e a cor do sol mudam continuamente
  // com o relógio real, evitando uma troca repentina entre dia e noite.
  const twilight = !isNight && (solarHour < 7.8 || solarHour > 16.5);
  const duskProgress = THREE.MathUtils.smoothstep(solarHour, 16.5, 20.25);
  const dawnProgress = 1 - THREE.MathUtils.smoothstep(solarHour, 5.25, 7.8);
  const twilightProgress = Math.max(duskProgress, dawnProgress);
  const beesEnabled =
    !isNight && stage !== "seed" && stage !== "sprout" && stage !== "twoleaves" && budget.bees > 0;

  useEffect(() => {
    clearAnimalRegistry();
    return () => clearAnimalRegistry();
  }, []);

  return (
    <>
      <fog
        attach="fog"
        args={[
          isNight ? nightFogColor(raining) : raining ? "#98a894" : clearing ? "#e0e8b8" : "#c2ca92",
          isMobile ? 14 : 18,
          isMobile ? 32 : 40,
        ]}
      />
      {isNight ? (
        <RealisticNightSky
          moonPosition={moonPosition}
          isMobile={isMobile}
          quality={quality}
          raining={raining}
        />
      ) : (
        <>
          <color
            attach="background"
            args={[raining ? "#a3b2a0" : clearing ? "#e4ecc0" : "#c8d6a0"]}
          />
          {/* O shader do céu é caro por pixel — no modo leve fica só o gradiente
              de fundo + neblina, que dá o mesmo clima por uma fração do custo. */}
          {!lowQuality && (
            <Sky
              sunPosition={
                raining
                  ? [sunPosition[0], Math.min(1.4, sunPosition[1]), 4]
                  : clearing
                    ? [sunPosition[0], Math.max(4.5, sunPosition[1]), 4]
                    : sunPosition
              }
              turbidity={raining ? 10 : clearing ? 1.6 : twilight ? 3.4 : 2.8}
              rayleigh={raining ? 3.6 : clearing ? 0.8 : twilight ? 2.6 : 1.35}
              mieCoefficient={raining ? 0.008 : clearing ? 0.0035 : 0.006}
              mieDirectionalG={0.84}
            />
          )}
          {/* Luz dourada de amanhecer/fim de tarde — sem tom acinzentado */}
          <ambientLight
            intensity={clearing ? 1.1 : THREE.MathUtils.lerp(0.85, 0.58, twilightProgress)}
            color={
              clearing
                ? "#fff5d8"
                : new THREE.Color("#ffeabf").lerp(new THREE.Color("#d99a72"), twilightProgress)
            }
          />
          <directionalLight
            position={sunPosition}
            intensity={
              raining ? 0.6 : clearing ? 1.9 : THREE.MathUtils.lerp(1.7, 0.72, twilightProgress)
            }
            color={
              clearing
                ? "#ffe3a0"
                : new THREE.Color("#ffdf9a").lerp(new THREE.Color("#f07848"), twilightProgress)
            }
            castShadow={!lowQuality}
            shadow-mapSize-width={isMobile ? 384 : quality === "high" ? 1536 : 1024}
            shadow-mapSize-height={isMobile ? 384 : quality === "high" ? 1536 : 1024}
        shadow-camera-far={48}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
            shadow-radius={4}
            shadow-bias={-0.0004}
          />
          {/* Luz de preenchimento vinda do céu (falso GI) — levemente âmbar para não acinzentar */}
          <directionalLight
            position={[-sunPosition[0] * 0.6, 6, -sunPosition[2]]}
            intensity={0.2}
            color="#dfe4e8"
          />
          {clearing && (
            <pointLight
              position={[sunPosition[0], sunPosition[1], sunPosition[2]]}
              intensity={1.1}
              distance={55}
              color="#ffe7b0"
            />
          )}
          <hemisphereLight
            args={[
              new THREE.Color("#e8d9b8").lerp(new THREE.Color("#d49b86"), twilightProgress),
              "#7a9558",
              THREE.MathUtils.lerp(0.55, 0.4, twilightProgress),
            ]}
          />
          {!isMobile && !lowQuality && (
            <>
              <Cloud position={[-11, 9, -18]} scale={0.55} speed={0.05} opacity={0.32} />
              <Cloud position={[10, 10, -20]} scale={0.48} speed={0.04} opacity={0.28} />
              <Cloud position={[1, 11, -24]} scale={0.42} speed={0.045} opacity={0.22} />
              <Cloud position={[-16, 11.5, 8]} scale={0.5} speed={0.035} opacity={0.2} />
              <Cloud position={[15, 12, 14]} scale={0.44} speed={0.04} opacity={0.18} />
            </>
          )}
        </>
      )}

      <Ground isMobile={isMobile} quality={quality} />
      <HorizonTreeLine isNight={isNight} quality={quality} ultraLow={ultraLow} />
      {/* A floresta detalhada usa meshes individuais — cara demais sem GPU;
          o anel instanciado acima já garante o horizonte fechado. */}
      {!ultraLow && budget.premiumForest && (
        <PremiumHorizonForest
          isMobile={isMobile}
          quality={quality}
          windStrength={budget.windStrength}
        />
      )}
      {/* Névoa suave só no horizonte — profundidade e sensação de floresta infinita */}
      {!ultraLow && <HorizonHaze isNight={isNight} raining={raining} twilight={twilight} />}
      {/* Trilhas de terra sinuosas entre o gramado e a floresta */}
      {!ultraLow && <WindingPaths />}
      {/* Samambaias na borda da mata */}
      {!lowQuality && <ForestFerns low={lowQuality} />}
      {!ultraLow && budget.distantWildlife && (
        <DistantWildlifeShadows isNight={isNight} isMobile={isMobile} quality={quality} />
      )}
      {!isNight && (
        <>
          {budget.rabbits >= 1 && (
            <PremiumWildlife species="rabbit" radius={11.8} speed={0.09} offset={0.4} />
          )}
          {budget.rabbits >= 2 && (
            <PremiumWildlife species="rabbit" radius={13.6} speed={0.07} offset={3.1} />
          )}
          {budget.babyRabbits >= 1 && (
            <PremiumWildlife
              species="rabbit"
              radius={12.4}
              speed={0.11}
              offset={1.8}
              scale={0.58}
            />
          )}
          {budget.babyRabbits >= 2 && (
            <PremiumWildlife species="rabbit" radius={14.1} speed={0.1} offset={4.6} scale={0.52} />
          )}
          {budget.squirrels >= 1 && (
            <PremiumWildlife species="squirrel" radius={12.2} speed={0.14} offset={0.9} />
          )}
          {budget.squirrels >= 2 && (
            <PremiumWildlife species="squirrel" radius={14.4} speed={0.12} offset={2.8} />
          )}
          {budget.squirrels >= 3 && (
            <PremiumWildlife species="squirrel" radius={15.6} speed={0.13} offset={5.2} />
          )}
          {budget.foxes >= 1 && (
            <PremiumWildlife species="fox" radius={14.8} speed={0.055} offset={2.7} />
          )}
          {budget.foxes >= 2 && (
            <PremiumWildlife species="fox" radius={16.2} speed={0.048} offset={5.4} />
          )}
          {budget.deer >= 1 && (
            <PremiumWildlife species="deer" radius={17.2} speed={0.038} offset={4.2} />
          )}
          {budget.deer >= 2 && (
            <PremiumWildlife species="deer" radius={18.4} speed={0.032} offset={1.1} />
          )}
          {budget.lizards >= 1 && (
            <GardenCritter species="lizard" radius={12.6} speed={0.16} offset={0.6} />
          )}
          {budget.lizards >= 2 && (
            <GardenCritter species="lizard" radius={14.2} speed={0.14} offset={2.9} />
          )}
          {budget.lizards >= 3 && (
            <GardenCritter species="lizard" radius={15.4} speed={0.15} offset={4.8} />
          )}
          {budget.frogs >= 1 && (
            <GardenCritter species="frog" radius={11.4} speed={0.1} offset={1.2} />
          )}
          {budget.frogs >= 2 && (
            <GardenCritter species="frog" radius={13.1} speed={0.09} offset={3.4} />
          )}
          {budget.frogs >= 3 && (
            <GardenCritter species="frog" radius={14.8} speed={0.11} offset={5.1} />
          )}
          {budget.turtles >= 1 && (
            <GardenCritter species="turtle" radius={13.8} speed={0.028} offset={2.1} />
          )}
          {budget.turtles >= 2 && (
            <GardenCritter species="turtle" radius={15.6} speed={0.024} offset={4.4} />
          )}
          {budget.hedgehogs >= 1 && (
            <GardenCritter species="hedgehog" radius={12.9} speed={0.07} offset={1.7} />
          )}
          {budget.hedgehogs >= 2 && (
            <GardenCritter species="hedgehog" radius={15.1} speed={0.065} offset={3.9} />
          )}
        </>
      )}
      {/* Corujas à noite; pica-paus e libélulas de dia */}
      {isNight && budget.owls >= 1 && (
        <GardenOwl position={[11.2, 2.85, -8.4]} offset={0.4} night />
      )}
      {isNight && budget.owls >= 2 && (
        <GardenOwl position={[-10.6, 3.1, 9.2]} offset={1.8} night />
      )}
      {!isNight && budget.woodpeckers >= 1 && (
        <GardenWoodpecker position={[9.8, 2.4, -11.2]} offset={0.3} />
      )}
      {!isNight && budget.woodpeckers >= 2 && (
        <GardenWoodpecker position={[-12.4, 2.55, 7.6]} offset={2.1} />
      )}
      {!isNight && budget.dragonflies >= 1 && (
        <GardenDragonfly radius={10.8} height={1.55} speed={0.52} offset={0.2} color="#3ecf8e" />
      )}
      {!isNight && budget.dragonflies >= 2 && (
        <GardenDragonfly radius={12.4} height={1.85} speed={0.48} offset={1.7} color="#5ad4c8" />
      )}
      {!isNight && budget.dragonflies >= 3 && (
        <GardenDragonfly radius={11.6} height={1.4} speed={0.6} offset={3.2} color="#7ae06a" />
      )}
      {!isNight && budget.dragonflies >= 4 && (
        <GardenDragonfly radius={13.5} height={2.05} speed={0.44} offset={4.6} color="#46c4a8" />
      )}
      {!isNight && budget.dragonflies >= 5 && (
        <GardenDragonfly radius={14.2} height={1.7} speed={0.56} offset={5.8} color="#62d890" />
      )}
      {/* AO suave no chão: sombra de contato mais larga e difusa.
          frames=1 grava a sombra uma vez em vez de re-renderizar todo frame. */}
      {budget.contactShadows && (
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.42}
          scale={30}
          blur={3.2}
          far={9}
          frames={1}
        />
      )}

      {/* Gramado vivo: pedras, folhas, tufos e manchas */}
      {!ultraLow && <LivingLawn low={lowQuality} />}

      {/* Flores realistas variadas: margaridas, papoulas, calêndulas, lavandas e campânulas */}
      <RealisticFlowerField low={lowQuality} isMobile={isMobile || ultraLow} />
      {/* Flores super detalhadas perto dos canteiros, balançando no vento */}
      <HeroFlowers low={lowQuality || ultraLow} />

      {/* Raios de sol atravessando as copas (dia, sem chuva) */}
      {!isNight && !raining && !lowQuality && !reduceMotion && <SunShafts solarHour={solarHour} />}

      {/* Brilho quente do sol perto do horizonte */}
      {!isNight && !raining && !ultraLow && <SunGlow position={sunPosition} twilight={twilight} />}

      {/* Pólen flutuando e poeira dourada nos feixes de luz */}
      {!isNight && !raining && !lowQuality && !reduceMotion && (
        <AmbientParticles low={lowQuality} />
      )}

      {/* Neblina rasteira em camadas — mais forte na chuva e no pós-chuva */}
      {!lowQuality && (raining || clearing || isNight) && (
        <GroundFog strength={raining ? 1.25 : clearing ? 0.9 : 0.55} isNight={isNight} />
      )}

      {/* Arco-íris discreto após a chuva */}
      {clearing && !isNight && <RainbowArc />}

      {/* Folhas caindo de vez em quando */}
      {budget.fallingLeaves > 0 && (
        <FallingLeaves count={budget.fallingLeaves} windStrength={budget.windStrength} />
      )}

      {/* Joaninhas passeando na borda dos canteiros (dia) */}
      {!isNight && budget.ladybugs > 0 && seedlings?.length ? (
        <>
          {budget.ladybugs >= 1 && (
            <Ladybug position={seedlings[0]?.position ?? [0, 0, 0]} offset={0} />
          )}
          {budget.ladybugs >= 2 && seedlings[1] && (
            <Ladybug position={seedlings[1].position} offset={1.4} />
          )}
          {budget.ladybugs >= 3 && seedlings[2] && (
            <Ladybug position={seedlings[2].position} offset={2.6} />
          )}
          {budget.ladybugs >= 4 && seedlings[3] && (
            <Ladybug position={seedlings[3].position} offset={3.8} />
          )}
          {budget.ladybugs >= 5 && seedlings[4] && (
            <Ladybug position={seedlings[4].position} offset={5.1} />
          )}
        </>
      ) : null}
      {seedlings?.length ? (
        <CommunitySeedlingPlots
          seedlings={seedlings}
          selectedSeedlingId={selectedSeedlingId}
          onSelectSeedling={onSelectSeedling}
          quality={quality}
          isMobile={isMobile}
        />
      ) : (
        <Tree
          stage={stage}
          growth={growth}
          species={selectedSeedling?.species}
          beauty={selectedSeedling?.beauty ?? 40}
          quality={quality}
          isMobile={isMobile}
        />
      )}
      <group position={selectedPosition}>
        <GardenPlants
          growth={growth}
          stage={stage}
          maxPlants={
            lowQuality ? 12 : quality === "high" ? (isMobile ? 28 : 48) : isMobile ? 22 : 36
          }
        />
      </group>

      {!isNight && (
        <ButterflyFlock
          growth={growth}
          count={bfCount}
          seeds={generationSeeds}
          departing={butterfliesLeaving}
        />
      )}
      {beesEnabled && <PremiumBeeSwarm count={budget.bees} />}
      {!isNight && !raining && (budget.birds > 0 || budget.perchedBirds > 0) && (
        <PremiumBirdFlock flyingCount={budget.birds} perchedCount={budget.perchedBirds} />
      )}

      {/* Fireflies hide while it rains and only return once the rain has passed. */}
      {isNight && !raining && (
        <>
          <Sparkles
            count={
              lowQuality ? 24 : quality === "high" ? (isMobile ? 70 : 120) : isMobile ? 50 : 90
            }
            scale={9}
            size={3.2}
            speed={0.35}
            color="#c8ff8f"
            position={[0, 1.6, 0]}
          />
          <Sparkles
            count={lowQuality ? 12 : quality === "high" ? (isMobile ? 34 : 60) : isMobile ? 24 : 45}
            scale={6}
            size={2.4}
            speed={0.28}
            color="#8fffe0"
            position={[-2, 1.1, 2]}
          />
        </>
      )}

      {raining && <Rain quality={quality} />}
      {careFx && <CareBurst key={careFxKey} kind={careFx} position={selectedPosition} />}
    </>
  );
}

/* Se a cena 3D quebrar por qualquer motivo, ela se reergue sozinha algumas
   vezes antes de mostrar um aviso — o resto do jogo (chat, botões) continua. */
class SceneCrashGuard extends Component<
  { children: ReactNode },
  { failures: number; retrying: boolean }
> {
  state = { failures: 0, retrying: false };
  private retryTimer: number | undefined;

  static getDerivedStateFromError() {
    return { retrying: true };
  }

  componentDidCatch() {
    if (this.state.failures >= 3) return;
    this.retryTimer = window.setTimeout(
      () => {
        this.setState((prev) => ({ failures: prev.failures + 1, retrying: false }));
      },
      1200 * (this.state.failures + 1),
    );
  }

  componentWillUnmount() {
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.retrying) {
      if (this.state.failures >= 3) {
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1a12] px-6 text-center">
            <p className="max-w-xs text-sm font-medium text-emerald-100">
              O gráfico 3D travou neste aparelho. Recarregue a página para tentar novamente.
            </p>
          </div>
        );
      }
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d1a12]">
          <p className="text-sm font-medium text-emerald-100/80">Recarregando o jardim…</p>
        </div>
      );
    }
    return (
      <div key={`crash-${this.state.failures}`} className="absolute inset-0">
        {this.props.children}
      </div>
    );
  }
}

export default function Scene3D({
  stage,
  growth,
  isNight,
  raining,
  clearing = false,
  reduceMotion,
  isMobile,
  careFx,
  careFxKey = 0,
  butterflySeeds,
  seedlings,
  selectedSeedlingId,
  onSelectSeedling,
  solarHour = 12,
}: Scene3DProps) {
  const [quality, setQuality] = useState<RenderQuality>(isMobile ? "low" : "balanced");
  const [qualityCeiling, setQualityCeiling] = useState<RenderQuality>(
    isMobile ? "balanced" : "high",
  );
  const [butterflyGeneration, setButterflyGeneration] = useState(0);
  const [butterfliesLeaving, setButterfliesLeaving] = useState(false);
  // null = still detecting (SSR-safe); false = no WebGL, show notice instead of
  // mounting the Canvas (a failed context makes R3F remount in a loop).
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [softwareGpu, setSoftwareGpu] = useState(false);
  /* Se a GPU derrubar o contexto (tela branca), remonta o Canvas sozinho
     com qualidade menor em vez de exigir um F5 do jogador. */
  const [contextGeneration, setContextGeneration] = useState(0);
  const recoveryTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) window.clearTimeout(recoveryTimerRef.current);
    };
  }, []);
  useEffect(() => {
    const supported = detectWebGLSupport();
    if (supported) {
      const profile = detectGardenRenderProfile(!!isMobile);
      setSoftwareGpu(profile.softwareRenderer);
      setQualityCeiling(profile.ceiling);
      setQuality(profile.initial);
    }
    setWebglSupported(supported);
  }, [isMobile]);
  useEffect(() => {
    let returnTimer: number | undefined;
    const departureTimer = window.setInterval(() => {
      setButterfliesLeaving(true);
      returnTimer = window.setTimeout(() => {
        setButterflyGeneration((generation) => generation + 1);
        setButterfliesLeaving(false);
      }, 8000);
    }, 28000);
    return () => {
      window.clearInterval(departureTimer);
      if (returnTimer) window.clearTimeout(returnTimer);
    };
  }, []);

  const communityView = !!seedlings?.length;
  const selected = seedlings?.find((item) => item.id === selectedSeedlingId);
  const focus: [number, number, number] = selected?.position ?? [0, 0, 0];
  const maturity = Math.min(1, growth / 2500);
  const cameraPosition: [number, number, number] = communityView
    ? isMobile
      ? [focus[0] + 5.8, 4.2, focus[2] + 7.2]
      : [focus[0] + 6.4, 4.6, focus[2] + 7.8]
    : isMobile
      ? [2.6 + maturity * 1.8, 1.45 + maturity * 1.5, 4 + maturity * 2.4]
      : [2.8 + maturity * 1.8, 1.55 + maturity * 1.6, 4.2 + maturity * 2.2];
  const cameraTarget: [number, number, number] = communityView
    ? [focus[0], 0.45, focus[2]]
    : [0, 0.35 + maturity * 1.25, 0];

  if (webglSupported === null) {
    return <div className="absolute inset-0 bg-[#0d1a12]" />;
  }
  if (!webglSupported) {
    return <WebGLUnavailableNotice />;
  }

  return (
    <SceneCrashGuard>
      <Canvas
        shadows={quality === "low" ? false : "soft"}
        camera={{ position: cameraPosition, fov: isMobile ? 48 : 40 }}
        dpr={
          softwareGpu
            ? 0.6
            : quality === "low"
              ? 0.85
              : quality === "high"
                ? isMobile
                  ? 1.2
                  : 1.5
                : 1.1
        }
        gl={{
          antialias: quality !== "low",
          alpha: false,
          /* Em notebooks com 2 placas, força a GPU dedicada. */
          powerPreference: "high-performance",
          stencil: false,
          failIfMajorPerformanceCaveat: false,
          /* Evita copiar o framebuffer a cada quadro — ganho importante em PCs fracos. */
          preserveDrawingBuffer: false,
        }}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
        frameloop={reduceMotion ? "demand" : "always"}
        onCreated={({ gl, scene, invalidate }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = isNight ? 1.2 : clearing ? 1.35 : raining ? 0.95 : 1.18;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(isNight ? "#071127" : raining ? "#9fb0a4" : "#a8c09a", 1);
          scene.background = new THREE.Color(isNight ? "#071127" : "#a8c09a");
          /* Recuperação de tela branca: perdeu o contexto → espera a GPU
           respirar, reduz a carga e recria o Canvas automaticamente. */
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            clearAnimalRegistry();
            if (recoveryTimerRef.current) window.clearTimeout(recoveryTimerRef.current);
            recoveryTimerRef.current = window.setTimeout(() => {
              setSoftwareGpu(true);
              setQuality((current) => lowerGardenQuality(current));
              setQualityCeiling((ceiling) =>
                ceiling === "high" ? "balanced" : lowerGardenQuality(ceiling),
              );
              setContextGeneration((generation) => generation + 1);
            }, 800);
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            invalidate();
          });
          // Kick several frames so the first paint never sticks on a blank buffer
          let n = 0;
          const kick = () => {
            invalidate();
            if (n++ < 8) requestAnimationFrame(kick);
          };
          kick();
          window.dispatchEvent(new Event("resize"));
        }}
        key={`${isNight ? "n" : "d"}-${raining ? "r" : clearing ? "c" : "f"}-g${contextGeneration}`}
      >
        <PerformanceMonitor
          /* O perfil inicial vem do hardware; o FPS real confirma e move um nível
           por vez. Assim um PC forte chega ao Máximo e um fraco permanece fluido. */
          bounds={(refreshRate) => [Math.min(28, refreshRate * 0.48), refreshRate * 0.82]}
          flipflops={8}
          ms={250}
          iterations={10}
          onIncline={() => setQuality((current) => raiseGardenQuality(current, qualityCeiling))}
          onDecline={() => setQuality((current) => lowerGardenQuality(current))}
          onFallback={() => setQuality((current) => lowerGardenQuality(current))}
        />
        <AdaptiveDpr pixelated />
        <World
          stage={stage}
          growth={growth}
          isNight={isNight}
          raining={raining}
          clearing={clearing}
          reduceMotion={reduceMotion}
          isMobile={isMobile}
          careFx={careFx}
          careFxKey={careFxKey}
          butterflySeeds={butterflySeeds}
          seedlings={seedlings}
          selectedSeedlingId={selectedSeedlingId}
          onSelectSeedling={onSelectSeedling}
          butterflyGeneration={butterflyGeneration}
          butterfliesLeaving={butterfliesLeaving}
          solarHour={solarHour}
          quality={quality}
          softwareGpu={softwareGpu}
        />
        <OrbitControls
          key={selectedSeedlingId ?? "center"}
          /* Sem inércia: a câmera para na hora em que o mouse para. */
          enableDamping={false}
          minDistance={isMobile ? 1.1 : 0.9}
          maxDistance={communityView ? 42 : 28}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minPolarAngle={0.12}
          target={cameraTarget}
          makeDefault
          rotateSpeed={isMobile ? 0.75 : 0.95}
          zoomSpeed={isMobile ? 0.8 : 1.05}
          panSpeed={0.7}
          enablePan
          regress
          /* Física da câmera: o pan não atravessa o chão nem sai do jardim. */
          onChange={(event) => {
            const controls = event?.target;
            if (!controls) return;
            const target = controls.target;
            target.y = THREE.MathUtils.clamp(target.y, 0.15, 7);
            const reach = communityView ? 14 : 7;
            const horizontal = Math.hypot(target.x, target.z);
            if (horizontal > reach) {
              const scale = reach / horizontal;
              target.x *= scale;
              target.z *= scale;
            }
            const camera = controls.object;
            if (camera.position.y < 0.4) camera.position.y = 0.4;
          }}
        />
      </Canvas>
    </SceneCrashGuard>
  );
}
