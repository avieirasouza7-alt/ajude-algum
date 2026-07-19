import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * Flores realistas do gramado.
 *
 * Duas camadas:
 *  1. Campo instanciado — centenas de pétalas/hastes em poucas draw calls,
 *     com 5 espécies variadas (margarida, papoula, calêndula, lavanda e
 *     campânula) espalhadas pelo gramado.
 *  2. Flores "hero" — poucas flores individuais super detalhadas perto dos
 *     canteiros (estames, sépalas, folhas, caule curvo) que balançam no vento.
 */

function makeRng(start: number) {
  let seed = start >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const BED_SPOTS: [number, number][] = [
  [0, 0],
  [-5, -5],
  [5, -5],
  [-5, 5],
  [5, 5],
];

/** Ponto no gramado evitando caminhos e canteiros. */
function pickSpot(rnd: () => number): [number, number] {
  for (let attempt = 0; attempt < 14; attempt++) {
    const inSquare = rnd() < 0.6;
    let x: number;
    let z: number;
    if (inSquare) {
      x = (rnd() - 0.5) * 17.4;
      z = (rnd() - 0.5) * 17.4;
      if (Math.abs(x) < 1.05 || Math.abs(z) < 1.05) continue;
    } else {
      const a = rnd() * Math.PI * 2;
      const r = 10.5 + rnd() * 4.5;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    let nearBed = false;
    for (const [bx, bz] of BED_SPOTS) {
      if ((x - bx) * (x - bx) + (z - bz) * (z - bz) < 3.1) {
        nearBed = true;
        break;
      }
    }
    if (!nearBed) return [x, z];
  }
  return [11.5, 11.5];
}

/* Texturas ---------------------------------------------------------------- */

/** Pétala com veias radiais e base levemente mais escura (tingida por instância). */
function createPetalTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, size, 0, 0);
  gradient.addColorStop(0, "#d8d2c6");
  gradient.addColorStop(0.3, "#f4f0e8");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(150,140,120,0.28)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(size / 2, size);
    ctx.quadraticCurveTo(size / 2 + i * 7, size * 0.5, size / 2 + i * 11, 0);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Miolo granulado (dezenas de floretes minúsculos, como girassol/margarida). */
function createFlowerCenterTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c89018";
  ctx.fillRect(0, 0, size, size);
  const rnd = makeRng(41912);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 1 + rnd() * 1.6;
    const shadeRoll = rnd();
    ctx.fillStyle = shadeRoll < 0.4 ? "#a87410" : shadeRoll < 0.75 ? "#e0a828" : "#8a5e0c";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const PETAL_TEXTURE = createPetalTexture();
const CENTER_TEXTURE = createFlowerCenterTexture();

/* Geometrias -------------------------------------------------------------- */

/**
 * Pétala com forma de gota, calha central e ponta erguida.
 * Fica deitada no plano XZ apontando para +Z (base na origem).
 */
function createPetalGeometry(length: number, width: number, curl: number, tipCurl: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.55, length * 0.22, width * 0.5, length * 0.78, 0, length);
  shape.bezierCurveTo(-width * 0.5, length * 0.78, -width * 0.55, length * 0.22, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const t = y / length;
    /* Calha (bordas sobem) + ponta curvada para cima. */
    const trough = Math.abs(x) * curl;
    const lift = Math.pow(t, 2.2) * tipCurl;
    position.setZ(i, -(trough + lift));
  }
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Folha verde estreita com veia central (compartilhada por todas as espécies). */
function createLeafGeometry() {
  return createPetalGeometry(0.14, 0.04, 0.35, 0.028);
}

type FieldQuality = { low?: boolean; isMobile?: boolean };

/* Materiais --------------------------------------------------------------- */

function PetalMaterial({ roughness = 0.62 }: { roughness?: number }) {
  return (
    <meshPhysicalMaterial
      color="#ffffff"
      map={PETAL_TEXTURE}
      roughness={roughness}
      sheen={0.55}
      sheenColor="#fff4f4"
      sheenRoughness={0.6}
      side={THREE.DoubleSide}
    />
  );
}

/* Campo de flores instanciado ---------------------------------------------- */

type FlowerInstance = {
  x: number;
  z: number;
  height: number;
  headTilt: number;
  headYaw: number;
  scale: number;
};

function scatterFlowers(seed: number, count: number): FlowerInstance[] {
  const rnd = makeRng(seed);
  return Array.from({ length: count }, () => {
    const [x, z] = pickSpot(rnd);
    return {
      x,
      z,
      height: 0.22 + rnd() * 0.2,
      headTilt: (rnd() - 0.5) * 0.45,
      headYaw: rnd() * Math.PI * 2,
      scale: 1.15 + rnd() * 0.7,
    };
  });
}

export function RealisticFlowerField({ low = false, isMobile = false }: FieldQuality) {
  const stems = useRef<THREE.InstancedMesh>(null!);
  const leaves = useRef<THREE.InstancedMesh>(null!);
  const daisyPetals = useRef<THREE.InstancedMesh>(null!);
  const daisyCenters = useRef<THREE.InstancedMesh>(null!);
  const poppyPetals = useRef<THREE.InstancedMesh>(null!);
  const poppyCenters = useRef<THREE.InstancedMesh>(null!);
  const marigoldPetals = useRef<THREE.InstancedMesh>(null!);
  const marigoldCenters = useRef<THREE.InstancedMesh>(null!);
  const lavenderFlorets = useRef<THREE.InstancedMesh>(null!);
  const bells = useRef<THREE.InstancedMesh>(null!);

  const dense = !low && !isMobile;
  const counts = useMemo(
    () => ({
      daisies: low ? 14 : isMobile ? 22 : 36,
      poppies: low ? 9 : isMobile ? 14 : 22,
      marigolds: low ? 9 : isMobile ? 14 : 22,
      lavenders: low ? 8 : isMobile ? 12 : 20,
      bellflowers: low ? 7 : isMobile ? 10 : 16,
    }),
    [low, isMobile],
  );
  const daisyPetalCount = dense ? 14 : 10;
  const marigoldPetalCount = dense ? 16 : 12;
  const floretsPerSpike = dense ? 16 : 11;

  const geometries = useMemo(
    () => ({
      daisyPetal: createPetalGeometry(0.095, 0.028, 0.5, 0.022),
      poppyPetal: createPetalGeometry(0.085, 0.09, 1.15, 0.08),
      marigoldPetal: createPetalGeometry(0.055, 0.034, 0.75, 0.04),
      leaf: createLeafGeometry(),
    }),
    [],
  );

  const flowers = useMemo(
    () => ({
      daisies: scatterFlowers(70241, counts.daisies),
      poppies: scatterFlowers(81733, counts.poppies),
      marigolds: scatterFlowers(92417, counts.marigolds),
      lavenders: scatterFlowers(10331, counts.lavenders),
      bellflowers: scatterFlowers(20443, counts.bellflowers),
    }),
    [counts],
  );

  const totals = useMemo(() => {
    const all = [
      ...flowers.daisies,
      ...flowers.poppies,
      ...flowers.marigolds,
      ...flowers.lavenders,
      ...flowers.bellflowers,
    ];
    return {
      stems: all.length,
      leaves: all.length * 2,
      daisyPetals: flowers.daisies.length * daisyPetalCount,
      poppyPetals: flowers.poppies.length * 5,
      marigoldPetals: flowers.marigolds.length * marigoldPetalCount,
      florets: flowers.lavenders.length * floretsPerSpike,
    };
  }, [flowers, daisyPetalCount, marigoldPetalCount, floretsPerSpike]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    dummy.rotation.order = "YXZ";
    const color = new THREE.Color();
    const rnd = makeRng(55107);
    let stemIndex = 0;
    let leafIndex = 0;

    const placeStem = (flower: FlowerInstance, heightScale = 1, shade = 1) => {
      dummy.position.set(flower.x, (flower.height * heightScale) / 2, flower.z);
      dummy.rotation.set(flower.headTilt * 0.3, flower.headYaw, flower.headTilt * 0.22);
      dummy.scale.set(0.007, flower.height * heightScale, 0.007);
      dummy.updateMatrix();
      stems.current?.setMatrixAt(stemIndex, dummy.matrix);
      color.setRGB(0.24 * shade, 0.42 * shade, 0.2 * shade);
      stems.current?.setColorAt(stemIndex, color);
      stemIndex++;

      for (let l = 0; l < 2; l++) {
        const yaw = flower.headYaw + l * 2.4 + rnd();
        dummy.position.set(flower.x, flower.height * heightScale * (0.28 + l * 0.22), flower.z);
        dummy.rotation.set(-0.55 - rnd() * 0.25, yaw, 0);
        dummy.scale.setScalar(flower.scale * (1.4 + rnd() * 0.6));
        dummy.updateMatrix();
        leaves.current?.setMatrixAt(leafIndex, dummy.matrix);
        color.setRGB(0.22 * shade, 0.4 * shade, 0.18 * shade);
        leaves.current?.setColorAt(leafIndex, color);
        leafIndex++;
      }
    };

    /* Margaridas — brancas, rosadas e amarelo-claras */
    const daisyTints = ["#ffffff", "#ffe9f2", "#fff6d8", "#f6e5ff"];
    let petalIndex = 0;
    flowers.daisies.forEach((flower, i) => {
      placeStem(flower, 1, 0.9 + rnd() * 0.25);
      const tint = daisyTints[i % daisyTints.length];
      for (let p = 0; p < daisyPetalCount; p++) {
        const yaw = (p / daisyPetalCount) * Math.PI * 2 + flower.headYaw;
        dummy.position.set(flower.x, flower.height, flower.z);
        dummy.rotation.set(flower.headTilt * 0.35 - 0.28, yaw, 0);
        dummy.scale.setScalar(flower.scale * (0.92 + rnd() * 0.16));
        dummy.updateMatrix();
        daisyPetals.current?.setMatrixAt(petalIndex, dummy.matrix);
        color.set(tint);
        daisyPetals.current?.setColorAt(petalIndex, color);
        petalIndex++;
      }
      dummy.position.set(flower.x, flower.height + 0.01, flower.z);
      dummy.rotation.set(flower.headTilt * 0.35, flower.headYaw, 0);
      dummy.scale.set(flower.scale * 0.024, flower.scale * 0.014, flower.scale * 0.024);
      dummy.updateMatrix();
      daisyCenters.current?.setMatrixAt(i, dummy.matrix);
      color.set(rnd() < 0.5 ? "#e8b428" : "#d9a41f");
      daisyCenters.current?.setColorAt(i, color);
    });

    /* Papoulas — taça vermelha/laranja com miolo escuro */
    const poppyTints = ["#d9382a", "#e04c2e", "#c72f3a", "#e8642f"];
    petalIndex = 0;
    flowers.poppies.forEach((flower, i) => {
      placeStem(flower, 1.15, 0.85 + rnd() * 0.25);
      const tint = poppyTints[i % poppyTints.length];
      for (let p = 0; p < 5; p++) {
        const yaw = (p / 5) * Math.PI * 2 + flower.headYaw;
        dummy.position.set(flower.x, flower.height * 1.15, flower.z);
        dummy.rotation.set(flower.headTilt * 0.3 - 0.85, yaw, 0);
        dummy.scale.setScalar(flower.scale * (0.9 + rnd() * 0.2));
        dummy.updateMatrix();
        poppyPetals.current?.setMatrixAt(petalIndex, dummy.matrix);
        color.set(tint);
        if (p % 2) color.multiplyScalar(0.9);
        poppyPetals.current?.setColorAt(petalIndex, color);
        petalIndex++;
      }
      dummy.position.set(flower.x, flower.height * 1.15 + 0.014, flower.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(flower.scale * 0.02);
      dummy.updateMatrix();
      poppyCenters.current?.setMatrixAt(i, dummy.matrix);
      color.set("#241a20");
      poppyCenters.current?.setColorAt(i, color);
    });

    /* Calêndulas — duas rodas de pétalas curtas laranjas/amarelas */
    const marigoldTints = ["#f5a623", "#f28c1e", "#ffc23d", "#e87f18"];
    petalIndex = 0;
    flowers.marigolds.forEach((flower, i) => {
      placeStem(flower, 0.95, 0.9 + rnd() * 0.2);
      const tint = marigoldTints[i % marigoldTints.length];
      const half = Math.floor(marigoldPetalCount / 2);
      for (let p = 0; p < marigoldPetalCount; p++) {
        const layer = p < half ? 0 : 1;
        const inLayer = layer === 0 ? p : p - half;
        const layerCount = layer === 0 ? half : marigoldPetalCount - half;
        const yaw = (inLayer / layerCount) * Math.PI * 2 + flower.headYaw + layer * 0.45;
        dummy.position.set(flower.x, flower.height * 0.95 + layer * 0.006, flower.z);
        dummy.rotation.set(flower.headTilt * 0.3 - (layer === 0 ? 0.22 : 0.55), yaw, 0);
        dummy.scale.setScalar(flower.scale * (layer === 0 ? 1 : 0.72));
        dummy.updateMatrix();
        marigoldPetals.current?.setMatrixAt(petalIndex, dummy.matrix);
        color.set(tint);
        if (layer === 1) color.multiplyScalar(1.08);
        marigoldPetals.current?.setColorAt(petalIndex, color);
        petalIndex++;
      }
      dummy.position.set(flower.x, flower.height * 0.95 + 0.016, flower.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(flower.scale * 0.016, flower.scale * 0.012, flower.scale * 0.016);
      dummy.updateMatrix();
      marigoldCenters.current?.setMatrixAt(i, dummy.matrix);
      color.set("#9a5c10");
      marigoldCenters.current?.setColorAt(i, color);
    });

    /* Lavandas — espiga de floretes roxos */
    const lavenderTints = ["#8a6fd0", "#9b7de0", "#7a5fc0", "#a98fe8"];
    petalIndex = 0;
    flowers.lavenders.forEach((flower, li) => {
      placeStem(flower, 1.7, 0.85 + rnd() * 0.2);
      const tint = lavenderTints[li % lavenderTints.length];
      for (let f = 0; f < floretsPerSpike; f++) {
        const t = f / (floretsPerSpike - 1);
        const spiral = f * 2.4 + flower.headYaw;
        const spikeR = 0.02 * (1 - t * 0.4);
        dummy.position.set(
          flower.x + Math.cos(spiral) * spikeR,
          flower.height * 1.7 * (0.62 + t * 0.42),
          flower.z + Math.sin(spiral) * spikeR,
        );
        dummy.rotation.set(rnd() * 0.6, spiral, 0);
        dummy.scale.setScalar(flower.scale * (0.011 - t * 0.003));
        dummy.updateMatrix();
        lavenderFlorets.current?.setMatrixAt(petalIndex, dummy.matrix);
        color.set(tint);
        if (f % 3 === 0) color.multiplyScalar(0.85);
        lavenderFlorets.current?.setColorAt(petalIndex, color);
        petalIndex++;
      }
    });

    /* Campânulas — sinos pendentes lilás/azulados */
    const bellTints = ["#7d8fd8", "#9a86dd", "#6f7fd0", "#b391e0"];
    flowers.bellflowers.forEach((flower, i) => {
      placeStem(flower, 1.25, 0.85 + rnd() * 0.2);
      dummy.position.set(
        flower.x + Math.sin(flower.headYaw) * 0.03,
        flower.height * 1.25 + 0.008,
        flower.z + Math.cos(flower.headYaw) * 0.03,
      );
      /* Cone com base aberta para baixo = sino pendente, levemente inclinado. */
      dummy.rotation.set(0.35, flower.headYaw, 0);
      dummy.scale.set(flower.scale * 0.03, flower.scale * 0.04, flower.scale * 0.03);
      dummy.updateMatrix();
      bells.current?.setMatrixAt(i, dummy.matrix);
      color.set(bellTints[i % bellTints.length]);
      bells.current?.setColorAt(i, color);
    });

    for (const ref of [
      stems,
      leaves,
      daisyPetals,
      daisyCenters,
      poppyPetals,
      poppyCenters,
      marigoldPetals,
      marigoldCenters,
      lavenderFlorets,
      bells,
    ]) {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    }
  }, [flowers, daisyPetalCount, marigoldPetalCount, floretsPerSpike]);

  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, totals.stems]}>
        <cylinderGeometry args={[0.75, 1.15, 1, 5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[geometries.leaf, undefined, totals.leaves]}>
        <meshStandardMaterial color="#ffffff" roughness={0.85} side={THREE.DoubleSide} />
      </instancedMesh>

      <instancedMesh
        ref={daisyPetals}
        args={[geometries.daisyPetal, undefined, totals.daisyPetals]}
      >
        <PetalMaterial />
      </instancedMesh>
      <instancedMesh ref={daisyCenters} args={[undefined, undefined, counts.daisies]}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshStandardMaterial
          color="#ffffff"
          map={CENTER_TEXTURE}
          bumpMap={CENTER_TEXTURE}
          bumpScale={0.003}
          roughness={0.85}
        />
      </instancedMesh>

      <instancedMesh
        ref={poppyPetals}
        args={[geometries.poppyPetal, undefined, totals.poppyPetals]}
      >
        <PetalMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={poppyCenters} args={[undefined, undefined, counts.poppies]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </instancedMesh>

      <instancedMesh
        ref={marigoldPetals}
        args={[geometries.marigoldPetal, undefined, totals.marigoldPetals]}
      >
        <PetalMaterial roughness={0.58} />
      </instancedMesh>
      <instancedMesh ref={marigoldCenters} args={[undefined, undefined, counts.marigolds]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          map={CENTER_TEXTURE}
          bumpMap={CENTER_TEXTURE}
          bumpScale={0.003}
          roughness={0.9}
        />
      </instancedMesh>

      <instancedMesh ref={lavenderFlorets} args={[undefined, undefined, totals.florets]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </instancedMesh>

      <instancedMesh ref={bells} args={[undefined, undefined, counts.bellflowers]}>
        <coneGeometry args={[0.85, 1.4, 7, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.6}
          sheen={0.4}
          sheenColor="#e8e0ff"
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

/* Flores "hero" super detalhadas ------------------------------------------- */

function SwayGroup({
  position,
  phase,
  amplitude = 0.055,
  children,
}: {
  position: [number, number, number];
  phase: number;
  amplitude?: number;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const gust = 1 + Math.max(0, Math.sin(t * 0.35 + phase)) * 0.65;
    /* Vento suave: balanço lento + tremor rápido bem pequeno. */
    group.current.rotation.z =
      (Math.sin(t * 0.9 + phase) * amplitude + Math.sin(t * 3.1 + phase) * 0.01) * gust;
    group.current.rotation.x = Math.cos(t * 0.7 + phase * 1.3) * amplitude * 0.65 * gust;
  });
  return (
    <group ref={group} position={position}>
      {children}
    </group>
  );
}

function CurvedStem({ height, lean = 0.06 }: { height: number; lean?: number }) {
  return (
    <group>
      <mesh position={[0, height * 0.28, 0]} rotation={[0, 0, lean]} castShadow>
        <cylinderGeometry args={[0.007, 0.01, height * 0.56, 6]} />
        <meshStandardMaterial color="#4d7c3a" roughness={0.85} />
      </mesh>
      <mesh
        position={[lean * height * 0.5, height * 0.76, 0]}
        rotation={[0, 0, lean * 2.2]}
        castShadow
      >
        <cylinderGeometry args={[0.005, 0.007, height * 0.46, 6]} />
        <meshStandardMaterial color="#578a41" roughness={0.85} />
      </mesh>
    </group>
  );
}

function HeroLeaves({ height, seed }: { height: number; seed: number }) {
  const geometry = useMemo(() => createLeafGeometry(), []);
  const rnd = makeRng(seed);
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[0, height * (0.24 + i * 0.18), 0]}
          rotation={[-0.5 - rnd() * 0.3, i * 2.1 + rnd(), 0]}
          scale={1.35 + rnd() * 0.5}
          castShadow
        >
          <meshStandardMaterial
            color={i % 2 ? "#4a7c39" : "#568c42"}
            roughness={0.82}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Margarida detalhada: 18 pétalas, sépalas, miolo abaulado granulado. */
function HeroDaisy({
  position,
  phase,
  tint = "#ffffff",
}: {
  position: [number, number, number];
  phase: number;
  tint?: string;
}) {
  const petal = useMemo(() => createPetalGeometry(0.11, 0.03, 0.45, 0.03), []);
  const sepal = useMemo(() => createPetalGeometry(0.045, 0.02, 0.4, 0.014), []);
  const height = 0.42;
  return (
    <SwayGroup position={position} phase={phase}>
      <CurvedStem height={height} />
      <HeroLeaves height={height} seed={phase * 1000 + 17} />
      <group position={[0.015, height, 0]} rotation={[0.16, phase, 0]}>
        {Array.from({ length: 8 }, (_, s) => (
          <mesh
            key={`s-${s}`}
            geometry={sepal}
            rotation={[-0.5, (s / 8) * Math.PI * 2, 0]}
            position={[0, -0.006, 0]}
          >
            <meshStandardMaterial color="#3f6e33" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {Array.from({ length: 18 }, (_, p) => (
          <mesh
            key={p}
            geometry={petal}
            rotation={[-0.24 - (p % 3) * 0.05, (p / 18) * Math.PI * 2, 0]}
            castShadow
          >
            <meshPhysicalMaterial
              color={tint}
              map={PETAL_TEXTURE}
              roughness={0.6}
              sheen={0.6}
              sheenColor="#ffffff"
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.012, 0]} scale={[0.03, 0.018, 0.03]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            color="#f0b524"
            map={CENTER_TEXTURE}
            bumpMap={CENTER_TEXTURE}
            bumpScale={0.004}
            roughness={0.88}
          />
        </mesh>
      </group>
    </SwayGroup>
  );
}

/** Papoula detalhada: taça de 5 pétalas, miolo escuro e coroa de estames. */
function HeroPoppy({ position, phase }: { position: [number, number, number]; phase: number }) {
  const petal = useMemo(() => createPetalGeometry(0.1, 0.11, 1.05, 0.09), []);
  const height = 0.48;
  const stamens = useMemo(() => {
    const rnd = makeRng(phase * 977 + 5);
    return Array.from({ length: 16 }, (_, i) => ({
      yaw: (i / 16) * Math.PI * 2 + rnd() * 0.3,
      tilt: 0.35 + rnd() * 0.3,
      length: 0.028 + rnd() * 0.012,
    }));
  }, [phase]);
  return (
    <SwayGroup position={position} phase={phase} amplitude={0.07}>
      <CurvedStem height={height} lean={0.09} />
      <HeroLeaves height={height} seed={phase * 1000 + 31} />
      <group position={[0.025, height, 0]} rotation={[0.12, phase * 2, 0]}>
        {Array.from({ length: 5 }, (_, p) => (
          <mesh
            key={p}
            geometry={petal}
            rotation={[-0.8 - (p % 2) * 0.12, (p / 5) * Math.PI * 2, 0]}
            castShadow
          >
            <meshPhysicalMaterial
              color={p % 2 ? "#d9382a" : "#e64934"}
              map={PETAL_TEXTURE}
              roughness={0.48}
              sheen={0.5}
              sheenColor="#ffb9a8"
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.018, 0]} scale={0.02}>
          <sphereGeometry args={[1, 12, 9]} />
          <meshStandardMaterial color="#241a20" roughness={0.55} />
        </mesh>
        {stamens.map((stamen, i) => (
          <group key={i} rotation={[0, stamen.yaw, 0]}>
            <mesh position={[stamen.length * 0.75, 0.02, 0]} rotation={[0, 0, -stamen.tilt]}>
              <cylinderGeometry args={[0.0014, 0.0014, stamen.length, 3]} />
              <meshBasicMaterial color="#3a2c34" />
            </mesh>
            <mesh position={[stamen.length * 1.05, 0.028, 0]}>
              <sphereGeometry args={[0.004, 6, 4]} />
              <meshStandardMaterial color="#4a3844" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    </SwayGroup>
  );
}

/** Lavanda detalhada: espiga densa em espiral com pontas mais claras. */
function HeroLavender({ position, phase }: { position: [number, number, number]; phase: number }) {
  const height = 0.62;
  const florets = useMemo(() => {
    const rnd = makeRng(phase * 733 + 9);
    return Array.from({ length: 28 }, (_, i) => {
      const t = i / 27;
      return {
        t,
        spiral: i * 2.4 + rnd(),
        size: (0.012 - t * 0.0035) * (0.9 + rnd() * 0.3),
      };
    });
  }, [phase]);
  return (
    <SwayGroup position={position} phase={phase} amplitude={0.085}>
      <CurvedStem height={height} lean={0.05} />
      <HeroLeaves height={height} seed={phase * 1000 + 47} />
      {florets.map((floret, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(floret.spiral) * 0.022 * (1 - floret.t * 0.4),
            height * (0.58 + floret.t * 0.48),
            Math.sin(floret.spiral) * 0.022 * (1 - floret.t * 0.4),
          ]}
          rotation={[0.3, floret.spiral, 0]}
          scale={floret.size}
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={floret.t > 0.8 ? "#b9a2ec" : i % 3 ? "#8a6fd0" : "#7a5fc0"}
            roughness={0.78}
          />
        </mesh>
      ))}
    </SwayGroup>
  );
}

/** Calêndula detalhada: 3 rodas de pétalas franzidas. */
function HeroMarigold({ position, phase }: { position: [number, number, number]; phase: number }) {
  const petal = useMemo(() => createPetalGeometry(0.06, 0.036, 0.8, 0.045), []);
  const height = 0.36;
  const layers = [
    { count: 12, pitch: -0.16, scale: 1, shade: "#f5a623" },
    { count: 10, pitch: -0.5, scale: 0.78, shade: "#ffc23d" },
    { count: 8, pitch: -0.85, scale: 0.55, shade: "#ffd45e" },
  ];
  return (
    <SwayGroup position={position} phase={phase}>
      <CurvedStem height={height} lean={0.04} />
      <HeroLeaves height={height} seed={phase * 1000 + 61} />
      <group position={[0.012, height, 0]} rotation={[0.14, phase * 1.7, 0]}>
        {layers.map((layer, li) =>
          Array.from({ length: layer.count }, (_, p) => (
            <mesh
              key={`${li}-${p}`}
              geometry={petal}
              position={[0, li * 0.008, 0]}
              rotation={[layer.pitch, (p / layer.count) * Math.PI * 2 + li * 0.4, 0]}
              scale={layer.scale}
              castShadow={li === 0}
            >
              <meshPhysicalMaterial
                color={layer.shade}
                map={PETAL_TEXTURE}
                roughness={0.56}
                sheen={0.45}
                sheenColor="#ffe9b8"
                side={THREE.DoubleSide}
              />
            </mesh>
          )),
        )}
        <mesh position={[0, 0.022, 0]} scale={[0.014, 0.01, 0.014]}>
          <sphereGeometry args={[1, 12, 9]} />
          <meshStandardMaterial
            color="#9a5c10"
            map={CENTER_TEXTURE}
            bumpMap={CENTER_TEXTURE}
            bumpScale={0.003}
            roughness={0.9}
          />
        </mesh>
      </group>
    </SwayGroup>
  );
}

/** Conjunto de flores detalhadas perto dos canteiros, balançando no vento. */
export function HeroFlowers({ low = false }: { low?: boolean }) {
  if (low) return null;
  return (
    <group>
      <HeroDaisy position={[2.4, 0.02, 1.7]} phase={0.4} />
      <HeroDaisy position={[-2.8, 0.02, 2.4]} phase={2.1} tint="#ffe9f2" />
      <HeroDaisy position={[1.5, 0.02, 3.2]} phase={5.1} tint="#fff6d8" />
      <HeroPoppy position={[2.0, 0.02, -2.6]} phase={1.2} />
      <HeroPoppy position={[-3.5, 0.02, -2.2]} phase={3.6} />
      <HeroPoppy position={[-1.2, 0.02, 3.0]} phase={4.8} />
      <HeroLavender position={[3.5, 0.02, 3.2]} phase={0.9} />
      <HeroLavender position={[-1.9, 0.02, -3.3]} phase={2.8} />
      <HeroLavender position={[3.8, 0.02, -0.8]} phase={6.2} />
      <HeroMarigold position={[2.9, 0.02, -1.6]} phase={1.7} />
      <HeroMarigold position={[-2.3, 0.02, 3.5]} phase={4.2} />
      <HeroMarigold position={[-3.6, 0.02, 1.1]} phase={5.5} />
    </group>
  );
}
