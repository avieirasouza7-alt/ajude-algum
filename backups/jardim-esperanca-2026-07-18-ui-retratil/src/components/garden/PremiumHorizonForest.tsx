import { useMemo } from "react";
import * as THREE from "three";

type TreeSpecies = "broadleaf" | "ipe" | "pine" | "jacaranda";
type RenderQuality = "low" | "balanced";

type TreeSpec = {
  id: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  lean: number;
  species: TreeSpecies;
  trunk: string;
  canopy: string;
  accent: string;
  shade: number;
};

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createBarkTexture() {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const random = seeded(78341);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const ridge = Math.sin(x * 0.55 + Math.sin(y * 0.07) * 2.2) * 28;
      const crack = Math.sin(y * 0.42 + x * 0.05) * 12;
      const noise = (random() - 0.5) * 26;
      const value = THREE.MathUtils.clamp(98 + ridge + crack + noise, 18, 210);
      data[i] = value * 0.92;
      data[i + 1] = value * 0.82;
      data[i + 2] = value * 0.68;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 4.5);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createFoliageTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const random = seeded(44127);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const blotch = Math.sin(x * 0.35) * Math.cos(y * 0.28) * 18;
      const noise = (random() - 0.5) * 40;
      const value = THREE.MathUtils.clamp(150 + blotch + noise, 70, 230);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const BARK_TEXTURE = createBarkTexture();
const FOLIAGE_TEXTURE = createFoliageTexture();

function BarkMaterial({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      map={BARK_TEXTURE}
      bumpMap={BARK_TEXTURE}
      bumpScale={0.055}
      roughness={0.98}
    />
  );
}

function FoliageMaterial({
  color,
  sheenColor = "#6f9460",
  quality,
}: {
  color: string;
  sheenColor?: string;
  quality: RenderQuality;
}) {
  return (
    <meshPhysicalMaterial
      color={color}
      map={FOLIAGE_TEXTURE}
      roughness={0.96}
      sheen={quality === "low" ? 0 : 0.12}
      sheenColor={sheenColor}
      sheenRoughness={0.85}
      flatShading={false}
    />
  );
}

/** Tronco ligeiramente inclinado com flare na base — silhueta de árvore adulta. */
function TreeTrunk({
  color,
  height,
  baseRadius,
  topRadius,
  lean,
  quality,
}: {
  color: string;
  height: number;
  baseRadius: number;
  topRadius: number;
  lean: number;
  quality: RenderQuality;
}) {
  const segments = quality === "low" ? 7 : 11;
  return (
    <group rotation={[lean * 0.35, 0, lean]}>
      {/* Root flare */}
      <mesh position={[0, 0.08, 0]} castShadow={quality !== "low"}>
        <cylinderGeometry args={[baseRadius * 1.35, baseRadius * 1.7, 0.28, segments, 1]} />
        <BarkMaterial color={color} />
      </mesh>
      <mesh position={[0, height * 0.48, 0]} castShadow={quality !== "low"}>
        <cylinderGeometry args={[topRadius, baseRadius, height, segments, 4]} />
        <BarkMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * Copa de folhosa: massas achatadas e assimétricas (não esferas perfeitas),
 * empilhadas como em árvores reais vistas de longe.
 */
function BroadleafCrown({
  canopy,
  accent,
  quality,
  seed,
  flowerTint,
}: {
  canopy: string;
  accent: string;
  quality: RenderQuality;
  seed: number;
  flowerTint?: string;
}) {
  const lowQuality = quality === "low";
  const clumps = useMemo(() => {
    const random = seeded(seed);
    const count = lowQuality ? 5 : 8;
    return Array.from({ length: count }, (_, i) => {
      const layer = Math.floor(i / 3);
      const angle = (i / count) * Math.PI * 2 + random() * 0.55;
      const radial = 0.15 + layer * 0.22 + random() * 0.35;
      const y = 0.15 + layer * 0.42 + random() * 0.18;
      return {
        position: [Math.cos(angle) * radial, y, Math.sin(angle) * radial] as [
          number,
          number,
          number,
        ],
        /* Achata no eixo Y — copa larga, não bola. */
        scale: [0.85 + random() * 0.55, 0.42 + random() * 0.28, 0.8 + random() * 0.5] as [
          number,
          number,
          number,
        ],
        rotation: [(random() - 0.5) * 0.35, angle * 0.4, (random() - 0.5) * 0.3] as [
          number,
          number,
          number,
        ],
        color: i % 3 === 0 ? accent : canopy,
      };
    });
  }, [accent, canopy, lowQuality, seed]);

  const flowers = useMemo(() => {
    if (!flowerTint || lowQuality) return [];
    const random = seeded(seed + 99);
    return Array.from({ length: 7 }, (_, i) => {
      const angle = i * 2.399 + random() * 0.4;
      const radial = 0.35 + random() * 0.55;
      return {
        position: [Math.cos(angle) * radial, 0.35 + random() * 0.85, Math.sin(angle) * radial] as [
          number,
          number,
          number,
        ],
        scale: 0.05 + random() * 0.04,
      };
    });
  }, [flowerTint, lowQuality, seed]);

  return (
    <group position={[0, 2.05, 0]}>
      {/* Núcleo central mais denso */}
      <mesh position={[0, 0.35, 0]} scale={[1.15, 0.72, 1.05]} castShadow={!lowQuality}>
        <icosahedronGeometry args={[0.95, lowQuality ? 0 : 1]} />
        <FoliageMaterial color={canopy} quality={quality} />
      </mesh>
      {clumps.map((clump, i) => (
        <mesh
          key={i}
          position={clump.position}
          rotation={clump.rotation}
          scale={clump.scale}
          castShadow={!lowQuality}
        >
          <icosahedronGeometry args={[0.72, lowQuality ? 0 : 1]} />
          <FoliageMaterial color={clump.color} quality={quality} />
        </mesh>
      ))}
      {flowers.map((flower, i) => (
        <mesh key={`f-${i}`} position={flower.position} scale={flower.scale}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshStandardMaterial color={flowerTint} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Pinheiro: cones irregulares empilhados, não pirâmide perfeita. */
function PineTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  const lowQuality = quality === "low";
  const layers = useMemo(() => {
    const random = seeded(spec.id * 913 + 3);
    const count = lowQuality ? 4 : 6;
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      return {
        y: 1.05 + i * 0.48 + random() * 0.08,
        radius: (1.35 - t * 0.95) * (0.88 + random() * 0.22),
        height: 0.85 + random() * 0.25,
        rotation: random() * Math.PI,
        squash: 0.82 + random() * 0.2,
        color: i % 2 === 0 ? spec.canopy : spec.accent,
      };
    });
  }, [lowQuality, spec]);

  return (
    <group>
      <TreeTrunk
        color={spec.trunk}
        height={2.9}
        baseRadius={0.22}
        topRadius={0.1}
        lean={spec.lean}
        quality={quality}
      />
      {layers.map((layer, i) => (
        <mesh
          key={i}
          position={[0, layer.y, 0]}
          rotation={[0, layer.rotation, 0]}
          scale={[1, 1, layer.squash]}
          castShadow={!lowQuality}
        >
          <coneGeometry args={[layer.radius, layer.height, lowQuality ? 8 : 12, 1]} />
          <FoliageMaterial color={layer.color} sheenColor="#5a7a58" quality={quality} />
        </mesh>
      ))}
    </group>
  );
}

function BroadleafTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  const flowerTint =
    spec.species === "ipe" ? "#d4b84a" : spec.species === "jacaranda" ? "#7d6aa8" : undefined;

  return (
    <group>
      <TreeTrunk
        color={spec.trunk}
        height={2.35}
        baseRadius={0.28}
        topRadius={0.13}
        lean={spec.lean}
        quality={quality}
      />
      {/* Galhos principais curtos — só silhueta, sem “palito” exagerado */}
      {(quality === "low" ? [0, 1, 2] : [0, 1, 2, 3, 4]).map((i) => {
        const angle = (i / 5) * Math.PI * 2 + spec.id * 0.17;
        const y = 1.55 + (i % 3) * 0.22;
        const len = 0.55 + (i % 2) * 0.2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * len * 0.45, y, Math.sin(angle) * len * 0.45]}
            rotation={[0.55, -angle, 0.9]}
            castShadow={quality !== "low"}
          >
            <cylinderGeometry args={[0.035, 0.07, len, 6]} />
            <BarkMaterial color={spec.trunk} />
          </mesh>
        );
      })}
      <BroadleafCrown
        canopy={spec.canopy}
        accent={spec.accent}
        quality={quality}
        seed={spec.id * 7919 + 11}
        flowerTint={flowerTint}
      />
    </group>
  );
}

function PremiumTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  return (
    <group
      position={spec.position}
      rotation={[0, spec.rotation, 0]}
      scale={[spec.scale, spec.scale * (0.92 + (spec.id % 5) * 0.03), spec.scale]}
    >
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
    const count = lowQuality ? 14 : isMobile ? 18 : 26;
    const random = seeded(20260718);
    const species: TreeSpecies[] = ["broadleaf", "ipe", "pine", "jacaranda", "broadleaf", "pine"];
    return Array.from({ length: count }, (_, i): TreeSpec => {
      /* Anéis irregulares — evita círculo perfeito de “cercado”. */
      const ring = i % 3;
      const baseR = ring === 0 ? 20.5 : ring === 1 ? 23.2 : 26;
      const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.28;
      const radius = baseR + random() * 3.2;
      const kind = species[i % species.length];
      const shade = 0.78 + random() * 0.28;
      const palette =
        kind === "pine"
          ? { canopy: "#2a4632", accent: "#355540" }
          : kind === "jacaranda"
            ? { canopy: "#3d5a38", accent: "#4d6b45" }
            : kind === "ipe"
              ? { canopy: "#3a5836", accent: "#4a6a40" }
              : { canopy: "#355234", accent: "#456440" };
      return {
        id: i + 1,
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rotation: random() * Math.PI * 2,
        scale: (1.05 + random() * 0.85) * shade,
        lean: (random() - 0.5) * 0.12,
        species: kind,
        trunk: random() > 0.5 ? "#4a3828" : "#3f3024",
        canopy: palette.canopy,
        accent: palette.accent,
        shade,
      };
    });
  }, [isMobile, lowQuality]);

  const understory = useMemo(() => {
    const count = lowQuality ? 10 : isMobile ? 16 : 24;
    const random = seeded(99101);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + random() * 0.4;
      const radius = 19.8 + random() * 2.4;
      return {
        position: [Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius] as [
          number,
          number,
          number,
        ],
        scale: [0.55 + random() * 0.45, 0.35 + random() * 0.35, 0.5 + random() * 0.4] as [
          number,
          number,
          number,
        ],
        color: random() > 0.5 ? "#2f4a30" : "#3a5536",
      };
    });
  }, [isMobile, lowQuality]);

  return (
    <group>
      {trees.map((tree) => (
        <PremiumTree key={tree.id} spec={tree} quality={quality} />
      ))}
      {/* Arbustos baixos — preenchimento natural entre troncos */}
      {understory.map((bush, i) => (
        <mesh key={i} position={bush.position} scale={bush.scale} castShadow={!lowQuality}>
          <icosahedronGeometry args={[1, lowQuality ? 0 : 1]} />
          <meshStandardMaterial color={bush.color} map={FOLIAGE_TEXTURE} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
