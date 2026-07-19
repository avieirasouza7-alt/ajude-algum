import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Stage } from "@/lib/growthConfig";
import { gardenDensity } from "@/lib/growthConfig";

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GardenPlantKind = "flower" | "bush" | "sapling" | "fern" | "wildflower";

export type GardenPlantSpec = {
  id: string;
  kind: GardenPlantKind;
  position: [number, number, number];
  scale: number;
  color: string;
  accent: string;
  unlockAt: number;
  sway: number;
};

const FLOWER_COLORS = ["#ff9ecb", "#ffd28f", "#c58fff", "#8fffc5", "#ff8f8f", "#fff5a8", "#a8d4ff"];
const BUSH_COLORS = ["#3d8b4a", "#2f6b3a", "#4a9e58", "#286038"];
const FERN_COLORS = ["#2d6a3e", "#3a7d4a"];

export function buildGardenPlants(growth: number): GardenPlantSpec[] {
  if (growth < 120) return [];
  const dens = gardenDensity(growth);
  const total = Math.floor(2 + dens * 38);
  const rnd = mulberry32(42);
  const plants: GardenPlantSpec[] = [];

  for (let i = 0; i < total; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 1.4 + rnd() * (4 + dens * 8);
    // Keep clear of the main tree trunk
    if (r < 1.2) continue;
    const unlockAt = 120 + (i / Math.max(1, total - 1)) * 2380 * 0.92;
    const roll = rnd();
    let kind: GardenPlantKind = "wildflower";
    if (roll < 0.28) kind = "flower";
    else if (roll < 0.5) kind = "fern";
    else if (roll < 0.72) kind = "bush";
    else if (roll < 0.88) kind = "sapling";

    const color =
      kind === "bush" || kind === "sapling" || kind === "fern"
        ? (kind === "fern" ? FERN_COLORS : BUSH_COLORS)[Math.floor(rnd() * 4) % 4]
        : FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];

    plants.push({
      id: `gp-${i}`,
      kind,
      position: [Math.cos(a) * r, 0, Math.sin(a) * r],
      scale: 0.55 + rnd() * 0.7,
      color,
      accent: FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)],
      unlockAt,
      sway: 0.4 + rnd() * 0.8,
    });
  }
  return plants.filter((p) => growth >= p.unlockAt);
}

function Flower({ spec }: { spec: GardenPlantSpec }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(s.clock.elapsedTime * spec.sway) * 0.08;
  });
  return (
    <group ref={ref} position={spec.position} scale={spec.scale}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.24, 6]} />
        <meshStandardMaterial color="#2d6a3e" roughness={0.9} />
      </mesh>
      {[0, 72, 144, 216, 288].map((d) => {
        const rad = (d * Math.PI) / 180;
        return (
          <mesh key={d} position={[Math.cos(rad) * 0.05, 0.26, Math.sin(rad) * 0.05]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={spec.color} roughness={0.55} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshStandardMaterial
          color={spec.accent}
          emissive={spec.accent}
          emissiveIntensity={0.2}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function Bush({ spec }: { spec: GardenPlantSpec }) {
  const blobs = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return {
          p: [Math.cos(a) * 0.12, 0.15 + (i % 2) * 0.08, Math.sin(a) * 0.12] as [
            number,
            number,
            number,
          ],
          r: 0.14 + (i % 3) * 0.03,
        };
      }),
    [],
  );
  return (
    <group position={spec.position} scale={spec.scale}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <sphereGeometry args={[b.r, 12, 10]} />
          <meshStandardMaterial color={spec.color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Sapling({ spec }: { spec: GardenPlantSpec }) {
  return (
    <group position={spec.position} scale={spec.scale * 0.85}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.04, 0.7, 8]} />
        <meshStandardMaterial color="#5a3a1e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.28, 14, 12]} />
        <meshStandardMaterial color={spec.color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.15, 0.65, 0.08]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={spec.color} roughness={0.85} />
      </mesh>
      <mesh position={[0.14, 0.68, -0.06]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color={spec.accent} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Fern({ spec }: { spec: GardenPlantSpec }) {
  const fronds = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return { a, lean: 0.35 + (i % 3) * 0.1 };
      }),
    [],
  );
  return (
    <group position={spec.position} scale={spec.scale}>
      {fronds.map((f, i) => (
        <mesh
          key={i}
          position={[Math.cos(f.a) * 0.05, 0.2, Math.sin(f.a) * 0.05]}
          rotation={[f.lean, f.a, 0]}
        >
          <coneGeometry args={[0.08, 0.35, 6]} />
          <meshStandardMaterial color={spec.color} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Wildflower({ spec }: { spec: GardenPlantSpec }) {
  return (
    <group position={spec.position} scale={spec.scale * 0.7}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.16, 5]} />
        <meshStandardMaterial color="#3a7d4a" />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={spec.color} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function GardenPlants({
  growth,
  maxPlants,
}: {
  growth: number;
  stage: Stage;
  maxPlants?: number;
}) {
  // Step growth so the plant list is not rebuilt every tick
  const stepped = Math.floor(growth / 15) * 15;
  const plants = useMemo(() => buildGardenPlants(stepped), [stepped]);
  const visiblePlants = maxPlants ? plants.slice(0, maxPlants) : plants;
  return (
    <group>
      {visiblePlants.map((p) => {
        if (p.kind === "flower") return <Flower key={p.id} spec={p} />;
        if (p.kind === "bush") return <Bush key={p.id} spec={p} />;
        if (p.kind === "sapling") return <Sapling key={p.id} spec={p} />;
        if (p.kind === "fern") return <Fern key={p.id} spec={p} />;
        return <Wildflower key={p.id} spec={p} />;
      })}
    </group>
  );
}
