import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  bodyRadiusFor,
  groundYFor,
  registerAnimal,
  resolveStatic,
  separateFromAnimals,
  unregisterAnimal,
} from "@/lib/gardenPhysics";

export type WildlifeSpecies = "rabbit" | "fox" | "deer";

type WildlifeProps = {
  species: WildlifeSpecies;
  radius: number;
  speed: number;
  offset: number;
};

type AnimalPhase = "walk" | "idle" | "graze" | "look" | "sniff" | "groom";

function FurMaterial({ color, lighter = false }: { color: string; lighter?: boolean }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.96}
      sheen={0.18}
      sheenColor={lighter ? "#f5dfc5" : color}
      sheenRoughness={0.82}
    />
  );
}

function createDeerCoatTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  let seed = 44917;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const shortHair = Math.sin(y * 2.8 + x * 0.24) * 12;
      const mottling = Math.sin(x * 0.25) * Math.cos(y * 0.18) * 11;
      const noise = (random() - 0.5) * 24;
      const value = THREE.MathUtils.clamp(175 + shortHair + mottling + noise, 75, 235);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const DEER_COAT_TEXTURE = createDeerCoatTexture();

function DeerFurMaterial({ color, lighter = false }: { color: string; lighter?: boolean }) {
  return (
    <meshPhysicalMaterial
      color={color}
      map={DEER_COAT_TEXTURE}
      bumpMap={DEER_COAT_TEXTURE}
      bumpScale={lighter ? 0.008 : 0.018}
      roughness={0.94}
      sheen={0.28}
      sheenColor={lighter ? "#eadac0" : "#a77b53"}
      sheenRoughness={0.76}
    />
  );
}

