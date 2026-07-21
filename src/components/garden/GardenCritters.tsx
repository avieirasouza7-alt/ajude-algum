import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  bodyRadiusFor,
  clampFlight,
  groundYFor,
  registerAnimal,
  resolveStatic,
  separateFromAnimals,
  unregisterAnimal,
} from "@/lib/gardenPhysics";

export type CritterSpecies = "lizard" | "frog" | "turtle" | "hedgehog";

type WalkerProps = {
  species: CritterSpecies;
  radius: number;
  speed: number;
  offset: number;
  scale?: number;
};

type Phase = "walk" | "idle" | "look" | "sit" | "hop";

function SoftShadow({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 16]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

function LizardModel() {
  return (
    <group scale={0.55}>
      <mesh scale={[1.8, 0.45, 0.55]} castShadow>
        <capsuleGeometry args={[0.12, 0.35, 4, 8]} />
        <meshStandardMaterial color="#6a9a4a" roughness={0.55} />
      </mesh>
      <mesh position={[0.42, 0.06, 0]} scale={[1.1, 0.7, 0.85]} castShadow>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color="#5d8c42" roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.48, 0.1, s * 0.07]}>
          <sphereGeometry args={[0.022, 6, 5]} />
          <meshStandardMaterial color="#101810" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.55, 0.02, 0]} rotation={[0, 0, 0.2]} scale={[0.35, 0.18, 0.18]} castShadow>
        <capsuleGeometry args={[0.08, 0.55, 3, 6]} />
        <meshStandardMaterial color="#7aad58" roughness={0.6} />
      </mesh>
      {[
        [0.2, -1],
        [0.2, 1],
        [-0.15, -1],
        [-0.15, 1],
      ].map(([z, side], i) => (
        <mesh
          key={i}
          position={[z, -0.08, side * 0.16]}
          rotation={[0.4, 0, side * 0.35]}
          scale={[0.35, 0.12, 0.55]}
        >
          <capsuleGeometry args={[0.04, 0.12, 3, 5]} />
          <meshStandardMaterial color="#4f7a38" roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function FrogModel() {
  return (
    <group scale={0.62}>
      <mesh scale={[1.15, 0.7, 1]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#4f8f45" roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.02, 0.02]} scale={[0.85, 0.55, 0.8]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#c8d98a" roughness={0.55} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.12, 0.16, s * 0.14]}>
          <mesh>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#3f7a38" roughness={0.4} />
          </mesh>
          <mesh position={[0.04, 0.02, 0]}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshStandardMaterial color="#111" roughness={0.25} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`leg-${s}`}
          position={[-0.08, -0.1, s * 0.16]}
          rotation={[0.2, 0, s * 0.5]}
          scale={[0.45, 0.2, 0.7]}
          castShadow
        >
          <capsuleGeometry args={[0.06, 0.18, 3, 6]} />
          <meshStandardMaterial color="#3d6f36" roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`arm-${s}`} position={[0.14, -0.08, s * 0.14]} rotation={[0.3, 0, s * -0.4]}>
          <capsuleGeometry args={[0.035, 0.1, 3, 5]} />
          <meshStandardMaterial color="#3d6f36" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function TurtleModel() {
  return (
    <group scale={0.7}>
      <mesh position={[0, 0.08, 0]} scale={[1.15, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.28, 14, 10]} />
        <meshStandardMaterial color="#5a7048" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.14, 0]} scale={[0.85, 0.35, 0.75]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#6f8558" roughness={0.9} />
      </mesh>
      <mesh position={[0.32, 0.04, 0]} castShadow>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#7a8f55" roughness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.38, 0.08, s * 0.06]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#1a1a12" />
        </mesh>
      ))}
      {[
        [0.12, 0.16],
        [0.12, -0.16],
        [-0.14, 0.16],
        [-0.14, -0.16],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.02, z]} scale={[0.55, 0.25, 0.4]} castShadow>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#6a7a4a" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-0.3, 0.02, 0]} rotation={[0, 0, 0.4]} scale={[0.25, 0.12, 0.12]}>
        <capsuleGeometry args={[0.05, 0.12, 3, 5]} />
        <meshStandardMaterial color="#5f7048" roughness={0.75} />
      </mesh>
    </group>
  );
}

