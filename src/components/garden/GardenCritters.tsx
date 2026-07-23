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

function CritterEye({
  position,
  size = 0.028,
  iris = "#1a2a10",
}: {
  position: [number, number, number];
  size?: number;
  iris?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 12, 10]} />
        <meshPhysicalMaterial color="#f4f0dc" roughness={0.25} clearcoat={0.55} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position={[size * 0.35, 0, 0]}>
        <sphereGeometry args={[size * 0.62, 10, 8]} />
        <meshPhysicalMaterial color={iris} roughness={0.35} clearcoat={0.4} />
      </mesh>
      <mesh position={[size * 0.55, 0, 0]}>
        <sphereGeometry args={[size * 0.32, 8, 6]} />
        <meshPhysicalMaterial color="#0a0c08" roughness={0.15} clearcoat={0.8} />
      </mesh>
      <mesh position={[size * 0.42, size * 0.28, size * 0.18]}>
        <sphereGeometry args={[size * 0.14, 6, 5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function LizardModel() {
  const skin = "#6fa84f";
  const dark = "#4a7a35";
  const belly = "#c8d890";
  const stripe = "#d4e070";
  return (
    <group scale={0.58}>
      <mesh position={[0.02, 0.04, 0]} scale={[1.55, 0.55, 0.62]} castShadow>
        <capsuleGeometry args={[0.11, 0.28, 6, 12]} />
        <meshPhysicalMaterial color={skin} roughness={0.42} clearcoat={0.18} clearcoatRoughness={0.55} />
      </mesh>
      <mesh position={[0.02, 0, 0]} scale={[1.35, 0.35, 0.48]}>
        <capsuleGeometry args={[0.09, 0.22, 4, 10]} />
        <meshStandardMaterial color={belly} roughness={0.65} />
      </mesh>
      <mesh position={[0.02, 0.1, 0]} scale={[1.4, 0.12, 0.22]}>
        <capsuleGeometry args={[0.05, 0.26, 3, 8]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
      <mesh position={[0.4, 0.07, 0]} scale={[1.15, 0.72, 0.88]} castShadow>
        <sphereGeometry args={[0.1, 14, 12]} />
        <meshPhysicalMaterial color={dark} roughness={0.4} clearcoat={0.2} />
      </mesh>
      <mesh position={[0.48, 0.04, 0]} scale={[0.9, 0.55, 0.7]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={belly} roughness={0.6} />
      </mesh>
      <CritterEye position={[0.48, 0.1, 0.06]} size={0.022} iris="#203010" />
      <CritterEye position={[0.48, 0.1, -0.06]} size={0.022} iris="#203010" />
      {[-1, 1].map((s) => (
        <mesh key={`n-${s}`} position={[0.52, 0.05, s * 0.02]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshStandardMaterial color="#2a3820" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-0.42, 0.04, 0]} rotation={[0, 0, 0.18]} scale={[1.1, 0.55, 0.55]} castShadow>
        <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
        <meshPhysicalMaterial color={skin} roughness={0.48} clearcoat={0.12} />
      </mesh>
      <mesh position={[-0.68, 0.01, 0]} rotation={[0, 0, 0.28]} scale={[0.9, 0.4, 0.4]} castShadow>
        <capsuleGeometry args={[0.035, 0.18, 3, 6]} />
        <meshStandardMaterial color={dark} roughness={0.55} />
      </mesh>
      <mesh position={[-0.88, -0.02, 0]} rotation={[0, 0, 0.35]} scale={[0.7, 0.28, 0.28]}>
        <capsuleGeometry args={[0.02, 0.12, 3, 5]} />
        <meshStandardMaterial color="#3d6a2e" roughness={0.6} />
      </mesh>
      {[
        [0.18, 1],
        [0.18, -1],
        [-0.12, 1],
        [-0.12, -1],
      ].map(([x, side], i) => (
        <group key={`leg-${i}`} position={[x, -0.02, side * 0.12]}>
          <mesh rotation={[0.55, 0, side * 0.55]} scale={[0.55, 0.22, 0.85]} castShadow>
            <capsuleGeometry args={[0.035, 0.1, 4, 8]} />
            <meshStandardMaterial color={dark} roughness={0.55} />
          </mesh>
          <mesh position={[0.02, -0.08, side * 0.06]} scale={[0.7, 0.25, 0.9]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color="#3a602c" roughness={0.7} />
          </mesh>
          {[-0.02, 0, 0.02].map((tz, ti) => (
            <mesh
              key={`toe-${i}-${ti}`}
              position={[0.05 + ti * 0.01, -0.09, side * 0.06 + tz]}
              rotation={[0.9, 0, side * -0.4]}
              scale={[0.25, 0.8, 0.25]}
            >
              <coneGeometry args={[0.012, 0.04, 4]} />
              <meshStandardMaterial color="#2e4a24" roughness={0.65} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FrogModel() {
  const skin = "#52b040";
  const dark = "#2f7428";
  const belly = "#e8f2b0";
  const pad = "#6db85a";
  return (
    <group scale={1.05} position={[0, 0.02, 0]}>
      {/* Corpo unico e cheio — sapo sentado legivel */}
      <mesh position={[0.02, 0.1, 0]} scale={[1.25, 0.9, 1.15]} castShadow>
        <sphereGeometry args={[0.18, 22, 18]} />
        <meshPhysicalMaterial
          color={skin}
          roughness={0.34}
          clearcoat={0.45}
          clearcoatRoughness={0.28}
          sheen={0.35}
          sheenColor="#a0e878"
        />
      </mesh>
      <mesh position={[0.04, 0.04, 0]} scale={[1.05, 0.62, 1]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color={belly} roughness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={`hip-${s}`}
          position={[-0.04, 0.08, s * 0.15]}
          scale={[0.75, 0.7, 0.85]}
          castShadow
        >
          <sphereGeometry args={[0.11, 14, 12]} />
          <meshPhysicalMaterial color={dark} roughness={0.4} clearcoat={0.22} />
        </mesh>
      ))}
      {[
        [0.0, 0.22, 0.07],
        [0.0, 0.22, -0.07],
        [-0.08, 0.2, 0],
        [0.1, 0.19, 0.04],
        [0.1, 0.19, -0.04],
      ].map(([x, y, z], i) => (
        <mesh key={`spot-${i}`} position={[x, y, z]} scale={[1.1, 0.45, 1.2]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={dark} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0.16, 0.14, 0]} scale={[1.05, 0.92, 1.12]} castShadow>
        <sphereGeometry args={[0.125, 18, 14]} />
        <meshPhysicalMaterial
          color={skin}
          roughness={0.36}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
        />
      </mesh>
      <mesh position={[0.22, 0.09, 0]} scale={[0.85, 0.5, 0.95]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={belly} roughness={0.68} />
      </mesh>
      <mesh position={[0.26, 0.075, 0]} rotation={[0.15, 0, -0.25]} scale={[0.45, 0.22, 1.2]}>
        <torusGeometry args={[0.055, 0.01, 6, 18, Math.PI]} />
        <meshStandardMaterial color="#1a3218" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`nos-${s}`} position={[0.275, 0.145, s * 0.028]}>
          <sphereGeometry args={[0.01, 8, 6]} />
          <meshStandardMaterial color="#152814" />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`tym-${s}`}
          position={[0.1, 0.16, s * 0.125]}
          rotation={[0, s * 0.9, 0]}
          scale={[0.2, 1, 1]}
        >
          <circleGeometry args={[0.035, 12]} />
          <meshStandardMaterial color="#3a6e32" roughness={0.65} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={`eye-${s}`} position={[0.12, 0.24, s * 0.11]} rotation={[0, s * 0.4, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.055, 16, 14]} />
            <meshPhysicalMaterial color={dark} roughness={0.36} clearcoat={0.3} />
          </mesh>
          <mesh position={[0.028, 0.005, 0]} scale={[0.95, 0.9, 0.95]}>
            <sphereGeometry args={[0.038, 14, 12]} />
            <meshPhysicalMaterial
              color="#f4f0dc"
              roughness={0.18}
              clearcoat={0.7}
              clearcoatRoughness={0.12}
            />
          </mesh>
          <mesh position={[0.042, 0.002, 0]}>
            <sphereGeometry args={[0.022, 12, 10]} />
            <meshPhysicalMaterial color="#1e4a18" roughness={0.28} clearcoat={0.55} />
          </mesh>
          <mesh position={[0.052, 0, 0]}>
            <sphereGeometry args={[0.011, 10, 8]} />
            <meshPhysicalMaterial color="#050805" roughness={0.1} clearcoat={0.9} />
          </mesh>
          <mesh position={[0.048, 0.012, s * 0.008]}>
            <sphereGeometry args={[0.006, 6, 5]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.01, 0.038, 0]} rotation={[0, 0, 0.5]} scale={[0.9, 0.32, 1]}>
            <sphereGeometry args={[0.042, 10, 8]} />
            <meshStandardMaterial color="#3f7a34" roughness={0.48} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`hind-${s}`}>
          <mesh
            position={[-0.02, 0.07, s * 0.18]}
            rotation={[0.35, s * -0.25, s * 1.05]}
            scale={[0.95, 0.55, 1.15]}
            castShadow
          >
            <capsuleGeometry args={[0.055, 0.12, 6, 12]} />
            <meshPhysicalMaterial color={dark} roughness={0.4} clearcoat={0.2} />
          </mesh>
          <mesh
            position={[-0.12, 0.02, s * 0.28]}
            rotation={[0.2, s * 0.45, s * -0.85]}
            scale={[0.7, 0.45, 1.1]}
            castShadow
          >
            <capsuleGeometry args={[0.04, 0.1, 5, 10]} />
            <meshStandardMaterial color={skin} roughness={0.46} />
          </mesh>
          <group position={[-0.2, -0.04, s * 0.34]} rotation={[0.1, s * 0.5, 0]}>
            <mesh scale={[1.4, 0.3, 1.6]} castShadow>
              <sphereGeometry args={[0.048, 12, 8]} />
              <meshStandardMaterial color={pad} roughness={0.55} />
            </mesh>
            {[-0.05, 0, 0.05].map((tz, ti) => (
              <mesh
                key={`ht-${s}-${ti}`}
                position={[-0.055 - ti * 0.01, -0.002, tz]}
                scale={[0.9, 0.4, 0.7]}
              >
                <sphereGeometry args={[0.02, 8, 6]} />
                <meshPhysicalMaterial color="#7fd068" roughness={0.4} clearcoat={0.28} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`arm-${s}`}>
          <mesh
            position={[0.14, 0.05, s * 0.12]}
            rotation={[0.65, s * 0.15, s * -0.9]}
            scale={[0.65, 0.4, 1]}
            castShadow
          >
            <capsuleGeometry args={[0.032, 0.085, 5, 10]} />
            <meshStandardMaterial color={dark} roughness={0.46} />
          </mesh>
          <group position={[0.2, -0.035, s * 0.18]}>
            <mesh scale={[1.2, 0.35, 1.3]} castShadow>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color={pad} roughness={0.55} />
            </mesh>
            {[-0.025, 0, 0.025].map((tz, ti) => (
              <mesh
                key={`ft-${s}-${ti}`}
                position={[0.035 + ti * 0.006, -0.002, tz]}
                scale={[0.8, 0.4, 0.65]}
              >
                <sphereGeometry args={[0.014, 8, 6]} />
                <meshPhysicalMaterial color="#7fd068" roughness={0.4} clearcoat={0.22} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

function TurtleModel() {
  const shell = "#4f6340";
  const shellLite = "#6a8052";
  const skin = "#8a9a58";
  const dark = "#3d4a30";
  return (
    <group scale={0.72}>
      <mesh position={[0, 0.1, 0]} scale={[1.2, 0.58, 1.05]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshPhysicalMaterial color={shell} roughness={0.75} clearcoat={0.2} clearcoatRoughness={0.6} />
      </mesh>
      {[
        [0, 0.2, 0, 0.1],
        [0.1, 0.16, 0.08, 0.07],
        [0.1, 0.16, -0.08, 0.07],
        [-0.1, 0.16, 0.08, 0.07],
        [-0.1, 0.16, -0.08, 0.07],
        [0.16, 0.12, 0, 0.06],
        [-0.16, 0.12, 0, 0.06],
      ].map(([x, y, z, r], i) => (
        <mesh key={`plate-${i}`} position={[x, y, z]} scale={[1, 0.35, 1]}>
          <sphereGeometry args={[r, 8, 6]} />
          <meshStandardMaterial color={i === 0 ? shellLite : "#5a7048"} roughness={0.85} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.01, 0]} scale={[1, 0.25, 0.9]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshStandardMaterial color="#c4b878" roughness={0.8} />
      </mesh>
      <mesh position={[0.28, 0.06, 0]} rotation={[0, 0, -0.25]} scale={[0.7, 0.45, 0.45]} castShadow>
        <capsuleGeometry args={[0.05, 0.08, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.65} />
      </mesh>
      <mesh position={[0.4, 0.08, 0]} scale={[1.1, 0.85, 0.9]} castShadow>
        <sphereGeometry args={[0.09, 14, 12]} />
        <meshPhysicalMaterial color={skin} roughness={0.55} clearcoat={0.1} />
      </mesh>
      <mesh position={[0.48, 0.06, 0]} scale={[0.8, 0.55, 0.7]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color="#a8b870" roughness={0.7} />
      </mesh>
      <CritterEye position={[0.46, 0.11, 0.05]} size={0.018} iris="#1a2010" />
      <CritterEye position={[0.46, 0.11, -0.05]} size={0.018} iris="#1a2010" />
      {[
        [0.14, 0.14],
        [0.14, -0.14],
        [-0.12, 0.14],
        [-0.12, -0.14],
      ].map(([x, z], i) => (
        <group key={`foot-${i}`} position={[x, 0, z]}>
          <mesh scale={[0.7, 0.35, 0.55]} castShadow>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={skin} roughness={0.7} />
          </mesh>
          {[-0.025, 0, 0.025].map((tz, ti) => (
            <mesh
              key={`claw-${i}-${ti}`}
              position={[0.05, -0.02, tz]}
              rotation={[0.6, 0, -0.8]}
              scale={[0.3, 0.9, 0.3]}
            >
              <coneGeometry args={[0.012, 0.035, 4]} />
              <meshStandardMaterial color={dark} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-0.28, 0.04, 0]} rotation={[0, 0, 0.45]} scale={[0.45, 0.28, 0.28]}>
        <capsuleGeometry args={[0.04, 0.08, 3, 6]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
    </group>
  );
}

function HedgehogModel() {
  const fur = "#6a5440";
  const face = "#e0c4a0";
  const belly = "#d4b896";
  const spine = "#3a2e24";
  const spineTip = "#9a8870";
  const paw = "#5a4030";
  return (
    <group scale={0.72}>
      {/* corpo levantado para as patas aparecerem */}
      <group position={[0, 0.08, 0]}>
        <mesh scale={[1.35, 0.92, 1.1]} castShadow>
          <sphereGeometry args={[0.24, 16, 14]} />
          <meshStandardMaterial color={fur} roughness={0.95} />
        </mesh>
        <mesh position={[0.02, -0.06, 0]} scale={[1.1, 0.55, 0.95]}>
          <sphereGeometry args={[0.18, 12, 10]} />
          <meshStandardMaterial color={belly} roughness={0.9} />
        </mesh>
        {Array.from({ length: 48 }, (_, i) => {
          const ring = Math.floor(i / 12);
          const a = ((i % 12) / 12) * Math.PI * 2 + ring * 0.18;
          const elev = 0.12 + ring * 0.1;
          const r = 0.12 + ring * 0.035;
          const lean = 0.55 + ring * 0.12;
          return (
            <mesh
              key={"sp-" + i}
              position={[Math.cos(a) * r * 1.05, 0.04 + elev, Math.sin(a) * r * 0.95]}
              rotation={[lean, a, (i % 5) * 0.08]}
              scale={[0.32, 1.25 + ring * 0.08, 0.32]}
            >
              <coneGeometry args={[0.032, 0.14 + ring * 0.015, 5]} />
              <meshStandardMaterial color={i % 4 === 0 ? spineTip : spine} roughness={1} />
            </mesh>
          );
        })}
        <mesh position={[0.3, 0.02, 0]} scale={[1.15, 0.95, 1]} castShadow>
          <sphereGeometry args={[0.11, 14, 12]} />
          <meshStandardMaterial color={face} roughness={0.78} />
        </mesh>
        <mesh position={[0.4, -0.01, 0]} scale={[1.2, 0.72, 0.8]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color="#f0d8b8" roughness={0.72} />
        </mesh>
        <mesh position={[0.47, 0, 0]} castShadow>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshPhysicalMaterial color="#1a120c" roughness={0.35} clearcoat={0.3} />
        </mesh>
        <CritterEye position={[0.36, 0.07, 0.065]} size={0.024} iris="#1a120c" />
        <CritterEye position={[0.36, 0.07, -0.065]} size={0.024} iris="#1a120c" />
        {[-1, 1].map((s) => (
          <group key={"ear-" + s} position={[0.22, 0.14, s * 0.1]}>
            <mesh rotation={[0.25, 0, s * 0.45]} scale={[0.4, 0.85, 0.28]} castShadow>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color="#c4a078" roughness={0.82} />
            </mesh>
            <mesh
              position={[0.01, 0.01, s * 0.01]}
              rotation={[0.25, 0, s * 0.45]}
              scale={[0.25, 0.55, 0.15]}
            >
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#e8b8a0" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>
      {/* 4 patas curtas e largas — bem para fora (visível de cima) */}
      {[
        [0.16, 0.16, 0.15],
        [0.16, -0.16, -0.15],
        [-0.14, 0.16, 0.2],
        [-0.14, -0.16, -0.2],
      ].map(([x, z, yaw], i) => (
        <group key={"leg-" + i} position={[x, -0.02, z]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.04, 0]} rotation={[0.35, 0, 0]} castShadow>
            <capsuleGeometry args={[0.035, 0.05, 4, 8]} />
            <meshStandardMaterial color={fur} roughness={0.9} />
          </mesh>
          <mesh position={[0.02, -0.02, 0]} scale={[1.15, 0.45, 0.85]} castShadow>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={paw} roughness={0.85} />
          </mesh>
          {[-0.025, 0, 0.025].map((tz, ti) => (
            <mesh
              key={"toe-" + i + "-" + ti}
              position={[0.055, -0.035, tz]}
              rotation={[0.85, 0, -0.55]}
              scale={[0.35, 0.85, 0.35]}
            >
              <coneGeometry args={[0.012, 0.032, 4]} />
              <meshStandardMaterial color="#2a1c14" roughness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
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
    species === "turtle" ? 0.32 : species === "hedgehog" ? 0.26 : species === "frog" ? 0.26 : 0.22;

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

export { GardenOwl } from "./GardenOwl";

const WOODPECKER_PERCHES: [number, number, number][] = [
  [11.4, 1.7, -10.6],
  [13.2, 2.35, -8.2],
  [14.1, 1.95, -5.4],
  [-11.8, 1.85, 9.4],
  [-13.5, 2.45, 6.8],
  [-12.6, 2.1, 11.2],
  [10.2, 2.2, 11.8],
  [-9.8, 1.9, -12.4],
];

type WoodpeckerPhase = "peck" | "climb" | "look" | "fly";

/** Pica-pau — sobe no tronco, bate o bico e voa de árvore em árvore. */
export function GardenWoodpecker({
  perchIndex = 0,
  offset = 0,
}: {
  /** Índice inicial na lista de troncos. */
  perchIndex?: number;
  offset?: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);

  const startIdx = perchIndex % WOODPECKER_PERCHES.length;
  const pos = useRef(new THREE.Vector3(...WOODPECKER_PERCHES[startIdx]));
  const from = useRef(new THREE.Vector3(...WOODPECKER_PERCHES[startIdx]));
  const to = useRef(new THREE.Vector3(...WOODPECKER_PERCHES[startIdx]));
  const perchIdx = useRef(startIdx);
  const phase = useRef<WoodpeckerPhase>("peck");
  const phaseEndsAt = useRef(0.8 + offset);
  const flyStart = useRef(0);
  const flyDuration = useRef(1.7);
  const climbDir = useRef(1);
  const facing = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);

    if (t >= phaseEndsAt.current) {
      const roll = Math.random();
      if (phase.current === "fly") {
        pos.current.copy(to.current);
        phase.current = "peck";
        phaseEndsAt.current = t + 2.2 + Math.random() * 2.5;
      } else if (phase.current === "peck") {
        if (roll < 0.35) {
          phase.current = "climb";
          climbDir.current = Math.random() < 0.5 ? 1 : -1;
          phaseEndsAt.current = t + 1.4 + Math.random() * 1.6;
        } else if (roll < 0.55) {
          phase.current = "look";
          phaseEndsAt.current = t + 1.1 + Math.random() * 1.4;
        } else {
          let next = perchIdx.current;
          for (let tries = 0; tries < 6 && next === perchIdx.current; tries++) {
            next = Math.floor(Math.random() * WOODPECKER_PERCHES.length);
          }
          perchIdx.current = next;
          from.current.copy(pos.current);
          to.current.set(...WOODPECKER_PERCHES[next]);
          flyStart.current = t;
          flyDuration.current = 1.35 + Math.random() * 0.55;
          phase.current = "fly";
          phaseEndsAt.current = t + flyDuration.current;
        }
      } else if (phase.current === "climb") {
        phase.current = roll < 0.6 ? "peck" : "look";
        phaseEndsAt.current = t + 1.5 + Math.random() * 2;
      } else {
        if (roll < 0.4) {
          phase.current = "peck";
          phaseEndsAt.current = t + 2 + Math.random() * 2.2;
        } else if (roll < 0.7) {
          phase.current = "climb";
          climbDir.current = Math.random() < 0.5 ? 1 : -1;
          phaseEndsAt.current = t + 1.2 + Math.random() * 1.4;
        } else {
          let next = perchIdx.current;
          for (let tries = 0; tries < 6 && next === perchIdx.current; tries++) {
            next = Math.floor(Math.random() * WOODPECKER_PERCHES.length);
          }
          perchIdx.current = next;
          from.current.copy(pos.current);
          to.current.set(...WOODPECKER_PERCHES[next]);
          flyStart.current = t;
          flyDuration.current = 1.35 + Math.random() * 0.55;
          phase.current = "fly";
          phaseEndsAt.current = t + flyDuration.current;
        }
      }
    }

    if (phase.current === "fly") {
      const u = THREE.MathUtils.clamp((t - flyStart.current) / flyDuration.current, 0, 1);
      const ease = u * u * (3 - 2 * u);
      pos.current.lerpVectors(from.current, to.current, ease);
      pos.current.y += Math.sin(ease * Math.PI) * 1.35;
      const dx = to.current.x - from.current.x;
      const dz = to.current.z - from.current.z;
      if (Math.hypot(dx, dz) > 0.01) facing.current = Math.atan2(dx, dz);
    } else if (phase.current === "climb") {
      pos.current.y += climbDir.current * dt * 0.55;
      pos.current.y = THREE.MathUtils.clamp(pos.current.y, 1.35, 3.15);
      const perch = WOODPECKER_PERCHES[perchIdx.current];
      const ang = Math.atan2(pos.current.x, pos.current.z);
      const r = Math.hypot(perch[0], perch[2]);
      pos.current.x = Math.sin(ang) * r;
      pos.current.z = Math.cos(ang) * r;
      facing.current = ang + Math.PI;
    } else {
      const ang = Math.atan2(pos.current.x, pos.current.z);
      facing.current = THREE.MathUtils.damp(facing.current, ang + Math.PI, 6, dt);
    }

    const pecking = phase.current === "peck";
    const peckPulse = pecking ? Math.sin(t * 36 + offset) : 0;

    if (group.current) {
      group.current.position.copy(pos.current);
      group.current.rotation.y = facing.current;
      group.current.rotation.x = phase.current === "fly" ? -0.25 : 0.12;
      group.current.rotation.z = phase.current === "fly" ? Math.sin(t * 12) * 0.12 : 0.05;
    }
    if (head.current) {
      if (pecking) {
        head.current.rotation.x = peckPulse * 0.5;
        head.current.position.x = 0.1 + Math.abs(peckPulse) * 0.028;
      } else if (phase.current === "look") {
        head.current.rotation.y = Math.sin(t * 1.6 + offset) * 0.7;
        head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, 0.05, 8, dt);
        head.current.position.x = THREE.MathUtils.damp(head.current.position.x, 0.1, 8, dt);
      } else {
        head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, 0, 6, dt);
        head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, 0.04, 8, dt);
        head.current.position.x = THREE.MathUtils.damp(head.current.position.x, 0.1, 8, dt);
      }
    }
    if (body.current) {
      body.current.rotation.x = pecking ? 0.14 + Math.abs(peckPulse) * 0.1 : 0.08;
    }
    if (tail.current) {
      tail.current.rotation.x = pecking ? -0.4 : phase.current === "fly" ? -0.15 : -0.28;
    }
    const flap = phase.current === "fly" ? Math.sin(t * 28 + offset) * 0.85 : 0.12;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });

  const black = "#1f232b";
  const charcoal = "#2c313c";
  const belly = "#f0ebe3";
  const crest = "#d62828";
  const beak = "#e6b84d";
  const claw = "#2a2218";

  return (
    <group ref={group} scale={0.92} position={WOODPECKER_PERCHES[startIdx]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.02, -0.12, 0.02]} renderOrder={-1}>
        <circleGeometry args={[0.14, 14]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <group ref={body}>
        <mesh position={[0, 0.02, 0]} scale={[0.72, 1.35, 0.78]} castShadow>
          <sphereGeometry args={[0.11, 14, 12]} />
          <meshPhysicalMaterial color={black} roughness={0.72} sheen={0.12} sheenColor="#4a5568" />
        </mesh>
        <mesh position={[0.035, -0.01, 0.02]} scale={[0.55, 1.05, 0.62]} castShadow>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshPhysicalMaterial color={belly} roughness={0.78} sheen={0.08} sheenColor="#fff" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={`wing-white-${s}`}
            position={[-0.01, 0.02, s * 0.08]}
            rotation={[0.15, s * 0.15, s * 0.55]}
            scale={[0.35, 0.7, 0.22]}
          >
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color="#e8e4dc" roughness={0.75} />
          </mesh>
        ))}
        <group ref={wingL} position={[-0.02, 0.04, 0.09]}>
          <mesh rotation={[0.25, 0.35, 0.75]} scale={[0.45, 0.95, 0.28]} castShadow>
            <capsuleGeometry args={[0.045, 0.1, 4, 8]} />
            <meshPhysicalMaterial color={charcoal} roughness={0.7} sheen={0.1} sheenColor="#5a6578" />
          </mesh>
        </group>
        <group ref={wingR} position={[-0.02, 0.04, -0.09]}>
          <mesh rotation={[0.25, -0.35, -0.75]} scale={[0.45, 0.95, 0.28]} castShadow>
            <capsuleGeometry args={[0.045, 0.1, 4, 8]} />
            <meshPhysicalMaterial color={charcoal} roughness={0.7} sheen={0.1} sheenColor="#5a6578" />
          </mesh>
        </group>
        <group ref={tail} position={[-0.1, -0.06, 0]}>
          {[0, -0.025, 0.025].map((z, i) => (
            <mesh
              key={`tail-${i}`}
              position={[-0.06, -0.02, z]}
              rotation={[0.15, 0, -0.55]}
              scale={[0.22, 0.85, 0.18]}
              castShadow
            >
              <capsuleGeometry args={[0.03, 0.1, 3, 6]} />
              <meshStandardMaterial color={i === 0 ? black : charcoal} roughness={0.8} />
            </mesh>
          ))}
        </group>

        <group ref={head} position={[0.1, 0.14, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.075, 14, 12]} />
            <meshPhysicalMaterial color={black} roughness={0.68} sheen={0.14} sheenColor="#4a5568" />
          </mesh>
          <mesh position={[-0.01, 0.07, 0]} scale={[0.7, 0.85, 0.75]} castShadow>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshPhysicalMaterial
              color={crest}
              roughness={0.45}
              clearcoat={0.25}
              clearcoatRoughness={0.4}
            />
          </mesh>
          <mesh position={[-0.04, 0.09, 0]} scale={[0.45, 0.7, 0.4]} castShadow>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#b02020" roughness={0.5} />
          </mesh>
          <mesh position={[0.03, -0.01, 0.045]} scale={[0.55, 0.4, 0.35]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={belly} roughness={0.75} />
          </mesh>
          <mesh position={[0.03, -0.01, -0.045]} scale={[0.55, 0.4, 0.35]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={belly} roughness={0.75} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={`eye-${s}`} position={[0.045, 0.015, s * 0.052]}>
              <mesh>
                <sphereGeometry args={[0.018, 10, 8]} />
                <meshPhysicalMaterial color="#0a0a08" roughness={0.15} clearcoat={0.7} />
              </mesh>
              <mesh position={[0.008, 0.006, 0.004]}>
                <sphereGeometry args={[0.005, 6, 5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          <mesh position={[0.095, -0.005, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.018, 0.13, 8]} />
            <meshPhysicalMaterial color={beak} roughness={0.35} clearcoat={0.2} />
          </mesh>
          <mesh position={[0.055, -0.002, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 0.55, 1]}>
            <coneGeometry args={[0.022, 0.05, 7]} />
            <meshStandardMaterial color="#d4a040" roughness={0.45} />
          </mesh>
        </group>

        {[-1, 1].map((s) => (
          <group key={`leg-${s}`} position={[0.02, -0.1, s * 0.045]} rotation={[0.35, 0, s * 0.25]}>
            <mesh position={[0, -0.03, 0]} castShadow>
              <capsuleGeometry args={[0.012, 0.045, 3, 6]} />
              <meshStandardMaterial color="#3a342c" roughness={0.7} />
            </mesh>
            {[-0.02, 0, 0.02].map((fz, fi) => (
              <mesh
                key={`claw-${s}-${fi}`}
                position={[0.025 + fi * 0.008, -0.055, fz]}
                rotation={[0.8, 0, -0.9]}
                scale={[0.35, 1, 0.35]}
              >
                <coneGeometry args={[0.008, 0.035, 4]} />
                <meshStandardMaterial color={claw} roughness={0.55} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
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
    <group ref={grp} scale={0.62}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.04, 0, 0]} scale={[0.32, 1.55, 0.32]} castShadow>
        <capsuleGeometry args={[0.022, 0.2, 4, 8]} />
        <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.22} clearcoat={0.35} />
      </mesh>
      {[0.02, -0.04, -0.1, -0.16].map((x, i) => (
        <mesh key={"seg-" + i} position={[x, 0, 0]} scale={[0.55, 0.55, 0.55]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshStandardMaterial color={i % 2 ? "#2a8a60" : color} roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
      <mesh position={[0.08, 0, 0]} castShadow>
        <sphereGeometry args={[0.038, 12, 10]} />
        <meshPhysicalMaterial color="#1e4a40" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.14, 0, 0]} castShadow>
        <sphereGeometry args={[0.032, 12, 10]} />
        <meshStandardMaterial color="#152828" roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={"df-eye-" + s} position={[0.155, 0.008, s * 0.022]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshPhysicalMaterial color="#1a6058" roughness={0.2} clearcoat={0.6} metalness={0.15} />
        </mesh>
      ))}
      <group ref={wingL} position={[0.06, 0.02, 0.01]}>
        {[0.02, -0.04].map((x, i) => (
          <mesh
            key={"wl-" + i}
            position={[x, 0.01, 0.02 + i * 0.01]}
            rotation={[0.08, 0.25, 0.05]}
            scale={[1.35, 0.06, 0.42]}
          >
            <sphereGeometry args={[0.075, 10, 6]} />
            <meshPhysicalMaterial
              color="#d8f8f0"
              transparent
              opacity={0.42}
              roughness={0.15}
              clearcoat={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={wingR} position={[0.06, 0.02, -0.01]}>
        {[0.02, -0.04].map((x, i) => (
          <mesh
            key={"wr-" + i}
            position={[x, 0.01, -0.02 - i * 0.01]}
            rotation={[-0.08, -0.25, -0.05]}
            scale={[1.35, 0.06, 0.42]}
          >
            <sphereGeometry args={[0.075, 10, 6]} />
            <meshPhysicalMaterial
              color="#d8f8f0"
              transparent
              opacity={0.42}
              roughness={0.15}
              clearcoat={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

