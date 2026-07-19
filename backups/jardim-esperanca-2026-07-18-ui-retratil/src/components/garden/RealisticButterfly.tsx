import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clampFlight } from "@/lib/gardenPhysics";

export type ButterflySpecies =
  | "morpho"
  | "monarch"
  | "swallowtail"
  | "violet"
  | "cabbage"
  | "painted"
  | "glasswing"
  | "sunset"
  | "emerald"
  | "crimson"
  | "azure"
  | "golden";

const SPECIES_PALETTE: Record<
  ButterflySpecies,
  { primary: string; secondary: string; accent: string; body: string; emissive: number }
> = {
  morpho: {
    primary: "#1a5cff",
    secondary: "#7eb6ff",
    accent: "#0a2a8a",
    body: "#1a1a22",
    emissive: 0.35,
  },
  monarch: {
    primary: "#f07520",
    secondary: "#ffc14a",
    accent: "#2a1810",
    body: "#1a1208",
    emissive: 0.12,
  },
  swallowtail: {
    primary: "#f5e04a",
    secondary: "#111111",
    accent: "#f5e04a",
    body: "#1a1a10",
    emissive: 0.08,
  },
  violet: {
    primary: "#7b3fe4",
    secondary: "#d4a5ff",
    accent: "#2e1065",
    body: "#1a1020",
    emissive: 0.22,
  },
  cabbage: {
    primary: "#f4f6f0",
    secondary: "#d8e0c8",
    accent: "#2a4a20",
    body: "#2a2a22",
    emissive: 0.05,
  },
  painted: {
    primary: "#e84545",
    secondary: "#2a6cff",
    accent: "#f5d76e",
    body: "#1a1010",
    emissive: 0.15,
  },
  glasswing: {
    primary: "#c8e8ff",
    secondary: "#e8fff8",
    accent: "#88aacc",
    body: "#334455",
    emissive: 0.18,
  },
  sunset: {
    primary: "#ff6b4a",
    secondary: "#ffb347",
    accent: "#8b2252",
    body: "#2a1510",
    emissive: 0.2,
  },
  emerald: {
    primary: "#1db954",
    secondary: "#a8ffce",
    accent: "#0a4a28",
    body: "#0a2010",
    emissive: 0.25,
  },
  crimson: {
    primary: "#c41e3a",
    secondary: "#ff6b8a",
    accent: "#3a0a12",
    body: "#1a0808",
    emissive: 0.18,
  },
  azure: {
    primary: "#4fc3f7",
    secondary: "#e1f5fe",
    accent: "#01579b",
    body: "#0a1520",
    emissive: 0.28,
  },
  golden: {
    primary: "#ffd700",
    secondary: "#fff8dc",
    accent: "#b8860b",
    body: "#2a2008",
    emissive: 0.3,
  },
};

const SPECIES_LIST = Object.keys(SPECIES_PALETTE) as ButterflySpecies[];

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ButterflyDNA = {
  seed: number;
  species: ButterflySpecies;
  scale: number;
  flapSpeed: number;
  orbitRadius: number;
  orbitSpeed: number;
  height: number;
  heightAmp: number;
  offset: number;
  spotCount: number;
  wingAspect: number;
};

export function makeButterflyDNA(seed: number): ButterflyDNA {
  const rnd = mulberry32(seed >>> 0);
  const species = SPECIES_LIST[Math.floor(rnd() * SPECIES_LIST.length)];
  return {
    seed,
    species,
    scale: 0.2 + rnd() * 0.14,
    flapSpeed: 9 + rnd() * 5,
    orbitRadius: 1.25 + rnd() * 1.65,
    orbitSpeed: 0.16 + rnd() * 0.25,
    height: 0.55 + rnd() * 1.45,
    heightAmp: 0.08 + rnd() * 0.2,
    offset: rnd() * Math.PI * 2,
    spotCount: 2 + Math.floor(rnd() * 5),
    wingAspect: 0.85 + rnd() * 0.35,
  };
}

