import { useMemo } from "react";
import * as THREE from "three";

type TreeSpecies = "oak" | "ipê" | "pine" | "jacaranda";
type RenderQuality = "low" | "balanced";

type TreeSpec = {
  id: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  species: TreeSpecies;
  trunk: string;
  canopy: string;
  accent: string;
};

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createBarkTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const random = seeded(78341);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const verticalRidge = Math.sin(x * 0.72 + Math.sin(y * 0.08) * 1.8) * 24;
      const cracks = Math.sin(y * 0.35 + x * 0.08) * 10;
      const noise = (random() - 0.5) * 22;
      const value = THREE.MathUtils.clamp(112 + verticalRidge + cracks + noise, 25, 220);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 5);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const BARK_TEXTURE = createBarkTexture();

function BarkMaterial({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      map={BARK_TEXTURE}
      bumpMap={BARK_TEXTURE}
      bumpScale={0.045}
      roughness={1}
    />
  );
}

function Branch({
  from,
  to,
  radius,
  color,
  castShadow,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
  castShadow: boolean;
}) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const finish = new THREE.Vector3(...to);
    const direction = finish.clone().sub(start);
    const midpoint = start.clone().add(finish).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    return { midpoint, quaternion, length: direction.length() };
  }, [from, to]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow={castShadow}>
      <cylinderGeometry args={[radius * 0.42, radius, transform.length, 10, 3]} />
      <BarkMaterial color={color} />
    </mesh>
  );
}

function BroadleafTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  const lowQuality = quality === "low";
  const data = useMemo(() => {
    const random = seeded(spec.id * 8191 + 17);
    const branchCount = lowQuality ? 3 : 6;
    const branches = Array.from({ length: branchCount }, (_, i) => {
      const angle = (i / branchCount) * Math.PI * 2 + random() * 0.45;
      const startHeight = 1.45 + random() * 0.9;
      const length = 0.9 + random() * 0.75;
      return {
        from: [0, startHeight, 0] as [number, number, number],
        to: [
          Math.cos(angle) * length,
          startHeight + 0.65 + random() * 0.75,
          Math.sin(angle) * length,
        ] as [number, number, number],
        twig: [
          Math.cos(angle + (random() - 0.5) * 0.65) * (length + 0.45),
          startHeight + 1.1 + random() * 0.8,
          Math.sin(angle + (random() - 0.5) * 0.65) * (length + 0.45),
        ] as [number, number, number],
        radius: 0.11 + random() * 0.055,
      };
    });
    const crown = Array.from({ length: lowQuality ? 5 : 9 }, (_, i) => {
      const angle = i * 2.39996;
      const layer = i % 3;
      const radial = 0.48 + layer * 0.38;
      return {
        position: [
          Math.cos(angle) * radial,
          2.65 + Math.sin(i * 1.7) * 0.34 + layer * 0.16,
          Math.sin(angle) * radial,
        ] as [number, number, number],
        scale: [0.72 + random() * 0.42, 0.58 + random() * 0.34, 0.72 + random() * 0.42] as [
          number,
          number,
          number,
        ],
        color: i % 4 === 0 ? spec.accent : spec.canopy,
      };
    });
    const leaves = Array.from({ length: lowQuality ? 0 : 8 }, (_, i) => {
      const a = i * 2.39996 + random() * 0.4;
      const radial = 0.72 + random() * 0.85;
      return {
        position: [Math.cos(a) * radial, 2.55 + (random() - 0.35) * 1.55, Math.sin(a) * radial] as [
          number,
          number,
          number,
        ],
        rotation: [(random() - 0.5) * 0.65, a, (random() - 0.5) * 0.8] as [number, number, number],
        scale: [0.22 + random() * 0.16, 0.07 + random() * 0.05, 0.025] as [number, number, number],
        color: i % 3 === 0 ? spec.accent : spec.canopy,
      };
    });
    return { branches, crown, leaves };
  }, [lowQuality, spec]);

  return (
    <group>
      {/* Root flare */}
      {(lowQuality ? [0, 1, 2] : [0, 1, 2, 3, 4]).map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={`root-${i}`}
            position={[Math.cos(angle) * 0.2, 0.12, Math.sin(angle) * 0.2]}
            rotation={[0, -angle, 1.18]}
            scale={[1, 1, 0.75]}
            castShadow={!lowQuality}
          >
            <coneGeometry args={[0.12, 0.58, 8]} />
            <meshStandardMaterial color={spec.trunk} roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.25, 0]} castShadow={!lowQuality}>
        <cylinderGeometry args={[0.19, 0.36, 2.5, lowQuality ? 8 : 14, 5]} />
        <BarkMaterial color={spec.trunk} />
      </mesh>
      {data.branches.map((branch, i) => (
        <group key={i}>
          <Branch
            from={branch.from}
            to={branch.to}
            radius={branch.radius}
            color={spec.trunk}
            castShadow={!lowQuality}
          />
          {!lowQuality && (
            <Branch
              from={branch.to}
              to={branch.twig}
              radius={branch.radius * 0.48}
              color={spec.trunk}
              castShadow
            />
          )}
        </group>
      ))}
      {data.crown.map((cluster, i) => (
        <mesh
          key={`crown-${i}`}
          position={cluster.position}
          scale={cluster.scale}
          castShadow={!lowQuality}
        >
          <sphereGeometry args={[0.82, lowQuality ? 9 : 16, lowQuality ? 7 : 11]} />
          <meshPhysicalMaterial
            color={cluster.color}
            roughness={0.9}
            sheen={0.18}
            sheenColor="#8dbb72"
            sheenRoughness={0.78}
          />
        </mesh>
      ))}
      {data.leaves.map((leaf, i) => (
        <mesh
          key={`leaf-${i}`}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          castShadow
        >
          <sphereGeometry args={[1, 10, 6]} />
          <meshPhysicalMaterial
            color={leaf.color}
            roughness={0.78}
            sheen={0.3}
            sheenColor="#a8ca8a"
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {(spec.species === "ipê" || spec.species === "jacaranda") &&
        Array.from({ length: lowQuality ? 4 : 10 }, (_, i) => {
          const angle = i * 2.39996;
          const radius = 0.65 + (i % 4) * 0.25;
          return (
            <mesh
              key={`flower-${i}`}
              position={[
                Math.cos(angle) * radius,
                2.75 + Math.sin(i * 1.4) * 0.65,
                Math.sin(angle) * radius,
              ]}
            >
              <sphereGeometry args={[0.08, 8, 6]} />
              <meshStandardMaterial
                color={spec.species === "ipê" ? "#e8c954" : "#8f76b8"}
                roughness={0.75}
              />
            </mesh>
          );
        })}
    </group>
  );
}

function PineTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  const lowQuality = quality === "low";
  const layers = useMemo(
    () =>
      Array.from({ length: lowQuality ? 4 : 6 }, (_, i) => ({
        y: 1.15 + i * 0.4,
        radius: 1.18 - i * 0.12,
        height: 1.05,
        rotation: i * 0.47,
      })),
    [lowQuality],
  );
  return (
    <group>
      <mesh position={[0, 1.55, 0]} castShadow={!lowQuality}>
        <cylinderGeometry args={[0.14, 0.25, 3.1, lowQuality ? 7 : 10, 3]} />
        <BarkMaterial color={spec.trunk} />
      </mesh>
      {layers.map((layer, i) => (
        <mesh
          key={i}
          position={[0, layer.y, 0]}
          rotation={[0, layer.rotation, 0]}
          scale={[1, 1, 0.88 + (i % 2) * 0.08]}
          castShadow={!lowQuality}
        >
          <coneGeometry args={[layer.radius, layer.height, lowQuality ? 9 : 14]} />
          <meshPhysicalMaterial
            color={i % 3 === 0 ? spec.accent : spec.canopy}
            roughness={0.94}
            sheen={0.16}
            sheenColor="#608866"
          />
        </mesh>
      ))}
    </group>
  );
}

function PremiumTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  return (
    <group position={spec.position} rotation={[0, spec.rotation, 0]} scale={spec.scale}>
      {spec.species === "pine" ? (
        <PineTree spec={spec} quality={quality} />
      ) : (
        <BroadleafTree spec={spec} quality={quality} />
      )}
    </group>
  );
}

export function PremiumHorizonForest({
  isMobile,
  quality = "balanced",
}: {
  isMobile?: boolean;
  quality?: RenderQuality;
}) {
  const lowQuality = quality === "low";
  const trees = useMemo(() => {
    const count = lowQuality ? 12 : isMobile ? 16 : 24;
    const random = seeded(20260717);
    const species: TreeSpecies[] = ["oak", "ipê", "pine", "jacaranda"];
    return Array.from({ length: count }, (_, i): TreeSpec => {
      const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.16;
      const radius = 21 + random() * 5.5;
      const kind = species[i % species.length];
      const greens =
        kind === "pine"
          ? ["#274834", "#345b3d"]
          : kind === "jacaranda"
            ? ["#4d7043", "#607d4c"]
            : ["#3f6b3d", "#527b45"];
      return {
        id: i,
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rotation: random() * Math.PI * 2,
        scale: 1.15 + random() * 0.72,
        species: kind,
        trunk: i % 2 ? "#59422f" : "#67503a",
        canopy: greens[0],
        accent: greens[1],
      };
    });
  }, [isMobile, lowQuality]);

  const shrubs = useMemo(() => {
    const count = lowQuality ? 12 : isMobile ? 18 : 30;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 20.5 + (i % 4) * 0.38;
      return {
        position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius] as [
          number,
          number,
          number,
        ],
        scale: [0.7 + (i % 3) * 0.14, 0.55 + (i % 4) * 0.1, 0.72] as [number, number, number],
      };
    });
  }, [isMobile, lowQuality]);

  return (
    <group>
      {trees.map((tree) => (
        <PremiumTree key={tree.id} spec={tree} quality={quality} />
      ))}
      {shrubs.map((shrub, i) => (
        <mesh key={i} position={shrub.position} scale={shrub.scale} castShadow={!lowQuality}>
          <icosahedronGeometry args={[1, lowQuality ? 0 : 1]} />
          <meshStandardMaterial color={i % 2 ? "#456f3d" : "#527c43"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