function HedgehogModel() {
  return (
    <group scale={0.58}>
      <mesh scale={[1.2, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.28, 14, 12]} />
        <meshStandardMaterial color="#6b5540" roughness={1} />
      </mesh>
      {/* Spines as short cones */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const elev = 0.35 + (i % 3) * 0.12;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.18, 0.12 + Math.sin(elev) * 0.08, Math.sin(a) * 0.16]}
            rotation={[0.6, a, 0]}
            scale={[0.35, 1, 0.35]}
          >
            <coneGeometry args={[0.04, 0.14, 4]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0.26, 0.02, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#c4a882" roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.3, 0.06, s * 0.07]}>
          <sphereGeometry args={[0.02, 6, 5]} />
          <meshStandardMaterial color="#1a120c" />
        </mesh>
      ))}
      <mesh position={[0.36, 0, 0]}>
        <sphereGeometry args={[0.025, 6, 5]} />
        <meshStandardMaterial color="#2a1c14" />
      </mesh>
    </group>
  );
}

function CritterModel({ species }: { species: CritterSpecies }) {
  if (species === "lizard") return <LizardModel />;
  if (species === "frog") return <FrogModel />;
  if (species === "turtle") return <TurtleModel />;
  return <HedgehogModel />;
}

function nextPhase(species: CritterSpecies, current: Phase): Phase {
  const r = Math.random();
  if (species === "frog") {
    if (current === "walk" || current === "hop") return r < 0.55 ? "sit" : r < 0.8 ? "hop" : "look";
    if (current === "sit") return r < 0.45 ? "hop" : r < 0.75 ? "look" : "idle";
    return r < 0.5 ? "hop" : r < 0.8 ? "sit" : "walk";
  }
  if (species === "turtle") {
    if (current === "walk") return r < 0.55 ? "idle" : r < 0.85 ? "look" : "sit";
    if (current === "idle") return r < 0.4 ? "walk" : r < 0.7 ? "look" : "idle";
    return r < 0.45 ? "walk" : "idle";
  }
  if (species === "lizard") {
    if (current === "walk") return r < 0.4 ? "idle" : r < 0.75 ? "look" : "sit";
    if (current === "idle") return r < 0.55 ? "walk" : r < 0.8 ? "look" : "idle";
    return r < 0.6 ? "walk" : "idle";
  }
  // hedgehog
  if (current === "walk") return r < 0.45 ? "sit" : r < 0.75 ? "look" : "idle";
  if (current === "sit") return r < 0.5 ? "walk" : r < 0.8 ? "look" : "sit";
  return r < 0.55 ? "walk" : "sit";
}

function phaseDuration(phase: Phase, species: CritterSpecies) {
  if (phase === "walk") {
    if (species === "turtle") return 5 + Math.random() * 6;
    if (species === "frog") return 0.6 + Math.random() * 1.2;
    if (species === "lizard") return 1.2 + Math.random() * 2.2;
    return 2 + Math.random() * 3;
  }
  if (phase === "hop") return 0.45 + Math.random() * 0.35;
  if (phase === "sit") return species === "hedgehog" ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
  if (phase === "look") return 1.2 + Math.random() * 2;
  return 2 + Math.random() * 3.5;
}