function WingMesh({
  side,
  dna,
  meshRef,
}: {
  side: "left" | "right";
  dna: ButterflyDNA;
  meshRef: RefObject<THREE.Group | null>;
}) {
  const pal = SPECIES_PALETTE[dna.species];
  const sign = side === "left" ? 1 : -1;
  const wingScale = dna.wingAspect;

  const { forewing, hindwing } = useMemo(() => {
    const fore = new THREE.Shape();
    fore.moveTo(0, 0);
    fore.bezierCurveTo(
      sign * 0.11,
      0.02,
      sign * 0.34 * wingScale,
      0.12,
      sign * 0.39 * wingScale,
      0.31,
    );
    fore.bezierCurveTo(sign * 0.28 * wingScale, 0.43, sign * 0.08, 0.28, 0, 0);

    const hind = new THREE.Shape();
    hind.moveTo(0, 0);
    hind.bezierCurveTo(
      sign * 0.1,
      -0.01,
      sign * 0.3 * wingScale,
      -0.12,
      sign * 0.3 * wingScale,
      -0.3,
    );
    hind.bezierCurveTo(sign * 0.16, -0.34, sign * 0.04, -0.18, 0, 0);
    return { forewing: fore, hindwing: hind };
  }, [sign, wingScale]);

  const spots = useMemo(() => {
    const rnd = mulberry32(dna.seed + (side === "left" ? 17 : 91));
    return Array.from({ length: dna.spotCount }).map((_, i) => ({
      x: (0.12 + rnd() * 0.16) * sign * wingScale,
      y: i % 3 === 0 ? -(0.06 + rnd() * 0.18) : 0.03 + rnd() * 0.22,
      r: 0.009 + rnd() * 0.015,
      c: i % 2 === 0 ? pal.accent : "#fafafa",
    }));
  }, [dna.seed, dna.spotCount, pal.accent, side, sign, wingScale]);

  return (
    <group ref={meshRef} position={[sign * 0.018, 0, 0]}>
      {/* Dark scales around the wing margins */}
      <mesh position={[0, 0.01, -0.012]} scale={1.055}>
        <shapeGeometry args={[forewing, 20]} />
        <meshStandardMaterial color={pal.accent} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.005, -0.016]} scale={1.055}>
        <shapeGeometry args={[hindwing, 18]} />
        <meshStandardMaterial color={pal.accent} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {/* Forewing */}
      <mesh position={[0, 0.01, 0]} castShadow>
        <shapeGeometry args={[forewing, 20]} />
        <meshPhysicalMaterial
          color={pal.primary}
          side={THREE.DoubleSide}
          roughness={0.58}
          metalness={0}
          sheen={0.45}
          sheenColor={pal.secondary}
          sheenRoughness={0.38}
          emissive={pal.primary}
          emissiveIntensity={pal.emissive * 0.18}
          transparent={dna.species === "glasswing"}
          opacity={dna.species === "glasswing" ? 0.42 : 0.96}
        />
      </mesh>
      {/* Hindwing */}
      <mesh position={[0, -0.005, -0.006]} castShadow>
        <shapeGeometry args={[hindwing, 18]} />
        <meshPhysicalMaterial
          color={pal.secondary}
          side={THREE.DoubleSide}
          roughness={0.62}
          metalness={0}
          sheen={0.35}
          sheenColor={pal.primary}
          emissive={pal.secondary}
          emissiveIntensity={pal.emissive * 0.1}
          transparent={dna.species === "glasswing"}
          opacity={dna.species === "glasswing" ? 0.36 : 0.96}
        />
      </mesh>
      {/* Spots */}
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0.008]}>
          <circleGeometry args={[s.r, 10]} />
          <meshStandardMaterial color={s.c} side={THREE.DoubleSide} roughness={0.7} />
        </mesh>
      ))}
      {/* Wing veins */}
      {[0.08, 0.15, 0.22].map((x, i) => (
        <mesh
          key={`vein-${i}`}
          position={[sign * x * wingScale, 0.105 + i * 0.025, 0.009]}
          rotation={[0, 0, sign * (-0.32 + i * 0.2)]}
        >
          <planeGeometry args={[0.003, 0.19]} />
          <meshBasicMaterial
            color={pal.accent}
            side={THREE.DoubleSide}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}

export function RealisticButterfly({
  dna,
  departing = false,
}: {
  dna: ButterflyDNA;
  departing?: boolean;
}) {
  const grp = useRef<THREE.Group>(null!);
  const left = useRef<THREE.Group>(null!);
  const right = useRef<THREE.Group>(null!);
  const departure = useRef(0);
  const pal = SPECIES_PALETTE[dna.species];

  useFrame((state, delta) => {
    departure.current = THREE.MathUtils.damp(
      departure.current,
      departing ? 1 : 0,
      departing ? 0.75 : 4,
      delta,
    );
    const leaving = departure.current;
    const t = state.clock.elapsedTime * dna.orbitSpeed + dna.offset;
    if (grp.current) {
      const flightRadius = dna.orbitRadius + leaving * 15;
      let x = Math.cos(t) * flightRadius + Math.sin(t * 0.37) * 0.25;
      let z = Math.sin(t) * flightRadius * 0.85 + Math.cos(t * 0.29) * 0.22;
      let y = dna.height + Math.sin(t * 2.1) * dna.heightAmp + leaving * 7;
      // Never fly through the ground or through seedling stems
      const safe = clampFlight(x, y, z, Math.max(0.55, dna.height * 0.55));
      x = safe.x;
      y = safe.y;
      z = safe.z;
      grp.current.position.set(x, y, z);
      const look = Math.atan2(
        Math.cos(t + 0.05) * dna.orbitRadius - x,
        Math.sin(t + 0.05) * dna.orbitRadius * 0.85 - z,
      );
      grp.current.rotation.y = look + Math.PI;
      grp.current.rotation.z = Math.sin(t * 1.5) * 0.07;
    }
    const flap = 0.2 + Math.sin(state.clock.elapsedTime * dna.flapSpeed + dna.offset) * 0.72;
    if (left.current) left.current.rotation.y = flap;
    if (right.current) right.current.rotation.y = -flap;
  });

  return (
    <group ref={grp} scale={dna.scale}>
      {/* Body */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.018, 0.11, 5, 10]} />
        <meshStandardMaterial color={pal.body} roughness={0.88} />
      </mesh>
      {/* Fuzzy thorax and segmented abdomen improve the silhouette up close. */}
      <mesh position={[0, 0, 0.012]} scale={[0.75, 0.9, 1.15]}>
        <sphereGeometry args={[0.026, 10, 8]} />
        <meshPhysicalMaterial
          color={pal.body}
          roughness={0.96}
          sheen={0.22}
          sheenColor={pal.secondary}
        />
      </mesh>
      {[-0.035, -0.005, 0.025].map((z) => (
        <mesh key={z} position={[0, -0.001, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.0185, 0.0022, 5, 10]} />
          <meshStandardMaterial color={pal.secondary} roughness={0.8} />
        </mesh>
      ))}
      {/* Head */}
      <mesh position={[0, 0, 0.085]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshStandardMaterial color={pal.body} roughness={0.82} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.014, 0.006, 0.102]}>
          <sphereGeometry args={[0.006, 7, 6]} />
          <meshPhysicalMaterial color="#070707" roughness={0.2} clearcoat={0.8} />
        </mesh>
      ))}
      {/* Antennae */}
      <mesh position={[0.016, 0.018, 0.115]} rotation={[0.75, 0, -0.26]}>
        <cylinderGeometry args={[0.0015, 0.002, 0.08, 5]} />
        <meshStandardMaterial color={pal.body} />
      </mesh>
      <mesh position={[-0.016, 0.018, 0.115]} rotation={[0.75, 0, 0.26]}>
        <cylinderGeometry args={[0.0015, 0.002, 0.08, 5]} />
        <meshStandardMaterial color={pal.body} />
      </mesh>
      <WingMesh side="left" dna={dna} meshRef={left} />
      <WingMesh side="right" dna={dna} meshRef={right} />
    </group>
  );
}

export function ButterflyFlock({
  growth,
  count,
  seeds,
  departing,
}: {
  growth: number;
  count: number;
  seeds?: number[];
  departing?: boolean;
}) {
  const list = useMemo(() => {
    const arr: ButterflyDNA[] = [];
    for (let i = 0; i < count; i++) {
      const seed = seeds?.[i] ?? Math.floor(1000 + growth * 7 + i * 9973);
      arr.push(makeButterflyDNA(seed));
    }
    return arr;
  }, [count, growth, seeds]);

  if (count <= 0) return null;
  return (
    <group>
      {list.map((dna) => (
        <RealisticButterfly key={dna.seed} dna={dna} departing={departing} />
      ))}
    </group>
  );
}