function Eye({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.027, 12, 9]} />
        <meshPhysicalMaterial color="#080706" roughness={0.18} clearcoat={0.65} />
      </mesh>
      <mesh position={[0.018, 0.012, 0.014]}>
        <sphereGeometry args={[0.006, 8, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function ArticulatedLeg({
  legRef,
  position,
  color,
  length,
  hoof = false,
}: {
  legRef: RefObject<THREE.Group | null>;
  position: [number, number, number];
  color: string;
  length: number;
  hoof?: boolean;
}) {
  return (
    <group ref={legRef} position={position}>
      <mesh position={[0, -length * 0.38, 0]} rotation={[0, 0, 0.03]} castShadow>
        <capsuleGeometry args={[0.055, length * 0.52, 6, 10]} />
        <FurMaterial color={color} />
      </mesh>
      <mesh position={[0.03, -length * 0.82, 0]} rotation={[0, 0, -0.08]} castShadow>
        <capsuleGeometry args={[0.04, length * 0.36, 6, 9]} />
        <FurMaterial color={hoof ? "#332b25" : color} />
      </mesh>
      {/* Foot sits just above the ground plane — never sinks through */}
      <mesh position={[0.08, -length * 1.05, 0]} scale={[1.4, 0.55, 0.95]} castShadow>
        <sphereGeometry args={[0.07, 10, 7]} />
        <meshStandardMaterial color={hoof ? "#211c18" : color} roughness={1} />
      </mesh>
    </group>
  );
}

function ContactShadow({ radius }: { radius: number }) {
  // World-anchored soft blob; parent updates Y so it never floats with the hop
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 20]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

function RabbitModel({
  legRefs,
  headRef,
}: {
  legRefs: RefObject<THREE.Group | null>[];
  headRef: RefObject<THREE.Group | null>;
}) {
  const fur = "#9c856d";
  const belly = "#d4c2ab";
  return (
    <group scale={0.62}>
      <mesh scale={[1.35, 1, 0.95]} castShadow>
        <sphereGeometry args={[0.52, 20, 14]} />
        <FurMaterial color={fur} />
      </mesh>
      <mesh position={[-0.4, 0.05, 0]} scale={[1.05, 1.15, 1]} castShadow>
        <sphereGeometry args={[0.42, 18, 13]} />
        <FurMaterial color="#88715d" />
      </mesh>
      <group ref={headRef} position={[0.58, 0.42, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.33, 18, 14]} />
          <FurMaterial color={fur} />
        </mesh>
        <mesh position={[0.24, -0.06, 0]} scale={[1.25, 0.8, 0.85]}>
          <sphereGeometry args={[0.19, 14, 10]} />
          <FurMaterial color={belly} lighter />
        </mesh>
        {[0.13, -0.13].map((z, i) => (
          <group key={z} position={[-0.07, 0.38, z]} rotation={[i ? -0.08 : 0.08, 0, -0.08]}>
            <mesh scale={[0.58, 1.9, 0.42]} castShadow>
              <capsuleGeometry args={[0.1, 0.38, 7, 12]} />
              <FurMaterial color={fur} />
            </mesh>
            <mesh position={[0.01, 0.08, z > 0 ? 0.045 : -0.045]} scale={[0.35, 1.25, 0.18]}>
              <capsuleGeometry args={[0.08, 0.3, 6, 10]} />
              <meshStandardMaterial color="#c89691" roughness={0.9} />
            </mesh>
          </group>
        ))}
        <Eye position={[0.18, 0.08, 0.26]} />
        <Eye position={[0.18, 0.08, -0.26]} />
        <mesh position={[0.42, -0.02, 0]}>
          <sphereGeometry args={[0.045, 10, 7]} />
          <meshPhysicalMaterial color="#4b3030" roughness={0.45} />
        </mesh>
        {[-1, 1].flatMap((side) =>
          [-0.055, 0, 0.055].map((height, i) => (
            <mesh
              key={`${side}-${i}`}
              position={[0.38, -0.04 + height, side * 0.08]}
              rotation={[side * 0.18, 0, side * (0.72 + i * 0.12)]}
            >
              <cylinderGeometry args={[0.0015, 0.0015, 0.22, 3]} />
              <meshBasicMaterial color="#d8d0c4" />
            </mesh>
          )),
        )}
      </group>
      <mesh position={[-0.82, 0.25, 0]}>
        <sphereGeometry args={[0.2, 15, 11]} />
        <FurMaterial color="#e0d8cc" lighter />
      </mesh>
      <ArticulatedLeg
        legRef={legRefs[0]}
        position={[0.34, -0.25, 0.28]}
        color={fur}
        length={0.36}
      />
      <ArticulatedLeg
        legRef={legRefs[1]}
        position={[0.34, -0.25, -0.28]}
        color={fur}
        length={0.36}
      />
      <ArticulatedLeg
        legRef={legRefs[2]}
        position={[-0.46, -0.24, 0.31]}
        color={fur}
        length={0.42}
      />
      <ArticulatedLeg
        legRef={legRefs[3]}
        position={[-0.46, -0.24, -0.31]}
        color={fur}
        length={0.42}
      />
    </group>
  );
}

function FoxModel({
  legRefs,
  headRef,
  tailRef,
}: {
  legRefs: RefObject<THREE.Group | null>[];
  headRef: RefObject<THREE.Group | null>;
  tailRef: RefObject<THREE.Group | null>;
}) {
  const fur = "#a9572e";
  const dark = "#39261e";
  return (
    <group scale={0.82}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.82]} castShadow>
        <capsuleGeometry args={[0.35, 0.92, 9, 16]} />
        <FurMaterial color={fur} />
      </mesh>
      <mesh position={[0.48, 0.12, 0]} scale={[0.8, 1.05, 0.88]} castShadow>
        <sphereGeometry args={[0.38, 19, 14]} />
        <FurMaterial color="#ba6335" />
      </mesh>
      <mesh position={[0.55, -0.02, 0]} scale={[0.72, 1.05, 0.84]}>
        <sphereGeometry args={[0.25, 14, 11]} />
        <FurMaterial color="#ead8bd" lighter />
      </mesh>
      <group ref={headRef} position={[0.86, 0.42, 0]} rotation={[0, 0, -0.12]}>
        <mesh scale={[1, 0.92, 0.86]} castShadow>
          <sphereGeometry args={[0.34, 18, 13]} />
          <FurMaterial color="#b86134" />
        </mesh>
        <mesh position={[0.34, -0.08, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 0.75, 0.72]}>
          <coneGeometry args={[0.2, 0.52, 14]} />
          <FurMaterial color="#d39a6c" lighter />
        </mesh>
        {[0.19, -0.19].map((z) => (
          <group key={z} position={[-0.08, 0.35, z]} rotation={[0, 0, z > 0 ? -0.1 : 0.1]}>
            <mesh>
              <coneGeometry args={[0.16, 0.38, 12]} />
              <FurMaterial color={fur} />
            </mesh>
            <mesh position={[0, -0.015, z > 0 ? 0.035 : -0.035]} scale={0.62}>
              <coneGeometry args={[0.13, 0.33, 10]} />
              <meshStandardMaterial color="#6d4234" roughness={1} />
            </mesh>
          </group>
        ))}
        <Eye position={[0.18, 0.07, 0.25]} />
        <Eye position={[0.18, 0.07, -0.25]} />
        <mesh position={[0.58, -0.08, 0]}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshPhysicalMaterial color="#171312" roughness={0.25} clearcoat={0.35} />
        </mesh>
      </group>
      <group ref={tailRef} position={[-0.78, 0.16, 0]} rotation={[0, 0, 1.02]}>
        <mesh position={[0, 0.35, 0]} scale={[1, 1, 0.82]}>
          <capsuleGeometry args={[0.2, 0.72, 8, 14]} />
          <FurMaterial color="#b9693c" />
        </mesh>
        <mesh position={[0, 0.78, 0]} scale={[0.9, 1, 0.78]}>
          <capsuleGeometry args={[0.16, 0.38, 8, 12]} />
          <FurMaterial color="#e8d7bd" lighter />
        </mesh>
      </group>
      <ArticulatedLeg
        legRef={legRefs[0]}
        position={[0.55, -0.25, 0.25]}
        color={dark}
        length={0.58}
      />
      <ArticulatedLeg
        legRef={legRefs[1]}
        position={[0.55, -0.25, -0.25]}
        color={dark}
        length={0.58}
      />
      <ArticulatedLeg
        legRef={legRefs[2]}
        position={[-0.48, -0.25, 0.25]}
        color={dark}
        length={0.58}
      />
      <ArticulatedLeg
        legRef={legRefs[3]}
        position={[-0.48, -0.25, -0.25]}
        color={dark}
        length={0.58}
      />
    </group>
  );
}