/** Lagarto, sapo, tartaruga e ouriço — andam no gramado com física leve. */
export function GardenCritter({ species, radius, speed, offset, scale = 1 }: WalkerProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const shadow = useRef<THREE.Group>(null!);
  const phase = useRef<Phase>(species === "frog" ? "hop" : "walk");
  const phaseEndsAt = useRef(0);
  const walkBlend = useRef(1);
  const pos = useRef(
    (() => {
      const spawn = resolveStatic(
        Math.cos(offset) * radius,
        Math.sin(offset) * radius,
        bodyRadiusFor(species),
        { avoidGardenInterior: species === "turtle" || species === "hedgehog" },
      );
      return { x: spawn.x, z: spawn.z };
    })(),
  );
  const waypoint = useRef({
    x: Math.cos(offset + 1.1) * radius,
    z: Math.sin(offset + 1.1) * radius,
  });
  const facing = useRef(-offset);
  const hopY = useRef(0);
  const id = useMemo(
    () => `critter-${species}-${offset.toFixed(2)}-${radius}`,
    [species, offset, radius],
  );
  const bodyR = bodyRadiusFor(species) * (scale < 0.85 ? 0.75 : 1);
  const groundHeight = groundYFor(species) * scale;
  const avoidInterior = species === "turtle" || species === "hedgehog";

  useEffect(() => {
    registerAnimal(id, pos.current.x, pos.current.z, bodyR);
    return () => unregisterAnimal(id);
  }, [id, bodyR]);

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const now = state.clock.elapsedTime;
    if (now >= phaseEndsAt.current) {
      phase.current = nextPhase(species, phase.current);
      phaseEndsAt.current = now + phaseDuration(phase.current, species);
      if (phase.current === "walk" || phase.current === "hop") {
        const minR = Math.max(10.4, radius - 3.2);
        const maxR = Math.min(19.8, radius + 2.8);
        const a = Math.random() * Math.PI * 2;
        const r = minR + Math.random() * (maxR - minR);
        const raw = resolveStatic(Math.cos(a) * r, Math.sin(a) * r, bodyR, {
          avoidGardenInterior: avoidInterior,
        });
        waypoint.current = { x: raw.x, z: raw.z };
      }
    }

    const moving = phase.current === "walk" || phase.current === "hop";
    walkBlend.current = THREE.MathUtils.damp(walkBlend.current, moving ? 1 : 0, 5, dt);

    if (moving) {
      const dx = waypoint.current.x - pos.current.x;
      const dz = waypoint.current.z - pos.current.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const hopBoost = phase.current === "hop" ? 2.4 : 1;
      const step = speed * hopBoost * walkBlend.current * dt * 60 * 0.016;
      if (dist > 0.12) {
        pos.current.x += (dx / dist) * Math.min(step, dist);
        pos.current.z += (dz / dist) * Math.min(step, dist);
        const targetFacing = Math.atan2(dx, dz);
        let diff = targetFacing - facing.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facing.current += diff * Math.min(1, dt * (species === "turtle" ? 3 : 8));
      } else {
        phaseEndsAt.current = now;
      }
      const resolved = resolveStatic(pos.current.x, pos.current.z, bodyR, {
        avoidGardenInterior: avoidInterior,
      });
      const sep = separateFromAnimals(id, resolved.x, resolved.z, bodyR);
      const final = resolveStatic(sep.x, sep.z, bodyR, { avoidGardenInterior: avoidInterior });
      pos.current.x = final.x;
      pos.current.z = final.z;
      registerAnimal(id, pos.current.x, pos.current.z, bodyR);
    }

    if (phase.current === "hop") {
      const hopT = 1 - Math.max(0, (phaseEndsAt.current - now) / 0.55);
      hopY.current = Math.sin(Math.min(1, hopT) * Math.PI) * 0.28;
    } else {
      hopY.current = THREE.MathUtils.damp(hopY.current, 0, 10, dt);
    }

    if (root.current) {
      root.current.position.set(pos.current.x, 0, pos.current.z);
      root.current.rotation.y = facing.current;
    }
    if (body.current) {
      body.current.position.y = groundHeight + hopY.current;
      const bob =
        walkBlend.current *
        (species === "turtle"
          ? Math.sin(now * 4 + offset) * 0.01
          : Math.sin(now * (species === "lizard" ? 14 : 9) + offset) * 0.02);
      body.current.position.y += bob;
      body.current.rotation.x =
        species === "lizard" && phase.current === "idle"
          ? THREE.MathUtils.damp(body.current.rotation.x, -0.15, 4, dt)
          : THREE.MathUtils.damp(body.current.rotation.x, bob * 2, 6, dt);
      if (phase.current === "look") {
        body.current.rotation.y = Math.sin(now * 1.4 + offset) * 0.35;
      } else {
        body.current.rotation.y = THREE.MathUtils.damp(body.current.rotation.y, 0, 5, dt);
      }
    }
    if (shadow.current) {
      const squash = 1 + hopY.current * 0.8;
      shadow.current.scale.set(squash, 1, squash);
      shadow.current.position.y = 0;
    }
  });

  const shadowR =
    species === "turtle" ? 0.32 : species === "hedgehog" ? 0.26 : species === "frog" ? 0.2 : 0.22;

  return (
    <group ref={root}>
      <group ref={shadow}>
        <SoftShadow radius={shadowR * scale} />
      </group>
      <group ref={body} scale={scale}>
        <CritterModel species={species} />
      </group>
    </group>
  );
}

/** Coruja pousada — gira a cabeça; à noite fica mais ativa. */
export function GardenOwl({
  position,
  offset = 0,
  night = false,
}: {
  position: [number, number, number];
  offset?: number;
  night?: boolean;
}) {
  const head = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (head.current) {
      const look = Math.sin(t * (night ? 0.55 : 0.28) + offset) * (night ? 0.9 : 0.45);
      head.current.rotation.y = look;
      head.current.rotation.x = Math.sin(t * 0.4 + offset) * 0.08;
    }
    if (body.current && night) {
      body.current.position.y = Math.sin(t * 1.2 + offset) * 0.012;
    }
  });

  return (
    <group position={position} scale={0.85}>
      <group ref={body}>
        <mesh scale={[0.9, 1.15, 0.85]} castShadow>
          <sphereGeometry args={[0.18, 12, 10]} />
          <meshStandardMaterial color="#7a6548" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.05, 0.02]} scale={[0.7, 0.85, 0.65]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#c4b090" roughness={0.85} />
        </mesh>
        <group ref={head} position={[0, 0.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color="#6b573c" roughness={0.88} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[0.05, 0.02, s * 0.07]}>
              <mesh>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color="#e8d090" roughness={0.35} />
              </mesh>
              <mesh position={[0.02, 0, 0]}>
                <sphereGeometry args={[0.02, 8, 6]} />
                <meshStandardMaterial color="#1a1208" />
              </mesh>
            </group>
          ))}
          <mesh position={[0.12, -0.02, 0]} rotation={[0, 0, -0.2]}>
            <coneGeometry args={[0.025, 0.06, 5]} />
            <meshStandardMaterial color="#c97828" roughness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh
              key={`ear-${s}`}
              position={[-0.02, 0.12, s * 0.08]}
              rotation={[0.2, 0, s * 0.35]}
              scale={[0.4, 1, 0.35]}
            >
              <coneGeometry args={[0.04, 0.1, 4]} />
              <meshStandardMaterial color="#5a4832" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Pica-pau — pousa e bate o bico no tronco. */
