import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clampFlight } from "@/lib/gardenPhysics";

const BIRD_PALETTES = [
  { body: "#4a5568", belly: "#c9b8a0", beak: "#e8a13a" },
  { body: "#5b4636", belly: "#d4c2ab", beak: "#d9893a" },
  { body: "#3b4a5a", belly: "#b8c4ce", beak: "#e0a040" },
  { body: "#6b5a44", belly: "#e2d2b8", beak: "#c97a2e" },
  { body: "#2f4a3a", belly: "#c5d4b8", beak: "#e8b050" },
];

type FlyingBirdProps = {
  radius: number;
  height: number;
  speed: number;
  offset: number;
  paletteIndex?: number;
};

export function PremiumFlyingBird({
  radius,
  height,
  speed,
  offset,
  paletteIndex = 0,
}: FlyingBirdProps) {
  const grp = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);
  const palette = BIRD_PALETTES[paletteIndex % BIRD_PALETTES.length];
  const cruiseHeight = Math.max(height, 5.2);

  useFrame((state, delta) => {
    const rawT = state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);
    const t = rawT * speed + offset;
    const wanderR = radius + Math.sin(t * 0.31 + offset * 2) * 2.4 + Math.sin(t * 0.11) * 1.1;
    if (grp.current) {
      const rawY =
        cruiseHeight +
        Math.sin(t * 0.7) * 0.4 +
        Math.sin(t * 0.23) * 0.45 +
        Math.sin(t * 1.7) * 0.18;
      const safe = clampFlight(
        Math.cos(t) * wanderR,
        rawY,
        Math.sin(t * 0.92) * wanderR * 0.84,
        cruiseHeight - 0.25,
      );
      grp.current.position.set(safe.x, safe.y, safe.z);
      grp.current.rotation.y = -t;
      grp.current.rotation.z = Math.sin(t) * 0.14;
      grp.current.rotation.x = Math.sin(t * 0.9) * 0.07;
    }
    const flapCycle = (rawT * 0.28 + offset) % 1;
    const gliding = flapCycle > 0.52;
    const flapTarget = gliding
      ? 0.1 + Math.sin(rawT * 1.2 + offset) * 0.04
      : Math.sin(rawT * 10 + offset) * 0.75 - 0.12;
    if (wingL.current) {
      wingL.current.rotation.z = THREE.MathUtils.damp(
        wingL.current.rotation.z,
        flapTarget,
        gliding ? 4 : 24,
        dt,
      );
      if (wingR.current) wingR.current.rotation.z = -wingL.current.rotation.z;
    }
  });

  return (
    <group ref={grp} scale={0.95}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.72, 1.55, 0.72]} castShadow>
        <sphereGeometry args={[0.09, 12, 9]} />
        <meshStandardMaterial color={palette.body} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.01, 0.04]} scale={[0.55, 0.7, 0.65]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color={palette.belly} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.03, 0.15]} castShadow>
        <sphereGeometry args={[0.062, 12, 9]} />
        <meshStandardMaterial color={palette.body} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.025, 0.225]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.02, 0.075, 6]} />
        <meshStandardMaterial color={palette.beak} roughness={0.45} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.032, 0.045, 0.17]}>
          <sphereGeometry args={[0.009, 6, 5]} />
          <meshBasicMaterial color="#1a120e" />
        </mesh>
      ))}
      <mesh position={[0, 0.01, -0.19]} rotation={[Math.PI / 2.2, 0, 0]} scale={[1.55, 1, 0.28]}>
        <coneGeometry args={[0.05, 0.15, 6]} />
        <meshStandardMaterial color={palette.body} roughness={0.85} />
      </mesh>
      <group ref={wingL} position={[-0.03, 0.02, 0]}>
        <mesh position={[-0.15, 0, -0.02]} rotation={[0, 0.22, 0]} scale={[1, 0.1, 0.52]} castShadow>
          <boxGeometry args={[0.32, 0.018, 0.17]} />
          <meshStandardMaterial color={palette.body} roughness={0.82} />
        </mesh>
      </group>
      <group ref={wingR} position={[0.03, 0.02, 0]}>
        <mesh position={[0.15, 0, -0.02]} rotation={[0, -0.22, 0]} scale={[1, 0.1, 0.52]} castShadow>
          <boxGeometry args={[0.32, 0.018, 0.17]} />
          <meshStandardMaterial color={palette.body} roughness={0.82} />
        </mesh>
      </group>
    </group>
  );
}

