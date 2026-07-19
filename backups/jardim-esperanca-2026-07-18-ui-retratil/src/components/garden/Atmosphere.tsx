import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* Utilidades ---------------------------------------------------------- */

function makeRng(start: number) {
  let seed = start >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Gradiente radial suave usado por neblina e raios de sol. */
function useSoftGlowTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.32)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/** Posições no gramado evitando caminhos, canteiros e o centro. */
const BED_SPOTS: [number, number][] = [
  [0, 0],
  [-5, -5],
  [5, -5],
  [-5, 5],
  [5, 5],
];

function lawnSpot(rnd: () => number): [number, number] {
  for (let attempt = 0; attempt < 12; attempt++) {
    const inSquare = rnd() < 0.62;
    let x: number;
    let z: number;
    if (inSquare) {
      x = (rnd() - 0.5) * 17.6;
      z = (rnd() - 0.5) * 17.6;
      // Evita os caminhos em cruz
      if (Math.abs(x) < 0.95 || Math.abs(z) < 0.95) continue;
    } else {
      const a = rnd() * Math.PI * 2;
      const r = 10.5 + rnd() * 4.5;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    // Evita os canteiros das mudas
    let nearBed = false;
    for (const [bx, bz] of BED_SPOTS) {
      if ((x - bx) * (x - bx) + (z - bz) * (z - bz) < 2.9) {
        nearBed = true;
        break;
      }
    }
    if (!nearBed) return [x, z];
  }
  return [12, 12];
}

/* Raios de sol (god rays fake, baratos) -------------------------------- */

export function SunShafts({ solarHour = 12 }: { solarHour?: number }) {
  const group = useRef<THREE.Group>(null!);
  const glow = useSoftGlowTexture();

  const shafts = useMemo(() => {
    const rnd = makeRng(7741);
    return Array.from({ length: 5 }, (_, i) => ({
      x: -4 + i * 2.3 + rnd() * 1.2,
      z: -1.5 + rnd() * 3,
      height: 7 + rnd() * 3,
      width: 0.65 + rnd() * 0.7,
      opacity: 0.045 + rnd() * 0.035,
      phase: rnd() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const shaft = shafts[i];
      if (!shaft) return;
      child.rotation.z = -0.35 + Math.sin(t * 0.07 + shaft.phase) * 0.03;
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = shaft.opacity * (0.75 + Math.sin(t * 0.18 + shaft.phase) * 0.25);
    });
  });

  // Inclina os feixes conforme a hora (sol nasce à direita, se põe à esquerda)
  const lean = ((solarHour - 12) / 6) * 0.35;

  return (
    <group ref={group} rotation={[0, 0.4, lean]}>
      {shafts.map((shaft, i) => (
        <mesh
          key={`shaft-${i}`}
          position={[shaft.x, shaft.height * 0.45, shaft.z]}
          rotation={[0, 0, -0.35]}
        >
          <planeGeometry args={[shaft.width, shaft.height]} />
          <meshBasicMaterial
            map={glow}
            color="#fff3cf"
            transparent
            opacity={shaft.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Neblina rasteira em camadas ------------------------------------------ */

export function GroundFog({
  strength = 1,
  isNight = false,
}: {
  strength?: number;
  isNight?: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  const glow = useSoftGlowTexture();

  const layers = useMemo(() => {
    const rnd = makeRng(3313);
    return Array.from({ length: 4 }, () => ({
      x: (rnd() - 0.5) * 22,
      z: (rnd() - 0.5) * 22,
      y: 0.35 + rnd() * 0.9,
      size: 9 + rnd() * 9,
      speed: 0.08 + rnd() * 0.12,
      phase: rnd() * Math.PI * 2,
      opacity: 0.05 + rnd() * 0.05,
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const layer = layers[i];
      if (!layer) return;
      child.position.x = layer.x + Math.sin(t * layer.speed + layer.phase) * 2.4;
      child.position.z = layer.z + Math.cos(t * layer.speed * 0.8 + layer.phase) * 1.8;
    });
  });

  return (
    <group ref={group}>
      {layers.map((layer, i) => (
        <mesh
          key={`fog-${i}`}
          position={[layer.x, layer.y, layer.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[layer.size, layer.size * 0.8]} />
          <meshBasicMaterial
            map={glow}
            color={isNight ? "#8aa4c0" : "#e8f0dd"}
            transparent
            opacity={layer.opacity * strength}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Arco-íris após a chuva ------------------------------------------------ */

const RAINBOW_COLORS = [
  "#e5484d",
  "#f5883a",
  "#f2d54a",
  "#6dc24b",
  "#4aa8e8",
  "#5a6acf",
  "#9a5fd0",
];

export function RainbowArc() {
  return (
    <group position={[3, -2.2, -24]} rotation={[0, -0.25, 0]}>
      {RAINBOW_COLORS.map((color, i) => (
        <mesh key={color} rotation={[0, 0, 0]}>
          <torusGeometry args={[13.2 - i * 0.34, 0.17, 6, 48, Math.PI]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.26}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Folhas caindo ocasionais ---------------------------------------------- */

type FallingLeaf = {
  x: number;
  y: number;
  z: number;
  speed: number;
  swayPhase: number;
  swayAmp: number;
  spin: number;
  scale: number;
  delay: number;
};

export function FallingLeaves({ count = 12 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const leaves = useMemo<FallingLeaf[]>(() => {
    const rnd = makeRng(9182);
    return Array.from({ length: count }, () => {
      const [x, z] = BED_SPOTS[Math.floor(rnd() * BED_SPOTS.length)];
      return {
        x: x + (rnd() - 0.5) * 3,
        y: 1.2 + rnd() * 2.6,
        z: z + (rnd() - 0.5) * 3,
        speed: 0.16 + rnd() * 0.14,
        swayPhase: rnd() * Math.PI * 2,
        swayAmp: 0.25 + rnd() * 0.3,
        spin: (rnd() - 0.5) * 2.4,
        scale: 0.028 + rnd() * 0.022,
        delay: rnd() * 22, // cada folha entra em momento diferente
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const color = new THREE.Color();
    const rnd = makeRng(5521);
    leaves.forEach((_, i) => {
      color.set(
        rnd() < 0.4 ? "#7a9b4e" : rnd() < 0.6 ? "#a8894a" : rnd() < 0.8 ? "#5f8a44" : "#8f6c38",
      );
      mesh.current.setColorAt(i, color);
    });
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [leaves]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    leaves.forEach((leaf, i) => {
      // Ciclo de ~26s por folha; a maior parte do tempo escondida (ocasional)
      const cycle = (t * leaf.speed + leaf.delay) % 8;
      const falling = cycle < 3.4;
      if (!falling) {
        dummy.position.set(0, -20, 0);
        dummy.scale.setScalar(0.0001);
      } else {
        const progress = cycle / 3.4;
        const y = leaf.y * (1 - progress) + 0.06;
        dummy.position.set(
          leaf.x + Math.sin(t * 1.4 + leaf.swayPhase) * leaf.swayAmp * progress,
          y,
          leaf.z + Math.cos(t * 1.1 + leaf.swayPhase) * leaf.swayAmp * 0.6 * progress,
        );
        dummy.rotation.set(
          t * leaf.spin,
          leaf.swayPhase + t * 0.6,
          Math.sin(t * 2 + leaf.swayPhase) * 0.8,
        );
        dummy.scale.set(leaf.scale * 1.4, leaf.scale * 0.25, leaf.scale);
      }
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" roughness={0.9} />
    </instancedMesh>
  );
}

/* Gramado vivo ----------------------------------------------------------- */

export function LivingLawn({ low = false }: { low?: boolean }) {
  const stones = useRef<THREE.InstancedMesh>(null!);
  const dryLeaves = useRef<THREE.InstancedMesh>(null!);
  const tallGrass = useRef<THREE.InstancedMesh>(null!);
  const patches = useRef<THREE.InstancedMesh>(null!);

  const counts = useMemo(
    () => ({
      stones: low ? 10 : 22,
      leaves: low ? 12 : 30,
      grass: low ? 22 : 52,
      patches: low ? 8 : 16,
    }),
    [low],
  );

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const rnd = makeRng(28131);

    // Pedrinhas
    for (let i = 0; i < counts.stones; i++) {
      const [x, z] = lawnSpot(rnd);
      const s = 0.035 + rnd() * 0.05;
      dummy.position.set(x, s * 0.35, z);
      dummy.rotation.set(rnd() * 0.6, rnd() * Math.PI, rnd() * 0.4);
      dummy.scale.set(s * 1.3, s * 0.6, s);
      dummy.updateMatrix();
      stones.current?.setMatrixAt(i, dummy.matrix);
      color.set(rnd() < 0.4 ? "#8d867a" : rnd() < 0.7 ? "#a29a8a" : "#6f695e");
      stones.current?.setColorAt(i, color);
    }

    // Folhas secas espalhadas
    for (let i = 0; i < counts.leaves; i++) {
      const [x, z] = lawnSpot(rnd);
      const s = 0.03 + rnd() * 0.025;
      dummy.position.set(x, 0.028, z);
      dummy.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.4);
      dummy.scale.set(s * 1.6, s * 0.18, s);
      dummy.updateMatrix();
      dryLeaves.current?.setMatrixAt(i, dummy.matrix);
      color.set(rnd() < 0.45 ? "#96703c" : rnd() < 0.75 ? "#7a5a30" : "#a8874e");
      dryLeaves.current?.setColorAt(i, color);
    }

    // Tufos de grama mais alta
    for (let i = 0; i < counts.grass; i++) {
      const [x, z] = lawnSpot(rnd);
      const h = 0.16 + rnd() * 0.2;
      dummy.position.set(x, h * 0.5, z);
      dummy.rotation.set((rnd() - 0.5) * 0.2, rnd() * Math.PI, (rnd() - 0.5) * 0.3);
      dummy.scale.set(0.05 + rnd() * 0.04, h, 0.05 + rnd() * 0.04);
      dummy.updateMatrix();
      tallGrass.current?.setMatrixAt(i, dummy.matrix);
      color.set(rnd() < 0.4 ? "#4d8a44" : rnd() < 0.7 ? "#5f9c50" : "#3f7a3c");
      tallGrass.current?.setColorAt(i, color);
    }

    // Manchas sutis de cor no gramado
    for (let i = 0; i < counts.patches; i++) {
      const [x, z] = lawnSpot(rnd);
      const s = 0.8 + rnd() * 1.6;
      dummy.position.set(x, 0.062, z);
      dummy.rotation.set(-Math.PI / 2, 0, rnd() * Math.PI);
      dummy.scale.set(s, s * (0.6 + rnd() * 0.5), 1);
      dummy.updateMatrix();
      patches.current?.setMatrixAt(i, dummy.matrix);
      color.set(rnd() < 0.5 ? "#87ad6d" : rnd() < 0.75 ? "#7aa262" : "#95b978");
      patches.current?.setColorAt(i, color);
    }

    for (const ref of [stones, dryLeaves, tallGrass, patches]) {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    }
  }, [counts]);

  return (
    <group>
      <instancedMesh ref={patches} args={[undefined, undefined, counts.patches]}>
        <circleGeometry args={[1, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={1}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={tallGrass} args={[undefined, undefined, counts.grass]}>
        <coneGeometry args={[0.5, 1, 5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.96} />
      </instancedMesh>
      <instancedMesh ref={stones} args={[undefined, undefined, counts.stones]} castShadow={!low}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={dryLeaves} args={[undefined, undefined, counts.leaves]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* Neblina de horizonte (anéis com gradiente vertical) --------------------- */

function useHorizonGradientTexture() {
  return useMemo(() => {
    const width = 4;
    const height = 128;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.16)");
    gradient.addColorStop(0.85, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0.8)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/**
 * Camadas suaves de neblina só no horizonte: dois cilindros com gradiente
 * vertical envolvem a floresta e "engolem" as árvores mais distantes,
 * criando profundidade sem custo de neblina volumétrica real.
 */
export function HorizonHaze({
  isNight = false,
  raining = false,
  twilight = false,
}: {
  isNight?: boolean;
  raining?: boolean;
  twilight?: boolean;
}) {
  const gradient = useHorizonGradientTexture();
  const tint = isNight ? "#1c2a3d" : raining ? "#aebbb0" : twilight ? "#f2c9a0" : "#dcead0";
  const rings = [
    { radius: 27, height: 6.5, opacity: isNight ? 0.5 : 0.55 },
    { radius: 34, height: 9.5, opacity: isNight ? 0.75 : 0.8 },
  ];
  return (
    <group>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, ring.height * 0.5 - 0.4, 0]}>
          <cylinderGeometry args={[ring.radius, ring.radius, ring.height, 48, 1, true]} />
          <meshBasicMaterial
            map={gradient}
            color={tint}
            transparent
            opacity={ring.opacity}
            side={THREE.BackSide}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Partículas ambientais: pólen e poeira iluminada -------------------------- */

/**
 * Pólen flutuando devagar + poeira dourada perto dos raios de sol.
 * Uma única malha de pontos por camada; anima só o eixo Y (barato).
 */
export function AmbientParticles({ low = false }: { low?: boolean }) {
  const pollenRef = useRef<THREE.Points>(null!);
  const dustRef = useRef<THREE.Points>(null!);
  const glow = useSoftGlowTexture();
  const pollenCount = low ? 40 : 90;
  const dustCount = low ? 24 : 55;

  const pollen = useMemo(() => {
    const rnd = makeRng(61511);
    const positions = new Float32Array(pollenCount * 3);
    const base = new Float32Array(pollenCount * 3);
    const phase = new Float32Array(pollenCount);
    for (let i = 0; i < pollenCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 15;
      base[i * 3] = Math.cos(a) * r;
      base[i * 3 + 1] = 0.3 + rnd() * 2.8;
      base[i * 3 + 2] = Math.sin(a) * r;
      phase[i] = rnd() * Math.PI * 2;
    }
    positions.set(base);
    return { positions, base, phase };
  }, [pollenCount]);

  const dust = useMemo(() => {
    const rnd = makeRng(90417);
    const positions = new Float32Array(dustCount * 3);
    const base = new Float32Array(dustCount * 3);
    const phase = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      // Concentrada na região dos feixes de sol
      base[i * 3] = -4.5 + rnd() * 10;
      base[i * 3 + 1] = 0.4 + rnd() * 4.2;
      base[i * 3 + 2] = -2 + rnd() * 5;
      phase[i] = rnd() * Math.PI * 2;
    }
    positions.set(base);
    return { positions, base, phase };
  }, [dustCount]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pollenRef.current) {
      const attr = pollenRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < pollenCount; i++) {
        arr[i * 3] = pollen.base[i * 3] + Math.sin(t * 0.12 + pollen.phase[i]) * 0.9;
        arr[i * 3 + 1] = pollen.base[i * 3 + 1] + Math.sin(t * 0.35 + pollen.phase[i] * 2) * 0.4;
        arr[i * 3 + 2] = pollen.base[i * 3 + 2] + Math.cos(t * 0.1 + pollen.phase[i]) * 0.9;
      }
      attr.needsUpdate = true;
    }
    if (dustRef.current) {
      const attr = dustRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        arr[i * 3] = dust.base[i * 3] + Math.sin(t * 0.18 + dust.phase[i]) * 0.5;
        arr[i * 3 + 1] = dust.base[i * 3 + 1] + Math.sin(t * 0.26 + dust.phase[i] * 1.7) * 0.55;
        arr[i * 3 + 2] = dust.base[i * 3 + 2] + Math.cos(t * 0.14 + dust.phase[i]) * 0.5;
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={pollenRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pollen.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glow}
          color="#fff6d8"
          size={0.075}
          transparent
          opacity={0.5}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points ref={dustRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glow}
          color="#ffe9ad"
          size={0.1}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/* Brilho do sol (sprite aditivo, sempre de frente para a câmera) ---------- */

export function SunGlow({
  position,
  twilight = false,
}: {
  position: [number, number, number];
  twilight?: boolean;
}) {
  const glow = useSoftGlowTexture();
  // Empurra o brilho para trás da floresta, perto do horizonte
  const direction = useMemo(() => {
    const v = new THREE.Vector3(position[0], Math.max(1.5, position[1]), position[2]);
    return v.normalize().multiplyScalar(46);
  }, [position]);
  return (
    <sprite position={[direction.x, direction.y, direction.z]} scale={twilight ? 22 : 15}>
      <spriteMaterial
        map={glow}
        color={twilight ? "#ffb36b" : "#fff3c4"}
        transparent
        opacity={twilight ? 0.55 : 0.34}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </sprite>
  );
}

/* Samambaias na borda da floresta ----------------------------------------- */

function createFrondGeometry() {
  const geometry = new THREE.PlaneGeometry(0.16, 0.72, 1, 6);
  geometry.translate(0, 0.36, 0);
  const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < positionAttr.count; i++) {
    const y = positionAttr.getY(i);
    const t = y / 0.72;
    // Arqueia a folha para fora e afina na ponta
    positionAttr.setZ(i, Math.sin(t * 1.9) * 0.34);
    positionAttr.setX(i, positionAttr.getX(i) * (1 - t * 0.78));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Tufos de samambaia instanciados perto da linha de árvores. */
export function ForestFerns({ low = false }: { low?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const geometry = useMemo(() => createFrondGeometry(), []);
  const fernCount = low ? 14 : 26;
  const frondsPerFern = low ? 5 : 7;
  const total = fernCount * frondsPerFern;

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const rnd = makeRng(70441);
    let index = 0;
    for (let f = 0; f < fernCount; f++) {
      const a = rnd() * Math.PI * 2;
      const r = 16.2 + rnd() * 4.6;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const fernScale = 0.75 + rnd() * 0.8;
      const green = rnd();
      for (let leaf = 0; leaf < frondsPerFern; leaf++) {
        const yaw = (leaf / frondsPerFern) * Math.PI * 2 + rnd() * 0.5;
        dummy.position.set(cx + (rnd() - 0.5) * 0.1, 0.02, cz + (rnd() - 0.5) * 0.1);
        dummy.rotation.set(-0.5 - rnd() * 0.3, yaw, 0);
        dummy.scale.setScalar(fernScale * (0.85 + rnd() * 0.3));
        dummy.updateMatrix();
        mesh.current.setMatrixAt(index, dummy.matrix);
        color.set(green < 0.35 ? "#3d6b38" : green < 0.7 ? "#4a7d42" : "#578c4b");
        mesh.current.setColorAt(index, color);
        index++;
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [fernCount, frondsPerFern]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, total]}>
      <meshStandardMaterial color="#ffffff" roughness={0.92} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* Caminhos naturais de terra entre o jardim e a floresta ------------------- */

export function WindingPaths() {
  const patches = useMemo(() => {
    const rnd = makeRng(31877);
    const all: {
      p: [number, number, number];
      s: [number, number];
      rot: number;
      c: string;
    }[] = [];
    // Duas trilhas sinuosas saindo do gramado em direções diferentes
    const trails = [
      { startAngle: 0.35, wobble: 0.16 },
      { startAngle: -2.35, wobble: 0.2 },
    ];
    for (const trail of trails) {
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = 10.4 + t * 8.6;
        const angle = trail.startAngle + Math.sin(t * 2.8) * trail.wobble + (rnd() - 0.5) * 0.05;
        all.push({
          p: [Math.cos(angle) * r, 0.022 + t * 0.004, Math.sin(angle) * r],
          s: [0.62 + rnd() * 0.28, 0.4 + rnd() * 0.18],
          rot: angle + Math.PI / 2 + (rnd() - 0.5) * 0.4,
          c: rnd() < 0.4 ? "#a8895f" : rnd() < 0.7 ? "#b09468" : "#9c7f57",
        });
      }
    }
    return all;
  }, []);

  return (
    <group>
      {patches.map((patch, i) => (
        <mesh
          key={i}
          position={patch.p}
          rotation={[-Math.PI / 2, 0, patch.rot]}
          scale={[patch.s[0] * 1.5, patch.s[1] * 1.9, 1]}
        >
          <circleGeometry args={[0.55, 10]} />
          <meshStandardMaterial color={patch.c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* Joaninha andando na borda do canteiro ---------------------------------- */

export function Ladybug({
  position = [0, 0, 0] as [number, number, number],
  offset = 0,
}: {
  position?: [number, number, number];
  offset?: number;
}) {
  const group = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime * 0.12 + offset;
    const r = 1.12;
    group.current.position.set(
      position[0] + Math.cos(t) * r,
      position[1] + 0.145,
      position[2] + Math.sin(t) * r * 0.74,
    );
    group.current.rotation.y = -t + Math.PI / 2;
  });

  return (
    <group ref={group} scale={0.85}>
      <mesh castShadow>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshStandardMaterial color="#c22d20" roughness={0.35} />
      </mesh>
      <mesh position={[0.026, 0.004, 0]}>
        <sphereGeometry args={[0.014, 7, 5]} />
        <meshStandardMaterial color="#1c1410" roughness={0.5} />
      </mesh>
      {[
        [-0.008, 0.024, 0.012],
        [0.006, 0.026, -0.01],
        [-0.016, 0.02, -0.008],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.005, 5, 4]} />
          <meshStandardMaterial color="#1c1410" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