function AntlerSegment({
  from,
  to,
  radius,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
}) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    return {
      midpoint: start.add(end).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [from, to]);
  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius * 0.62, radius, transform.length, 8, 2]} />
      <meshStandardMaterial
        color="#665440"
        roughness={0.96}
        bumpMap={DEER_COAT_TEXTURE}
        bumpScale={0.012}
      />
    </mesh>
  );
}

function Antler({ side }: { side: -1 | 1 }) {
  const s = side;
  return (
    <group>
      <AntlerSegment from={[-0.09, 0.2, s * 0.13]} to={[-0.14, 0.53, s * 0.18]} radius={0.036} />
      <AntlerSegment from={[-0.14, 0.51, s * 0.18]} to={[-0.28, 0.78, s * 0.2]} radius={0.027} />
      <AntlerSegment from={[-0.2, 0.64, s * 0.19]} to={[-0.02, 0.8, s * 0.24]} radius={0.019} />
      <AntlerSegment from={[-0.27, 0.76, s * 0.2]} to={[-0.36, 0.97, s * 0.19]} radius={0.018} />
      <AntlerSegment from={[-0.29, 0.82, s * 0.19]} to={[-0.13, 0.99, s * 0.24]} radius={0.014} />
    </group>
  );
}

function DeerLeg({
  legRef,
  position,
}: {
  legRef: RefObject<THREE.Group | null>;
  position: [number, number, number];
}) {
  return (
    <group ref={legRef} position={position}>
      {/* Muscled upper leg tapering into the very slender cannon bone. */}
      <mesh position={[0, -0.27, 0]} scale={[1, 1, 0.9]} castShadow>
        <capsuleGeometry args={[0.062, 0.38, 7, 11]} />
        <DeerFurMaterial color="#76583e" />
      </mesh>
      <mesh position={[0.03, -0.53, 0]} castShadow>
        <sphereGeometry args={[0.066, 10, 8]} />
        <DeerFurMaterial color="#654a36" />
      </mesh>
      <mesh position={[0.045, -0.73, 0]} rotation={[0, 0, -0.035]} castShadow>
        <capsuleGeometry args={[0.034, 0.36, 7, 10]} />
        <meshPhysicalMaterial color="#584235" roughness={0.94} sheen={0.12} sheenColor="#806552" />
      </mesh>
      {/* Two separate toes form a proper cloven hoof. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0.105, -0.965, side * 0.027]}
          rotation={[0, side * 0.06, Math.PI / 2 - 0.16]}
          scale={[1.15, 0.7, 0.72]}
          castShadow
        >
          <capsuleGeometry args={[0.028, 0.095, 6, 8]} />
          <meshStandardMaterial color="#211b17" roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

function DeerModel({
  legRefs,
  headRef,
  tailRef,
}: {
  legRefs: RefObject<THREE.Group | null>[];
  headRef: RefObject<THREE.Group | null>;
  tailRef: RefObject<THREE.Group | null>;
}) {
  const fur = "#795a3f";
  return (
    <group scale={1.08}>
      {/* Long rib cage, high shoulders and rounded hindquarters. */}
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1.02, 1.08, 0.72]} castShadow>
        <capsuleGeometry args={[0.36, 1.08, 10, 20]} />
        <DeerFurMaterial color={fur} />
      </mesh>
      <mesh position={[0.46, 0.18, 0]} scale={[0.8, 1.1, 0.82]} castShadow>
        <sphereGeometry args={[0.38, 18, 13]} />
        <DeerFurMaterial color="#815f42" />
      </mesh>
      <mesh position={[-0.5, 0.12, 0]} scale={[0.9, 1.02, 0.84]} castShadow>
        <sphereGeometry args={[0.39, 18, 13]} />
        <DeerFurMaterial color="#74543c" />
      </mesh>
      {/* Pale belly and a subtle dark dorsal line replace juvenile spots. */}
      <mesh position={[-0.02, -0.29, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.68, 1.45, 0.68]}>
        <capsuleGeometry args={[0.17, 0.72, 8, 14]} />
        <DeerFurMaterial color="#b49a78" lighter />
      </mesh>
      <mesh position={[-0.1, 0.38, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.45, 1.6, 0.24]}>
        <capsuleGeometry args={[0.07, 0.7, 7, 12]} />
        <DeerFurMaterial color="#5a402f" />
      </mesh>

      {/* Tapered neck with a defined chest and pale throat. */}
      <mesh
        position={[0.68, 0.59, 0]}
        rotation={[0, 0, -0.35]}
        scale={[0.72, 1.42, 0.7]}
        castShadow
      >
        <capsuleGeometry args={[0.235, 0.72, 9, 17]} />
        <DeerFurMaterial color="#806046" />
      </mesh>
      <mesh position={[0.83, 0.58, 0]} rotation={[0, 0, -0.35]} scale={[0.54, 1.05, 0.7]}>
        <capsuleGeometry args={[0.13, 0.48, 8, 13]} />
        <DeerFurMaterial color="#c2ad8c" lighter />
      </mesh>

      <group ref={headRef} position={[0.98, 1.18, 0]} rotation={[0, 0, -0.12]}>
        <mesh scale={[1.18, 0.84, 0.74]} castShadow>
          <sphereGeometry args={[0.3, 22, 16]} />
          <DeerFurMaterial color="#846447" />
        </mesh>
        {/* Long nasal bridge and tapered muzzle, rather than one round snout. */}
        <mesh
          position={[0.3, -0.075, 0]}
          rotation={[0, 0, -0.06]}
          scale={[1.5, 0.5, 0.58]}
          castShadow
        >
          <capsuleGeometry args={[0.14, 0.34, 9, 16]} />
          <DeerFurMaterial color="#9a7a59" />
        </mesh>
        <mesh position={[0.43, -0.205, 0]} scale={[1.4, 0.45, 0.58]}>
          <sphereGeometry args={[0.15, 14, 10]} />
          <DeerFurMaterial color="#c0a787" lighter />
        </mesh>

        {/* Large pointed ears with a dark rim and pale inner fur. */}
        {[1, -1].map((side) => (
          <group
            key={side}
            position={[-0.1, 0.19, side * 0.29]}
            rotation={[side * -1.08, 0.08, -0.13]}
          >
            <mesh scale={[1, 1.25, 0.55]} castShadow>
              <coneGeometry args={[0.145, 0.4, 12]} />
              <DeerFurMaterial color="#73543d" />
            </mesh>
            <mesh position={[0, -0.015, side * 0.018]} scale={[0.62, 0.82, 0.22]}>
              <coneGeometry args={[0.13, 0.36, 10]} />
              <meshStandardMaterial color="#c49a86" roughness={0.92} />
            </mesh>
          </group>
        ))}

        <Eye position={[0.13, 0.035, 0.245]} />
        <Eye position={[0.13, 0.035, -0.245]} />
        {[1, -1].map((side) => (
          <mesh
            key={`tear-${side}`}
            position={[0.19, -0.015, side * 0.235]}
            scale={[1.7, 0.65, 0.45]}
          >
            <sphereGeometry args={[0.025, 9, 7]} />
            <meshStandardMaterial color="#2c211b" roughness={0.85} />
          </mesh>
        ))}

        <mesh position={[0.61, -0.12, 0]} scale={[1.18, 0.72, 0.88]}>
          <sphereGeometry args={[0.065, 14, 10]} />
          <meshPhysicalMaterial color="#211a17" roughness={0.28} clearcoat={0.32} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh
            key={`nostril-${side}`}
            position={[0.635, -0.105, side * 0.038]}
            scale={[0.55, 0.8, 0.42]}
          >
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshBasicMaterial color="#080706" />
          </mesh>
        ))}
        <mesh position={[0.49, -0.22, 0]} scale={[1.8, 0.15, 0.35]}>
          <sphereGeometry args={[0.07, 10, 7]} />
          <meshStandardMaterial color="#4a342c" roughness={0.88} />
        </mesh>
        <Antler side={1} />
        <Antler side={-1} />
      </group>

      <group ref={tailRef} position={[-0.93, 0.31, 0]} rotation={[0, 0, 0.72]}>
        <mesh scale={[0.55, 1.45, 0.68]} castShadow>
          <capsuleGeometry args={[0.105, 0.28, 8, 12]} />
          <DeerFurMaterial color="#76543b" />
        </mesh>
        <mesh position={[0.025, 0.02, 0]} scale={[0.4, 1.25, 0.72]}>
          <capsuleGeometry args={[0.085, 0.24, 8, 12]} />
          <DeerFurMaterial color="#e1d4bd" lighter />
        </mesh>
      </group>
      <DeerLeg legRef={legRefs[0]} position={[0.58, -0.22, 0.25]} />
      <DeerLeg legRef={legRefs[1]} position={[0.58, -0.22, -0.25]} />
      <DeerLeg legRef={legRefs[2]} position={[-0.58, -0.22, 0.25]} />
      <DeerLeg legRef={legRefs[3]} position={[-0.58, -0.22, -0.25]} />
    </group>
  );
}