type PerchedBirdProps = {
  position: [number, number, number];
  offset?: number;
  color?: string;
};

export function PremiumPerchedBird({
  position,
  offset = 0,
  color = "#5b4636",
}: PerchedBirdProps) {
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const nextHeadMove = useRef(offset * 0.3);
  const headTarget = useRef(0);
  const nextHop = useRef(2 + offset);
  const hopStartedAt = useRef(-1);
  const nextTailFlick = useRef(1 + offset * 0.4);
  const tailFlick = useRef(0);
  const tail = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + offset;
    const dt = Math.min(0.05, delta);
    if (t >= nextHeadMove.current) {
      headTarget.current = (Math.random() - 0.5) * 1.65;
      nextHeadMove.current = t + 0.45 + Math.random() * 2.4;
    }
    if (t >= nextHop.current && hopStartedAt.current < 0) {
      hopStartedAt.current = t;
      nextHop.current = t + 3.5 + Math.random() * 7;
    }
    if (t >= nextTailFlick.current) {
      tailFlick.current = 1;
      nextTailFlick.current = t + 1.2 + Math.random() * 4;
    }
    tailFlick.current = THREE.MathUtils.damp(tailFlick.current, 0, 6, dt);

    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.damp(
        head.current.rotation.y,
        headTarget.current,
        13,
        dt,
      );
      head.current.rotation.x = THREE.MathUtils.damp(
        head.current.rotation.x,
        Math.sin(t * 0.31) * 0.07,
        5,
        dt,
      );
    }
    if (body.current) {
      let hop = 0;
      if (hopStartedAt.current >= 0) {
        const progress = (t - hopStartedAt.current) / 0.34;
        if (progress >= 1) hopStartedAt.current = -1;
        else hop = Math.sin(progress * Math.PI);
      }
      body.current.position.y = position[1] + hop * 0.045;
      body.current.rotation.z = THREE.MathUtils.damp(
        body.current.rotation.z,
        headTarget.current * -0.018,
        4,
        dt,
      );
    }
    if (tail.current) {
      tail.current.rotation.x = THREE.MathUtils.damp(
        tail.current.rotation.x,
        Math.PI / 2.4 - tailFlick.current * 0.42,
        12,
        dt,
      );
    }
  });

  return (
    <group ref={body} position={position} rotation={[0, offset * 2.1, 0]} scale={0.78}>
      <mesh rotation={[Math.PI / 2.6, 0, 0]} scale={[0.72, 1.25, 0.78]} castShadow>
        <sphereGeometry args={[0.085, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <group ref={head} position={[0, 0.09, 0.08]}>
        <mesh>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.018, 0.055, 6]} />
          <meshStandardMaterial color="#e8a13a" roughness={0.5} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.03, 0.015, 0.045]}>
            <sphereGeometry args={[0.008, 6, 4]} />
            <meshBasicMaterial color="#1c1410" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, -0.01, 0.055]} scale={[0.55, 0.8, 0.5]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color="#c9a97a" roughness={0.9} />
      </mesh>
      <mesh
        ref={tail}
        position={[0, 0.015, -0.13]}
        rotation={[Math.PI / 2.4, 0, 0]}
        scale={[1.5, 1, 0.28]}
      >
        <coneGeometry args={[0.04, 0.13, 6]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

const PERCH_SPOTS: Array<{ position: [number, number, number]; color: string; offset: number }> = [
  { position: [7.2, 0.24, -9.55], color: "#5b4636", offset: 0.6 },
  { position: [-9.55, 0.24, 4.4], color: "#43586b", offset: 3.4 },
  { position: [9.4, 0.24, 6.8], color: "#4a5a3a", offset: 5.1 },
];

export function PremiumBirdFlock({
  flyingCount,
  perchedCount,
}: {
  flyingCount: number;
  perchedCount: number;
}) {
  const flying = useMemo(
    () =>
      Array.from({ length: flyingCount }, (_, i) => ({
        radius: 6.5 + i * 1.35,
        height: 4.1 + (i % 3) * 0.55,
        speed: 0.12 + (i % 4) * 0.035,
        offset: i * 2.35 + 0.4,
        paletteIndex: i,
      })),
    [flyingCount],
  );

  return (
    <group>
      {flying.map((bird, i) => (
        <PremiumFlyingBird key={`fly-${i}`} {...bird} />
      ))}
      {PERCH_SPOTS.slice(0, perchedCount).map((spot, i) => (
        <PremiumPerchedBird key={`perch-${i}`} {...spot} />
      ))}
    </group>
  );
}
