import { useMemo } from "react";
import * as THREE from "three";
import type { GardenRenderQuality } from "@/lib/gardenRenderQuality";

type TreeSpecies = "broadleaf" | "ipe" | "pine" | "jacaranda" | "flowering" | "crooked" | "wide";
type RenderQuality = GardenRenderQuality;

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
  const segments = quality === "low" ? 7 : quality === "high" ? 14 : 11;
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
  spread = 1,
  flowerDensity = 1,
}: {
  canopy: string;
  accent: string;
  quality: RenderQuality;
  seed: number;
  flowerTint?: string;
  /** >1 = copa mais larga e achatada (árvore de copa larga). */
  spread?: number;
  /** >1 = árvore florida, com muito mais flores visíveis na copa. */
  flowerDensity?: number;
}) {
  const lowQuality = quality === "low";
  const clumps = useMemo(() => {
    const random = seeded(seed);
    const count = lowQuality ? 5 : 8;
    return Array.from({ length: count }, (_, i) => {
      const layer = Math.floor(i / 3);
      const angle = (i / count) * Math.PI * 2 + random() * 0.55;
      const radial = (0.15 + layer * 0.22 + random() * 0.35) * spread;
      const y = (0.15 + layer * 0.42 + random() * 0.18) / (spread > 1.15 ? 1.35 : 1);
      return {
        position: [Math.cos(angle) * radial, y, Math.sin(angle) * radial] as [
          number,
          number,
          number,
        ],
        /* Achata no eixo Y — copa larga, não bola. */
        scale: [
          (0.85 + random() * 0.55) * spread,
          0.42 + random() * 0.28,
          (0.8 + random() * 0.5) * spread,
        ] as [number, number, number],
        rotation: [(random() - 0.5) * 0.35, angle * 0.4, (random() - 0.5) * 0.3] as [
          number,
          number,
          number,
        ],
        color: i % 3 === 0 ? accent : canopy,
      };
    });
  }, [accent, canopy, lowQuality, seed, spread]);

  const flowers = useMemo(() => {
    if (!flowerTint || lowQuality) return [];
    const random = seeded(seed + 99);
    const count = Math.round(7 * flowerDensity);
    return Array.from({ length: count }, (_, i) => {
      const angle = i * 2.399 + random() * 0.4;
      const radial = (0.35 + random() * 0.65) * spread;
      return {
        position: [Math.cos(angle) * radial, 0.3 + random() * 0.95, Math.sin(angle) * radial] as [
          number,
          number,
          number,
        ],
        scale: (0.05 + random() * 0.05) * (flowerDensity > 1.5 ? 1.6 : 1),
      };
    });
  }, [flowerTint, flowerDensity, lowQuality, seed, spread]);

  return (
    <group position={[0, spread > 1.15 ? 1.85 : 2.05, 0]}>
      {/* Núcleo central mais denso */}
      <mesh
        position={[0, 0.35, 0]}
        scale={[1.15 * spread, 0.72, 1.05 * spread]}
        castShadow={!lowQuality}
      >
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
  const flowering = spec.species === "flowering";
  const wide = spec.species === "wide";
  const flowerTint =
    spec.species === "ipe"
      ? "#d4b84a"
      : spec.species === "jacaranda"
        ? "#7d6aa8"
        : flowering
          ? "#e89ab8"
          : undefined;
  /* Copa larga tem galhos mais longos e visíveis saindo do tronco. */
  const branchLen = wide ? 1.0 : 0.55;
  const branchCount = quality === "low" ? 3 : quality === "high" ? (wide ? 8 : 7) : wide ? 6 : 5;

  return (
    <group>
      <TreeTrunk
        color={spec.trunk}
        height={wide ? 2.05 : 2.35}
        baseRadius={wide ? 0.32 : 0.28}
        topRadius={0.13}
        lean={spec.lean}
        quality={quality}
      />
      {/* Galhos principais aparentes — dão estrutura à silhueta */}
      {Array.from({ length: branchCount }, (_, i) => {
        const angle = (i / branchCount) * Math.PI * 2 + spec.id * 0.17;
        const y = (wide ? 1.35 : 1.55) + (i % 3) * 0.22;
        const len = branchLen + (i % 2) * 0.25;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * len * 0.45, y, Math.sin(angle) * len * 0.45]}
            rotation={[0.55, -angle, wide ? 1.1 : 0.9]}
            castShadow={quality !== "low"}
          >
            <cylinderGeometry args={[0.035, wide ? 0.09 : 0.07, len, 6]} />
            <BarkMaterial color={spec.trunk} />
          </mesh>
        );
      })}
      <BroadleafCrown
        canopy={flowering ? "#4b6a42" : spec.canopy}
        accent={flowering ? "#d98bab" : spec.accent}
        quality={quality}
        seed={spec.id * 7919 + 11}
        flowerTint={flowerTint}
        spread={wide ? 1.45 : 1}
        flowerDensity={flowering ? 2.4 : 1}
      />
    </group>
  );
}