function nextPhase(species: WildlifeSpecies, current: AnimalPhase): AnimalPhase {
  const roll = Math.random();
  if (species === "fox") {
    // Raposas exploram pelo olfato; nunca "pastam" como herbívoros.
    if (current === "walk") return roll < 0.48 ? "sniff" : roll < 0.76 ? "look" : "idle";
    if (current === "sniff") return roll < 0.58 ? "walk" : roll < 0.82 ? "look" : "groom";
    if (current === "look") return roll < 0.7 ? "walk" : roll < 0.9 ? "sniff" : "idle";
    if (current === "groom") return roll < 0.72 ? "walk" : "idle";
    return roll < 0.62 ? "walk" : roll < 0.86 ? "sniff" : "look";
  }
  if (species === "rabbit") {
    // Coelhos alternam alimentação com congeladas de vigilância e asseio.
    if (current === "walk") return roll < 0.46 ? "graze" : roll < 0.82 ? "look" : "idle";
    if (current === "graze") return roll < 0.38 ? "look" : roll < 0.74 ? "walk" : "groom";
    if (current === "look") return roll < 0.52 ? "walk" : roll < 0.82 ? "graze" : "idle";
    if (current === "groom") return roll < 0.6 ? "look" : "graze";
    return roll < 0.48 ? "walk" : roll < 0.78 ? "graze" : "groom";
  }
  // Cervos passam longos períodos pastando, mas levantam a cabeça para vigiar.
  if (current === "walk") return roll < 0.58 ? "graze" : roll < 0.86 ? "look" : "idle";
  if (current === "graze") return roll < 0.48 ? "look" : roll < 0.76 ? "walk" : "idle";
  if (current === "look") return roll < 0.5 ? "graze" : roll < 0.82 ? "walk" : "idle";
  if (current === "groom") return roll < 0.65 ? "graze" : "look";
  return roll < 0.48 ? "graze" : roll < 0.8 ? "walk" : "look";
}

