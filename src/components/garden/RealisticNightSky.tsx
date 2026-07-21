import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { GardenRenderQuality as RenderQuality } from "@/lib/gardenRenderQuality";

function makeRng(start: number) {
  let seed = start >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Soft radial glow texture for moon corona / star halos. */
function createGlowTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const mid = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - mid) / mid;
      const dy = (y - mid) / mid;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = Math.max(0, 1 - d);
      const soft = a * a * (3 - 2 * a);
      data[i] = 255;
      data[i + 1] = 248;
      data[i + 2] = 230;
      data[i + 3] = Math.floor(soft * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMoonTexture() {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const random = makeRng(0x4d4f4f4e);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;
      const crater =
        Math.sin(nx * 28 + ny * 17) * Math.cos(nx * 11 - ny * 22) * 18 + (random() - 0.5) * 22;
      const shade = 205 + crater;
      data[i] = THREE.MathUtils.clamp(shade, 150, 245);
      data[i + 1] = THREE.MathUtils.clamp(shade - 4, 145, 240);
      data[i + 2] = THREE.MathUtils.clamp(shade - 18, 130, 220);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Dense milky-way band of faint stars across the dome. */
function MilkyWay({ count, radius }: { count: number; radius: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = makeRng(0xc0ffee);
    for (let i = 0; i < count; i++) {
      // Band tilted across the sky (galactic plane feel)
      const t = random();
      const along = (t - 0.5) * Math.PI * 1.35;
      const spread = (random() - 0.5) * 0.42;
      const elev = 0.55 + (random() - 0.5) * 0.35 + Math.sin(along * 1.4) * 0.08;
      const x = Math.sin(along) * Math.cos(elev + spread) * radius;
      const y = Math.sin(elev + spread * 0.6) * radius * 0.92;
      const z = Math.cos(along) * Math.cos(elev) * radius * 0.85 - 8;
      positions[i * 3] = x;
      positions[i * 3 + 1] = Math.max(2.5, y);
      positions[i * 3 + 2] = z;

      const warm = random();
      colors[i * 3] = 0.75 + warm * 0.25;
      colors[i * 3 + 1] = 0.78 + warm * 0.18;
      colors[i * 3 + 2] = 0.95 + (1 - warm) * 0.05;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [count, radius]);

  return (
    <points geometry={points} frustumCulled={false}>
      <pointsMaterial
        size={0.085}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ShootingStar() {
  const ref = useRef<THREE.Mesh>(null!);
  const state = useRef({
    active: false,
    t: 0,
    wait: 8 + Math.random() * 14,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
  });

  useFrame((_, delta) => {
    const s = state.current;
    s.wait -= delta;
    if (!s.active && s.wait <= 0) {
      s.active = true;
      s.t = 0;
      const side = Math.random() > 0.5 ? 1 : -1;
      s.from.set(side * (10 + Math.random() * 8), 10 + Math.random() * 5, -18 - Math.random() * 8);
      s.to.set(
        s.from.x - side * (14 + Math.random() * 8),
        s.from.y - (4 + Math.random() * 5),
        s.from.z + 6,
      );
      s.wait = 12 + Math.random() * 22;
    }
    if (!s.active || !ref.current) return;
    s.t += delta * 1.35;
    if (s.t >= 1) {
      s.active = false;
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    ref.current.position.lerpVectors(s.from, s.to, s.t);
    const fade = s.t < 0.15 ? s.t / 0.15 : s.t > 0.7 ? (1 - s.t) / 0.3 : 1;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = fade * 0.9;
  });

  return (
    <mesh ref={ref} visible={false} scale={[0.55, 0.04, 0.04]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial
        color="#eef6ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function RealisticMoon({
  position,
  lowQuality,
}: {
  position: [number, number, number];
  lowQuality: boolean;
}) {
  const glow = useMemo(() => createGlowTexture(), []);
  const moonMap = useMemo(() => createMoonTexture(), []);

  return (
    <group position={position}>
      {/* Soft corona */}
      <sprite scale={lowQuality ? [4.2, 4.2, 1] : [5.8, 5.8, 1]} renderOrder={-2}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#dfe8ff"
        />
      </sprite>
      {!lowQuality && (
        <sprite scale={[9.5, 9.5, 1]} renderOrder={-3}>
          <spriteMaterial
            map={glow}
            transparent
            opacity={0.14}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color="#9eb6ff"
          />
        </sprite>
      )}
      <mesh castShadow={false}>
        <sphereGeometry args={[0.72, lowQuality ? 20 : 36, lowQuality ? 16 : 28]} />
        <meshStandardMaterial
          map={moonMap}
          color="#f2efe4"
          emissive="#f0ead0"
          emissiveIntensity={0.45}
          roughness={0.92}
          metalness={0}
        />
      </mesh>
      <pointLight color="#d7e2ff" intensity={0.85} distance={48} decay={2} />
    </group>
  );
}

/** Atmospheric dome: deep zenith → soft blue horizon. */
function NightAtmosphereDome({ raining }: { raining: boolean }) {
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      uniforms: {
        zenith: { value: new THREE.Color(raining ? "#111a25" : "#09142a") },
        horizon: { value: new THREE.Color(raining ? "#263447" : "#314c72") },
        glow: { value: new THREE.Color(raining ? "#35465e" : "#496b9a") },
        opacity: { value: raining ? 0.92 : 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith;
        uniform vec3 horizon;
        uniform vec3 glow;
        uniform float opacity;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld).y;
          float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(horizon, zenith, pow(t, 1.35));
          float band = smoothstep(0.05, 0.35, h) * (1.0 - smoothstep(0.35, 0.75, h));
          col = mix(col, glow, band * 0.35);
          gl_FragColor = vec4(col, opacity);
        }
      `,
    });
    return mat;
  }, [raining]);

  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[55, 32, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function RealisticNightSky({
  moonPosition,
  isMobile,
  quality,
  raining = false,
}: {
  moonPosition: [number, number, number];
  isMobile?: boolean;
  quality: RenderQuality;
  raining?: boolean;
}) {
  const lowQuality = quality === "low";
  /* No modo leve: poucas estrelas — pontos com alpha são caros em GPU fraca. */
  const farStars = lowQuality
    ? 180
    : quality === "high"
      ? isMobile
        ? 3000
        : 5600
      : isMobile
        ? 2200
        : 4200;
  const midStars = lowQuality
    ? 0
    : quality === "high"
      ? isMobile
        ? 950
        : 1900
      : isMobile
        ? 700
        : 1400;
  const milky = lowQuality
    ? 0
    : quality === "high"
      ? isMobile
        ? 1200
        : 2900
      : isMobile
        ? 900
        : 2200;

  return (
    <group>
      <color attach="background" args={[raining ? "#0d1520" : "#071127"]} />
      <NightAtmosphereDome raining={raining} />

      {/* Distant dense field */}
      <Stars
        radius={72}
        depth={52}
        count={farStars}
        factor={raining ? 2.2 : 3.8}
        saturation={0.08}
        fade
        speed={0.08}
      />

      {/* Brighter nearer layer with slight color */}
      {midStars > 0 && (
        <Stars
          radius={42}
          depth={28}
          count={midStars}
          factor={raining ? 1.6 : 2.6}
          saturation={0.35}
          fade
          speed={0.04}
        />
      )}

      {milky > 0 && !raining && <MilkyWay count={milky} radius={48} />}

      {/* Soft twinkle accents */}
      {!lowQuality && !raining && (
        <Sparkles
          count={quality === "high" ? (isMobile ? 60 : 125) : isMobile ? 40 : 90}
          scale={[48, 22, 40]}
          position={[0, 14, -10]}
          size={2.4}
          speed={0.15}
          opacity={0.55}
          color="#dce8ff"
        />
      )}

      {!raining && <RealisticMoon position={moonPosition} lowQuality={lowQuality} />}
      {!lowQuality && !raining && <ShootingStar />}

      {/* Luar claro o bastante para enxergar o jardim, sem parecer dia. */}
      <ambientLight intensity={raining ? 0.3 : 0.42} color="#a8b9e0" />
      <hemisphereLight args={["#5473a6", "#18251f", raining ? 0.42 : 0.62]} />
      <directionalLight
        position={moonPosition}
        intensity={raining ? 0.38 : 0.78}
        color="#d5e1ff"
        castShadow={!lowQuality && !raining}
        shadow-mapSize-width={isMobile ? 384 : quality === "high" ? 1024 : 768}
        shadow-mapSize-height={isMobile ? 384 : quality === "high" ? 1024 : 768}
        shadow-camera-far={48}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
    </group>
  );
}

/** Night fog color matching the realistic sky dome. */
export function nightFogColor(raining: boolean): string {
  return raining ? "#1d2935" : "#1b2c49";
}