export function GardenWoodpecker({
  position,
  offset = 0,
}: {
  position: [number, number, number];
  offset?: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const peckCycle = (t * 0.35 + offset) % 1;
    const pecking = peckCycle > 0.55 && peckCycle < 0.92;
    if (head.current) {
      head.current.rotation.x = pecking ? Math.sin(t * 28 + offset) * 0.35 : Math.sin(t * 0.8) * 0.05;
    }
    if (group.current) {
      group.current.position.y = position[1] + (pecking ? Math.sin(t * 28) * 0.008 : 0);
    }
  });

  return (
    <group ref={group} position={position} rotation={[0, offset, 0]} scale={0.7}>
      <mesh scale={[0.55, 1.1, 0.55]} castShadow>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#2a2e36" roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.02, 0.03]} scale={[0.4, 0.7, 0.45]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[0.5, 0.35, 0.5]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#c42a2a" roughness={0.6} />
      </mesh>
      <group ref={head} position={[0.08, 0.1, 0]}>
        <mesh>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshStandardMaterial color="#2a2e36" roughness={0.7} />
        </mesh>
        <mesh position={[0.08, -0.01, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.015, 0.1, 5]} />
          <meshStandardMaterial color="#e8c060" roughness={0.45} />
        </mesh>
        <mesh position={[0.02, 0.02, 0.035]}>
          <sphereGeometry args={[0.012, 6, 5]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.02, 0.04, s * 0.08]} rotation={[0.2, s * 0.4, s * 0.6]}>
          <capsuleGeometry args={[0.015, 0.08, 3, 5]} />
          <meshStandardMaterial color="#1e2228" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Libélula — voo errático baixo perto do jardim. */
export function GardenDragonfly({
  radius = 11,
  height = 1.6,
  speed = 0.55,
  offset = 0,
  color = "#3ecf8e",
}: {
  radius?: number;
  height?: number;
  speed?: number;
  offset?: number;
  color?: string;
}) {
  const grp = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    const r = radius + Math.sin(t * 0.7) * 1.8 + Math.sin(t * 0.21 + offset) * 1.1;
    const rawY = height + Math.sin(t * 1.4) * 0.35 + Math.sin(t * 0.33) * 0.2;
    const safe = clampFlight(
      Math.cos(t * 0.85) * r,
      rawY,
      Math.sin(t * 0.72) * r * 0.88,
      height - 0.35,
    );
    if (grp.current) {
      grp.current.position.set(safe.x, safe.y, safe.z);
      grp.current.rotation.y = -t * 0.85;
      grp.current.rotation.z = Math.sin(t * 2) * 0.12;
    }
    const flap = Math.sin(state.clock.elapsedTime * 42 + offset) * 0.55;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });

  return (
    <group ref={grp} scale={0.55}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.35, 1.4, 0.35]}>
        <capsuleGeometry args={[0.025, 0.22, 3, 6]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0.12, 0, 0]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#1a3030" roughness={0.4} />
      </mesh>
      <group ref={wingL} position={[0.02, 0.02, 0.02]}>
        <mesh rotation={[0.1, 0.2, 0.1]} scale={[1.2, 0.08, 0.45]}>
          <sphereGeometry args={[0.08, 8, 4]} />
          <meshStandardMaterial
            color="#c8f0e8"
            transparent
            opacity={0.55}
            roughness={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={wingR} position={[0.02, 0.02, -0.02]}>
        <mesh rotation={[-0.1, -0.2, -0.1]} scale={[1.2, 0.08, 0.45]}>
          <sphereGeometry args={[0.08, 8, 4]} />
          <meshStandardMaterial
            color="#c8f0e8"
            transparent
            opacity={0.55}
            roughness={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}