function phaseDuration(phase: AnimalPhase, species: WildlifeSpecies) {
  if (phase === "walk") {
    if (species === "rabbit") return 1.2 + Math.random() * 2.8;
    return 4 + Math.random() * (species === "deer" ? 7 : 5);
  }
  if (phase === "graze") return 4 + Math.random() * (species === "deer" ? 9 : 5);
  if (phase === "sniff") return 2.2 + Math.random() * 3.8;
  if (phase === "groom") return 2 + Math.random() * 3;
  if (phase === "look") return species === "rabbit" ? 1.1 + Math.random() * 2.2 : 2 + Math.random() * 3.5;
  return 2.5 + Math.random() * 4;
}

export function PremiumWildlife({ species, radius, speed, offset }: WildlifeProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const shadow = useRef<THREE.Group>(null!);
  const frontLeft = useRef<THREE.Group>(null!);
  const frontRight = useRef<THREE.Group>(null!);
  const backLeft = useRef<THREE.Group>(null!);
  const backRight = useRef<THREE.Group>(null!);
  const legRefs = useMemo(() => [frontLeft, frontRight, backLeft, backRight], []);
  const phase = useRef<AnimalPhase>("walk");
  const phaseEndsAt = useRef(0);
  const walkBlend = useRef(1);
  const collisionLockUntil = useRef(0);
  /* Nasce já fora de moitas/troncos — sem spawn dentro de arbusto. */
  const pos = useRef(
    (() => {
      const spawn = resolveStatic(
        Math.cos(offset) * radius,
        Math.sin(offset) * radius,
        bodyRadiusFor(species),
        { avoidGardenInterior: species !== "rabbit" },
      );
      return { x: spawn.x, z: spawn.z };
    })(),
  );
  /* Ponto de interesse atual: o animal caminha até lá, desacelera e para —
     nada de órbita perfeita em círculo, que parecia robótico. */
  const waypoint = useRef({
    x: Math.cos(offset + 0.9) * radius,
    z: Math.sin(offset + 0.9) * radius,
  });
  const facing = useRef(-offset);
  const id = useMemo(() => `${species}-${offset.toFixed(2)}-${radius}`, [species, offset, radius]);
  const bodyR = bodyRadiusFor(species);
  const groundHeight = groundYFor(species);
  const avoidInterior = species !== "rabbit";
  const moveEase = useRef(0);
  const waypointSetAt = useRef(0);
  const lookTarget = useRef(0);
  const nextLookAt = useRef(0);
  const tailFlick = useRef(0);
  const nextTailFlickAt = useRef(0);

  useEffect(() => {
    registerAnimal(id, pos.current.x, pos.current.z, bodyR);
    return () => unregisterAnimal(id);
  }, [id, bodyR]);

  /* Sorteia um destino curto dentro do anel de habitat do animal. */
  const pickWaypoint = (fromX: number, fromZ: number, now: number) => {
    const minR = Math.max(10.4, radius - 3.5);
    // Mantém o destino dentro do anel físico (resolveStatic maxR ≈ 20.4).
    const maxR = Math.min(20.0, radius + 3.2);
    for (let attempt = 0; attempt < 8; attempt++) {
      const step =
        species === "rabbit"
          ? 1.8 + Math.random() * 3.6
          : species === "fox"
            ? 3.5 + Math.random() * 6
            : 3 + Math.random() * 5.5;
      // Mantém parte da direção anterior: animais reais não sorteiam uma
      // orientação totalmente nova a cada trecho.
      const spread = species === "rabbit" ? 1.8 : species === "fox" ? 1.25 : 1.05;
      const heading = facing.current + (Math.random() - 0.5) * spread;
      const wx = fromX + Math.sin(heading) * step;
      const wz = fromZ + Math.cos(heading) * step;
      const r = Math.hypot(wx, wz);
      if (r < minR || r > maxR) continue;
      /* Destino dentro de moita/tronco/canteiro? Descarta — evita o animal
         ficar empurrando a parede até o timeout. */
      const free = resolveStatic(wx, wz, bodyR, { avoidGardenInterior: avoidInterior });
      if (free.hit) continue;
      waypoint.current = { x: wx, z: wz };
      waypointSetAt.current = now;
      return;
    }
    const a = Math.random() * Math.PI * 2;
    const r = minR + Math.random() * (maxR - minR);
    const fallback = resolveStatic(Math.cos(a) * r, Math.sin(a) * r, bodyR, {
      avoidGardenInterior: avoidInterior,
    });
    waypoint.current = { x: fallback.x, z: fallback.z };
    waypointSetAt.current = now;
  };

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);
    if (phaseEndsAt.current === 0) {
      phaseEndsAt.current = t + phaseDuration(phase.current, species);
      pickWaypoint(pos.current.x, pos.current.z, t);
    }
    if (t >= phaseEndsAt.current) {
      phase.current = nextPhase(species, phase.current);
      phaseEndsAt.current = t + phaseDuration(phase.current, species);
      if (phase.current === "walk") pickWaypoint(pos.current.x, pos.current.z, t);
    }

    // Olhadas e movimentos de cauda são eventos irregulares, não pêndulos.
    if (t >= nextLookAt.current) {
      lookTarget.current = (Math.random() - 0.5) * (species === "rabbit" ? 1.15 : 0.8);
      nextLookAt.current = t + 0.7 + Math.random() * 2.8;
    }
    if (t >= nextTailFlickAt.current) {
      tailFlick.current = 1;
      nextTailFlickAt.current = t + 1.8 + Math.random() * 5.5;
    }
    tailFlick.current = THREE.MathUtils.damp(tailFlick.current, 0, 4.8, dt);

    const walking = phase.current === "walk";
    walkBlend.current = THREE.MathUtils.damp(walkBlend.current, walking ? 1 : 0, 4.5, dt);
    /* Acelera e freia com suavidade — nada de sair do zero à velocidade máxima. */
    moveEase.current = THREE.MathUtils.damp(moveEase.current, walking ? 1 : 0, 2.6, dt);

    if (walking || moveEase.current > 0.02) {
      const toX = waypoint.current.x - pos.current.x;
      const toZ = waypoint.current.z - pos.current.z;
      const distance = Math.hypot(toX, toZ);

      if (walking && distance < 0.45) {
        /* Chegou ao destino: para mais cedo e descansa (pastar/olhar). */
        phase.current =
          species === "fox"
            ? Math.random() < 0.68
              ? "sniff"
              : "look"
            : Math.random() < 0.6
              ? "graze"
              : "look";
        phaseEndsAt.current = t + phaseDuration(phase.current, species);
      } else if (walking && t - waypointSetAt.current > 14) {
        /* Destino inalcançável (preso atrás de algo) — escolhe outro. */
        pickWaypoint(pos.current.x, pos.current.z, t);
      }

      /* Desacelera nos últimos passos antes do destino. */
      const arrive = THREE.MathUtils.clamp(distance / 1.6, 0.25, 1);
      let cadence = 1;
      if (species === "rabbit") {
        // Pequenas arrancadas entre aterrissagens, em vez de deslizar.
        cadence = 0.2 + Math.pow(Math.max(0, Math.sin(t * 5.5 + offset)), 0.55) * 1.25;
      } else if (species === "deer") {
        cadence = 0.92 + Math.sin(t * 1.1 + offset) * 0.08;
      }
      const linearSpeed = speed * radius * 1.15 * moveEase.current * arrive * cadence;

      /* Anda na direção em que está olhando (vira primeiro, anda depois). */
      const targetFacing = Math.atan2(toX, toZ);
      const turn = Math.atan2(
        Math.sin(targetFacing - facing.current),
        Math.cos(targetFacing - facing.current),
      );
      const turnRate = species === "rabbit" ? 4.2 : 2.6;
      facing.current += turn * Math.min(1, dt * turnRate);
      /* Se ainda está muito virado para o lado errado, quase não avança. */
      const alignment = Math.max(0, Math.cos(turn)) ** 2;

      let nx = pos.current.x + Math.sin(facing.current) * linearSpeed * alignment * dt;
      let nz = pos.current.z + Math.cos(facing.current) * linearSpeed * alignment * dt;

      const solid = resolveStatic(nx, nz, bodyR, { avoidGardenInterior: avoidInterior });
      nx = solid.x;
      nz = solid.z;
      const sep = separateFromAnimals(id, nx, nz, bodyR);
      nx = sep.x;
      nz = sep.z;
      // Second pass after separation so animals don't get shoved into trunks
      const solid2 = resolveStatic(nx, nz, bodyR, { avoidGardenInterior: avoidInterior });
      nx = solid2.x;
      nz = solid2.z;

      if ((solid.hit || solid2.hit) && t >= collisionLockUntil.current) {
        /* Bateu em algo: escolhe outro destino em vez de vibrar contra o obstáculo. */
        collisionLockUntil.current = t + (species === "rabbit" ? 0.85 : 1.2);
        phase.current = "look";
        phaseEndsAt.current = t + 0.55 + Math.random() * 1.1;
        facing.current += (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.55);
        pickWaypoint(nx, nz, t);
      }

      pos.current.x = nx;
      pos.current.z = nz;
      registerAnimal(id, nx, nz, bodyR);
    }

    // Hop never sinks feet through the ground — bounce is upward only, clamped
    const strideRate = species === "rabbit" ? 11 : species === "fox" ? 8 : 6.5;
    const gait = t * strideRate + offset * 3;
    const stride = Math.sin(gait) * walkBlend.current;
    const rabbitHop = Math.pow(Math.max(0, Math.sin(gait * 0.5)), 1.35);
    const bounce =
      (species === "rabbit"
        ? rabbitHop * 0.13
        : Math.max(0, Math.abs(Math.sin(gait * 0.5)) * 0.05)) * walkBlend.current;
    const y = groundHeight + bounce;

    if (root.current) {
      root.current.position.set(pos.current.x, y, pos.current.z);
      // Model faces +X; facing is atan2(dx, dz) → convert to Y rotation
      root.current.rotation.y = facing.current - Math.PI / 2;
    }
    // Shadow stays glued to the ground plane (no hop-through)
    if (shadow.current) {
      shadow.current.position.set(pos.current.x, 0, pos.current.z);
    }
    if (body.current) {
      body.current.rotation.z = (-0.02 + Math.sin(gait * 0.5) * 0.03) * walkBlend.current;
      body.current.rotation.x = Math.sin(gait * 0.5) * 0.014 * walkBlend.current;
      /* Respiração visível quando o animal está parado. */
      const breath = 1 + Math.sin(t * 2.1 + offset) * 0.012 * (1 - walkBlend.current);
      body.current.scale.set(1, breath, 1);
    }

    // Smaller leg swing so feet don't dig through the terrain
    const amplitudes = species === "deer" ? 0.38 : species === "fox" ? 0.48 : 0.42;
    if (species === "rabbit") {
      // Rabbits push with both hind legs together and land front paws together.
      const rearKick = Math.sin(gait * 0.5) * amplitudes * walkBlend.current;
      const frontReach = Math.sin(gait * 0.5 + 0.85) * amplitudes * 0.65 * walkBlend.current;
      if (frontLeft.current) frontLeft.current.rotation.z = frontReach;
      if (frontRight.current) frontRight.current.rotation.z = frontReach;
      if (backLeft.current) backLeft.current.rotation.z = -rearKick;
      if (backRight.current) backRight.current.rotation.z = -rearKick;
    } else {
      if (frontLeft.current) frontLeft.current.rotation.z = stride * amplitudes;
      if (frontRight.current) frontRight.current.rotation.z = -stride * amplitudes;
      if (backLeft.current) backLeft.current.rotation.z = -stride * amplitudes;
      if (backRight.current) backRight.current.rotation.z = stride * amplitudes;
    }

    if (head.current) {
      let graze = 0;
      if (phase.current === "graze") {
        /* Cabeça baixa mordiscando, com pequenos puxões — e a cada ciclo
           levanta por ~1,5s para vigiar, como herbívoro de verdade. */
        const vigil = (t * 0.14 + offset) % 1 > 0.82;
        graze = vigil ? 0.05 : 0.6 + Math.sin(t * 5.2 + offset) * 0.045;
      }
      if (phase.current === "sniff") {
        // Focinho próximo ao solo, avançando em pequenas farejadas.
        graze = 0.48 + Math.max(0, Math.sin(t * 3.7 + offset)) * 0.12;
      }
      if (phase.current === "groom") {
        // Coelho limpa o peito; raposa alcança o flanco.
        graze =
          species === "rabbit"
            ? 0.3 + Math.sin(t * 6.5) * 0.12
            : 0.18 + Math.sin(t * 4.2) * 0.08;
      }
      const look =
        phase.current === "look"
          ? lookTarget.current
          : phase.current === "sniff"
            ? Math.sin(t * 1.5 + offset) * 0.22
          : 0;
      head.current.rotation.z = THREE.MathUtils.damp(
        head.current.rotation.z,
        graze + Math.sin(gait * 0.5 + 0.4) * 0.07 * walkBlend.current,
        phase.current === "graze" ? 5 : 3.2,
        dt,
      );
      head.current.rotation.y = THREE.MathUtils.damp(
        head.current.rotation.y,
        look + Math.sin(gait * 0.17) * 0.08 * walkBlend.current,
        phase.current === "look" ? 6 : 2.8,
        dt,
      );
    }
    if (tail.current) {
      const walkSway = walking ? Math.sin(gait * 0.45) * (species === "fox" ? 0.16 : 0.07) : 0;
      const flickDirection = Math.sin((1 - tailFlick.current) * Math.PI * 2);
      tail.current.rotation.y =
        walkSway + flickDirection * tailFlick.current * (species === "deer" ? 0.3 : 0.42);
      tail.current.rotation.z =
        (species === "deer" ? 0.62 : 1.02) +
        Math.sin(gait * 0.5) * 0.08 * walkBlend.current +
        tailFlick.current * (species === "deer" ? 0.22 : 0.08);
    }
  });

  const shadowRadius = species === "deer" ? 0.95 : species === "fox" ? 0.8 : 0.55;

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          {species === "rabbit" && <RabbitModel legRefs={legRefs} headRef={head} />}
          {species === "fox" && <FoxModel legRefs={legRefs} headRef={head} tailRef={tail} />}
          {species === "deer" && <DeerModel legRefs={legRefs} headRef={head} tailRef={tail} />}
        </group>
      </group>
      <group ref={shadow}>
        <ContactShadow radius={shadowRadius} />
      </group>
    </>
  );
}
