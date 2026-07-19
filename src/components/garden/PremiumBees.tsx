import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clampFlight } from "@/lib/gardenPhysics";

const FLOWER_TARGETS: [number, number, number][] = [
  [0, 1.15, 0],
  [-5, 1.05, -5],
  [5, 1.1, -5],
  [-5, 1.0, 5],
  [5, 1.08, 5],
  [-2.4, 0.95, 3.2],
  [3.1, 1.0, -2.6],
  [1.8, 0.92, 4.4],
];

type BeeProps = {
  offset: number;
  homeIndex: number;
};

function PremiumBee({ offset, homeIndex }: BeeProps) {
  const grp = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Mesh>(null!);
  const wingR = useRef<THREE.Mesh>(null!);
  const targetIdx = useRef(homeIndex % FLOWER_TARGETS.length);
  const nextSwitch = useRef(2 + offset);
  const pollinatingUntil = useRef(0);
  const pos = useRef({
    x: FLOWER_TARGETS[homeIndex % FLOWER_TARGETS.length][0],
    y: FLOWER_TARGETS[homeIndex % FLOWER_TARGETS.length][1],
    z: FLOWER_TARGETS[homeIndex % FLOWER_TARGETS.length][2],
  });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);

    if (t >= nextSwitch.current) {
      if (t < pollinatingUntil.current) {
        // Continua polinizando
      } else if (pollinatingUntil.current === 0 || t >= pollinatingUntil.current) {
        if (Math.random() < 0.35) {
          pollinatingUntil.current = t + 1.2 + Math.random() * 1.8;
          nextSwitch.current = pollinatingUntil.current + 0.2;
        } else {
          targetIdx.current = Math.floor(Math.random() * FLOWER_TARGETS.length);
          nextSwitch.current = t + 2.5 + Math.random() * 4;
          pollinatingUntil.current = 0;
        }
      }
    }

    const target = FLOWER_TARGETS[targetIdx.current];
    const hovering = t < pollinatingUntil.current;
    const bob = hovering
      ? 0.04 + Math.sin(t * 14 + offset) * 0.025
      : 0.12 + Math.sin(t * 9 + offset) * 0.08;
    const jitterX = Math.sin(t * 3.1 + offset) * (hovering ? 0.08 : 0.22);
    const jitterZ = Math.cos(t * 2.7 + offset * 1.3) * (hovering ? 0.08 : 0.22);

    const goalX = target[0] + jitterX;
    const goalY = target[1] + bob;
    const goalZ = target[2] + jitterZ;
    const chase = hovering ? 2.8 : 1.6;
    pos.current.x = THREE.MathUtils.damp(pos.current.x, goalX, chase, dt);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, goalY, chase * 1.2, dt);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, goalZ, chase, dt);

    const safe = clampFlight(pos.current.x, pos.current.y, pos.current.z, 0.85);
    if (grp.current) {
      grp.current.position.set(safe.x, safe.y, safe.z);
      const dx = goalX - pos.current.x;
      const dz = goalZ - pos.current.z;
      if (dx * dx + dz * dz > 0.0004) {
        grp.current.rotation.y = Math.atan2(dx, dz);
      }
      grp.current.rotation.x = Math.sin(t * 6 + offset) * 0.08;
    }

    const flap = Math.sin(t * 55 + offset) * 0.55;
    if (wingL.current) wingL.current.rotation.z = 0.35 + flap;
    if (wingR.current) wingR.current.rotation.z = -0.35 - flap;
  });

  return (
    <group ref={grp} scale={0.85}>
      {/* Abdômen amarelo com listras pretas */}
      <mesh castShadow>
        <capsuleGeometry args={[0.045, 0.08, 6, 10]} />
        <meshStandardMaterial color="#f0c41a" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, -0.02]} scale={[1.05, 1.05, 0.35]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color="#1a140e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.035]} scale={[1.05, 1.05, 0.28]}>
        <sphereGeometry args={[0.048, 10, 8]} />
        <meshStandardMaterial color="#1a140e" roughness={0.7} />
      </mesh>
      {/* Cabeça */}
      <mesh position={[0, 0.01, 0.08]}>
        <sphereGeometry args={[0.038, 10, 8]} />
        <meshStandardMaterial color="#2a2218" roughness={0.65} />
      </mesh>
      {/* Asas translúcidas */}
      <mesh
        ref={wingL}
        position={[-0.02, 0.04, 0.01]}
        rotation={[0.2, 0.15, 0.4]}
        scale={[1, 0.08, 0.55]}
      >
        <planeGeometry args={[0.12, 0.07]} />
        <meshPhysicalMaterial
          color="#f5f8ff"
          transparent
          opacity={0.45}
          roughness={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={wingR}
        position={[0.02, 0.04, 0.01]}
        rotation={[0.2, -0.15, -0.4]}
        scale={[1, 0.08, 0.55]}
      >
        <planeGeometry args={[0.12, 0.07]} />
        <meshPhysicalMaterial
          color="#f5f8ff"
          transparent
          opacity={0.45}
          roughness={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function PremiumBeeSwarm({ count }: { count: number }) {
  const bees = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        offset: i * 1.7 + 0.3,
        homeIndex: i,
      })),
    [count],
  );

  if (count <= 0) return null;
  return (
    <group>
      {bees.map((bee, i) => (
        <PremiumBee key={`bee-${i}`} {...bee} />
      ))}
    </group>
  );
}
