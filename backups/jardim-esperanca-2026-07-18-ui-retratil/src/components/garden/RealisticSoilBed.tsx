import { useMemo } from "react";
import * as THREE from "three";
import type { CommunitySeedling } from "@/lib/communityGarden";

function soilSeed(id: string) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++) {
    value ^= id.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function makeRng(start: number) {
  let seed = start >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Multi-octave soil albedo + roughness cues packed into RGB noise. */
function createGardenSoilTexture(seedKey: number) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const random = makeRng(seedKey ^ 0x9e3779b9);

  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seedKey * 0.0001) * 43758.5453;
    return n - Math.floor(n);
  };
  const smoothNoise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  const fbm = (x: number, y: number) => {
    let amp = 0.55;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < 5; o++) {
      sum += smoothNoise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.48;
      freq *= 2.05;
    }
    return sum / norm;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      const grain = fbm(nx * 7.2, ny * 7.2);
      const clump = fbm(nx * 2.4 + 10, ny * 2.4 + 4);
      const organic = fbm(nx * 14 + 3, ny * 14 + 8);
      const grit = random() * 0.22;

      // Warm loam base with darker humus pockets and pale mineral flecks
      const dark = clump * 0.55 + organic * 0.25;
      const r = THREE.MathUtils.clamp(92 + grain * 48 - dark * 42 + grit * 18, 28, 170);
      const g = THREE.MathUtils.clamp(62 + grain * 34 - dark * 36 + grit * 10, 18, 130);
      const b = THREE.MathUtils.clamp(38 + grain * 22 - dark * 28 + grit * 6, 10, 95);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.4, 3.4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSoilNormalProxy(seedKey: number) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const random = makeRng(seedKey ^ 0x85ebca6b);
  for (let i = 0; i < size * size; i++) {
    const n = (random() - 0.5) * 70;
    const o = i * 4;
    data[o] = THREE.MathUtils.clamp(128 + n, 0, 255);
    data[o + 1] = THREE.MathUtils.clamp(128 + n * 0.7, 0, 255);
    data[o + 2] = 210;
    data[o + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4.2, 4.2);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

type ScatterItem = {
  x: number;
  z: number;
  size: number;
  rotation: number;
  shade: number;
  tilt: number;
  kind: number;
};

function scatterInBed(
  random: () => number,
  count: number,
  minR: number,
  maxR: number,
  ringBias = 0,
): ScatterItem[] {
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    let radius = Math.sqrt(random()) * 1.05;
    if (ringBias > 0) radius = Math.min(1.08, radius + ringBias * random());
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      size: minR + random() * (maxR - minR),
      rotation: random() * Math.PI * 2,
      shade: random(),
      tilt: (random() - 0.5) * 0.55,
      kind: Math.floor(random() * 4),
    };
  });
}