/** Árvore torta: tronco curvado em segmentos, copa deslocada na direção da curva. */
function CrookedTree({ spec, quality }: { spec: TreeSpec; quality: RenderQuality }) {
  const lowQuality = quality === "low";
  const segments = quality === "low" ? 7 : quality === "high" ? 13 : 10;
  const bend = 0.32 + (spec.id % 4) * 0.07;
  const dir = spec.id % 2 === 0 ? 1 : -1;

  return (
    <group>
      {/* Root flare */}
      <mesh position={[0, 0.08, 0]} castShadow={!lowQuality}>
        <cylinderGeometry args={[0.34, 0.44, 0.26, segments, 1]} />
        <BarkMaterial color={spec.trunk} />
      </mesh>
      {/* Três segmentos progressivamente inclinados formam a curva */}
      <group rotation={[0, 0, bend * 0.4 * dir]}>
        <mesh position={[0, 0.55, 0]} castShadow={!lowQuality}>
          <cylinderGeometry args={[0.21, 0.27, 1.05, segments, 2]} />
          <BarkMaterial color={spec.trunk} />
        </mesh>
        <group position={[0, 1.02, 0]} rotation={[0, 0, bend * 0.7 * dir]}>
          <mesh position={[0, 0.45, 0]} castShadow={!lowQuality}>
            <cylinderGeometry args={[0.15, 0.21, 0.95, segments, 2]} />
            <BarkMaterial color={spec.trunk} />
          </mesh>
          <group position={[0, 0.88, 0]} rotation={[0, 0, bend * 0.8 * dir]}>
            <mesh position={[0, 0.35, 0]} castShadow={!lowQuality}>
              <cylinderGeometry args={[0.1, 0.15, 0.75, segments, 1]} />
              <BarkMaterial color={spec.trunk} />
            </mesh>
            {/* Galho seco aparente na curva — charme de árvore antiga */}
            <mesh position={[0.3 * dir, 0.25, 0.1]} rotation={[0.3, 0.4, 1.15 * dir]}>
              <cylinderGeometry args={[0.025, 0.05, 0.65, 5]} />
              <BarkMaterial color={spec.trunk} />
            </mesh>
            {/* Compensa o offset interno da copa (2.05) para ela assentar no topo da curva */}
            <group position={[0, -1.45, 0]}>
              <BroadleafCrown
                canopy={spec.canopy}
                accent={spec.accent}
                quality={quality}
                seed={spec.id * 5417 + 29}
                spread={0.88}
              />
            </group>
          </group>
        </group>
      </group>
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
      ) : spec.species === "crooked" ? (
        <CrookedTree spec={spec} quality={quality} />
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
    const count =
      quality === "low" ? 14 : quality === "high" ? (isMobile ? 24 : 34) : isMobile ? 18 : 26;
    const random = seeded(20260718);
    const species: TreeSpecies[] = [
      "broadleaf",
      "ipe",
      "pine",
      "flowering",
      "crooked",
      "wide",
      "jacaranda",
      "pine",
      "broadleaf",
      "flowering",
    ];
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
              : kind === "flowering"
                ? { canopy: "#4b6a42", accent: "#d98bab" }
                : kind === "crooked"
                  ? { canopy: "#41603a", accent: "#557548" }
                  : kind === "wide"
                    ? { canopy: "#3c5c38", accent: "#517046" }
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
  }, [isMobile, quality]);

  const understory = useMemo(() => {
    const count =
      quality === "low" ? 10 : quality === "high" ? (isMobile ? 22 : 32) : isMobile ? 16 : 24;
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
  }, [isMobile, quality]);

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