export function RealisticSoilBed({
  seedling,
  selected,
}: {
  seedling: CommunitySeedling;
  selected: boolean;
}) {
  const albedo = useMemo(() => createGardenSoilTexture(soilSeed(seedling.id)), [seedling.id]);
  const bump = useMemo(
    () => createSoilNormalProxy(soilSeed(seedling.id) ^ 0x27d4eb2d),
    [seedling.id],
  );

  const data = useMemo(() => {
    const random = makeRng(soilSeed(seedling.id));

    const shape = new THREE.Shape();
    const rimShape = new THREE.Shape();
    const points = 56;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const wobble =
        Math.sin(angle * 2.7 + random() * 0.4) * 0.048 +
        Math.sin(angle * 5.3 + 1.1) * 0.028 +
        Math.cos(angle * 9.1) * 0.016 +
        (random() - 0.5) * 0.042;
      const radius = 1.22 + wobble;
      const rimR = radius * 1.09 + (random() - 0.5) * 0.02;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const rx = Math.cos(angle) * rimR;
      const ry = Math.sin(angle) * rimR;
      if (i === 0) {
        shape.moveTo(x, y);
        rimShape.moveTo(rx, ry);
      } else {
        shape.lineTo(x, y);
        rimShape.lineTo(rx, ry);
      }
    }
    shape.closePath();
    rimShape.closePath();

    // Soft radial height mounds for micro-relief under the flat mesh
    const mounds = Array.from({ length: 7 }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 0.22 + random() * 0.72;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        size: 0.14 + random() * 0.22,
        height: 0.018 + random() * 0.028,
        shade: random(),
      };
    });

    return {
      shape,
      rimShape,
      mounds,
      clods: scatterInBed(random, 14, 0.028, 0.11),
      microClods: scatterInBed(random, 22, 0.012, 0.032),
      pebbles: scatterInBed(random, 11, 0.018, 0.055),
      grit: scatterInBed(random, 28, 0.006, 0.014),
      debris: scatterInBed(random, 10, 0.035, 0.09, 0.15),
      roots: scatterInBed(random, 5, 0.05, 0.12, 0.25),
      cracks: scatterInBed(random, 9, 0.1, 0.32),
      moss: scatterInBed(random, 6, 0.04, 0.09, 0.2),
      castings: scatterInBed(random, 4, 0.04, 0.07),
    };
  }, [seedling.id]);

  const moisture = THREE.MathUtils.clamp(seedling.water / 100, 0, 1);
  const dryness = 1 - moisture;

  const soilColor = useMemo(() => {
    // Seca: terra arenosa clara → Molhada: marrom-chocolate (sem chegar ao preto)
    const dry = new THREE.Color("#ad8a60");
    const damp = new THREE.Color("#7d5c3e");
    const wet = new THREE.Color("#5c452f");
    if (moisture < 0.45) return dry.clone().lerp(damp, moisture / 0.45);
    return damp.clone().lerp(wet, (moisture - 0.45) / 0.55);
  }, [moisture]);

  const rimColor = useMemo(
    () => (selected ? new THREE.Color("#8a6d42") : soilColor.clone().multiplyScalar(0.85)),
    [selected, soilColor],
  );

  // Grama misturada na borda do canteiro (transição natural com o gramado)
  const edgeGrass = useMemo(() => {
    const random = makeRng(soilSeed(seedling.id) ^ 0x51f2a3);
    return Array.from({ length: 16 }, () => {
      const angle = random() * Math.PI * 2;
      const radius = 1.22 + random() * 0.18;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        h: 0.09 + random() * 0.13,
        rot: random() * Math.PI,
        lean: (random() - 0.5) * 0.5,
        c: random() < 0.35 ? "#4d8a44" : random() < 0.7 ? "#5f9c50" : "#6fae5c",
      };
    });
  }, [seedling.id]);

  return (
    <group>
      {/* Outer berm — compacted soil lip of a real planting bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.078, 0]} receiveShadow>
        <shapeGeometry args={[data.rimShape, 28]} />
        <meshStandardMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.04}
          color={rimColor}
          roughness={0.98}
        />
      </mesh>

      {/* Raised rim volume */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.095, 0]} scale={1.02} receiveShadow>
        <shapeGeometry args={[data.shape, 28]} />
        <meshStandardMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.03}
          color={rimColor.clone().multiplyScalar(0.9)}
          roughness={1}
        />
      </mesh>

      {/* Main cultivated surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.112, 0]} receiveShadow>
        <shapeGeometry args={[data.shape, 40]} />
        <meshPhysicalMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={THREE.MathUtils.lerp(0.08, 0.045, moisture)}
          color={soilColor}
          roughness={THREE.MathUtils.lerp(1, 0.72, moisture)}
          metalness={0}
          clearcoat={moisture > 0.55 ? THREE.MathUtils.lerp(0.04, 0.18, moisture) : 0}
          clearcoatRoughness={THREE.MathUtils.lerp(0.95, 0.55, moisture)}
          sheen={0.12}
          sheenRoughness={0.9}
          sheenColor={new THREE.Color("#2a1a10")}
        />
      </mesh>

      {/* Central planting depression — where the muda sits */}
      <mesh
        position={[0, 0.118, 0]}
        rotation={[-Math.PI / 2, 0, seedling.id.length * 0.15]}
        scale={[1, 1, 0.92]}
        receiveShadow
      >
        <circleGeometry args={[0.28, 28]} />
        <meshPhysicalMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.06}
          color={soilColor.clone().multiplyScalar(0.78)}
          roughness={THREE.MathUtils.lerp(0.98, 0.68, moisture)}
          clearcoat={moisture > 0.6 ? 0.12 : 0}
          clearcoatRoughness={0.7}
        />
      </mesh>
      <mesh position={[0, 0.105, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.028, 24]} />
        <meshStandardMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.05}
          color={soilColor.clone().multiplyScalar(0.7)}
          roughness={0.95}
        />
      </mesh>

      {/* Soft subsurface mounds for natural uneven tilled earth */}
      {data.mounds.map((m, i) => (
        <mesh
          key={`mound-${i}`}
          position={[m.x, 0.118 + m.height * 0.35, m.z]}
          scale={[m.size * 2.4, m.height * 4.2, m.size * 2.1]}
          receiveShadow
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            map={albedo}
            bumpMap={bump}
            bumpScale={0.04}
            color={
              m.shade > 0.55
                ? soilColor.clone().multiplyScalar(0.88)
                : soilColor.clone().multiplyScalar(1.06)
            }
            roughness={0.97}
          />
        </mesh>
      ))}

      {/* Large broken clods */}
      {data.clods.map((clod, i) => (
        <mesh
          key={`clod-${i}`}
          position={[clod.x, 0.122 + clod.size * 0.38, clod.z]}
          rotation={[clod.tilt, clod.rotation, clod.tilt * 0.6]}
          scale={[
            1.15 + clod.shade * 0.35,
            0.42 + clod.shade * 0.25,
            0.85 + (1 - clod.shade) * 0.4,
          ]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[clod.size, 0]} />
          <meshStandardMaterial
            map={albedo}
            bumpMap={bump}
            bumpScale={0.035}
            color={
              clod.shade > 0.55
                ? soilColor.clone().multiplyScalar(0.8)
                : soilColor.clone().multiplyScalar(1.12)
            }
            roughness={0.99}
          />
        </mesh>
      ))}

      {/* Fine crumb structure */}
      {data.microClods.map((clod, i) => (
        <mesh
          key={`micro-${i}`}
          position={[clod.x, 0.12 + clod.size * 0.5, clod.z]}
          rotation={[clod.tilt * 2, clod.rotation, 0]}
          scale={[1.1, 0.5, 0.9]}
          castShadow
        >
          <icosahedronGeometry args={[clod.size, 0]} />
          <meshStandardMaterial
            color={soilColor.clone().offsetHSL(0, 0, (clod.shade - 0.5) * 0.08)}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Embedded mineral grit */}
      {data.grit.map((g, i) => (
        <mesh
          key={`grit-${i}`}
          position={[g.x, 0.126, g.z]}
          rotation={[0.4, g.rotation, -0.2]}
          scale={[1.4, 0.35, 1]}
        >
          <dodecahedronGeometry args={[g.size, 0]} />
          <meshStandardMaterial
            color={g.shade > 0.66 ? "#c4b89a" : g.shade > 0.33 ? "#8a8374" : "#5e574c"}
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>
      ))}

      {/* Stones half-buried in the bed */}
      {data.pebbles.map((pebble, i) => (
        <mesh
          key={`pebble-${i}`}
          position={[pebble.x, 0.118 + pebble.size * 0.25, pebble.z]}
          rotation={[0.25 + pebble.tilt, pebble.rotation, -0.15]}
          scale={[1.35, 0.38 + pebble.shade * 0.2, 0.95]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[pebble.size, 0]} />
          <meshStandardMaterial
            color={
              pebble.kind === 0
                ? "#7a7468"
                : pebble.kind === 1
                  ? "#9a9284"
                  : pebble.kind === 2
                    ? "#6b6358"
                    : "#b0a890"
            }
            roughness={0.94}
            flatShading
          />
        </mesh>
      ))}

      {/* Exposed fine rootlets near the rim */}
      {data.roots.map((root, i) => (
        <mesh
          key={`root-${i}`}
          position={[root.x, 0.128, root.z]}
          rotation={[Math.PI / 2, 0, root.rotation]}
        >
          <cylinderGeometry args={[0.004, 0.009, root.size * 2.4, 5]} />
          <meshStandardMaterial color="#6d5238" roughness={1} />
        </mesh>
      ))}

      {/* Leaf litter / dry twigs */}
      {data.debris.map((piece, i) =>
        piece.kind % 2 === 0 ? (
          <mesh
            key={`litter-${i}`}
            position={[piece.x, 0.138, piece.z]}
            rotation={[piece.tilt * 0.4, piece.rotation, piece.tilt]}
            scale={[piece.size * 2.1, 0.008, piece.size * 0.7]}
            castShadow
          >
            <sphereGeometry args={[1, 8, 5]} />
            <meshStandardMaterial
              color={piece.shade > 0.5 ? "#6a4e2e" : piece.shade > 0.25 ? "#8a6840" : "#4a3824"}
              roughness={1}
            />
          </mesh>
        ) : (
          <mesh
            key={`twig-${i}`}
            position={[piece.x, 0.142, piece.z]}
            rotation={[Math.PI / 2, piece.tilt, piece.rotation]}
          >
            <cylinderGeometry args={[0.006, 0.011, piece.size * 2.6, 5]} />
            <meshStandardMaterial color="#4e3824" roughness={1} />
          </mesh>
        ),
      )}

      {/* Worm castings — tiny coiled soil piles */}
      {data.castings.map((c, i) => (
        <group key={`cast-${i}`} position={[c.x, 0.125, c.z]}>
          {[0, 1, 2].map((ring) => (
            <mesh
              key={ring}
              position={[
                Math.cos(ring * 1.8 + c.rotation) * 0.012,
                ring * 0.006,
                Math.sin(ring * 1.8 + c.rotation) * 0.012,
              ]}
              scale={[1.2, 0.45, 1]}
            >
              <torusGeometry args={[c.size * 0.35, c.size * 0.18, 6, 10]} />
              <meshStandardMaterial color={soilColor.clone().multiplyScalar(1.05)} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Sparse moss when the bed stays moist */}
      {moisture > 0.58 &&
        data.moss.map((m, i) => (
          <mesh
            key={`moss-${i}`}
            position={[m.x, 0.132, m.z]}
            rotation={[-Math.PI / 2, 0, m.rotation]}
            scale={[m.size * 1.6, m.size * 1.2, 1]}
          >
            <circleGeometry args={[1, 10]} />
            <meshStandardMaterial
              color={m.shade > 0.5 ? "#3d6b38" : "#4f7d42"}
              roughness={1}
              transparent
              opacity={0.35 + moisture * 0.35}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Desiccation cracks only when dry */}
      {dryness > 0.38 &&
        data.cracks.map((crack, i) => (
          <mesh
            key={`crack-${i}`}
            position={[crack.x, 0.134, crack.z]}
            rotation={[0, crack.rotation, crack.tilt * 0.2]}
            scale={[crack.size, 1, 0.01 + dryness * 0.008]}
          >
            <boxGeometry args={[1, 0.005, 1]} />
            <meshBasicMaterial
              color="#241810"
              transparent
              opacity={(dryness - 0.38) * 0.85}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Wet sheen puddle hint in the planting hole when very watered */}
      {moisture > 0.82 && (
        <mesh position={[0, 0.121, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.18, 0.14, 1]}>
          <circleGeometry args={[1, 20]} />
          <meshPhysicalMaterial
            color="#2a1c12"
            roughness={0.18}
            metalness={0.05}
            clearcoat={0.45}
            clearcoatRoughness={0.25}
            transparent
            opacity={0.22 + (moisture - 0.82) * 0.55}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Tufos de grama invadindo a borda — integra o canteiro ao gramado */}
      {edgeGrass.map((g, i) => (
        <mesh
          key={`edge-grass-${i}`}
          position={[g.x, 0.09 + g.h * 0.5, g.z]}
          rotation={[g.lean * 0.4, g.rot, g.lean]}
        >
          <coneGeometry args={[0.022, g.h, 4]} />
          <meshStandardMaterial color={g.c} roughness={0.95} />
        </mesh>
      ))}

      {selected && (
        <pointLight position={[0, 0.32, 0]} color="#d4b56a" intensity={0.1} distance={2.4} />
      )}
    </group>
  );
}
