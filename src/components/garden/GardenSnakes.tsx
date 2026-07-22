import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type SnakeKind = "jararaca" | "coral" | "cipo" | "cascavel";

type SnakeZone = "path" | "forest";

type SnakePalette = {
  body: string;
  belly: string;
  pattern: string;
  eye: string;
  tongue: string;
};

const SNAKE_KINDS: SnakeKind[] = ["jararaca", "coral", "cipo", "cascavel"];

const PALETTES: Record<SnakeKind, SnakePalette> = {
  jararaca: {
    body: "#6b5238",
    belly: "#c4b08a",
    pattern: "#3a2a1c",
    eye: "#c9a012",
    tongue: "#c45a6a",
  },
  coral: {
    body: "#c42828",
    belly: "#f0e0c8",
    pattern: "#1a1a1a",
    eye: "#f5e6a0",
    tongue: "#e85a6a",
  },
  cipo: {
    body: "#3d8a45",
    belly: "#b8d4a0",
    pattern: "#2a6030",
    eye: "#e8f0a8",
    tongue: "#d06070",
  },
  cascavel: {
    body: "#a87838",
    belly: "#dcc8a0",
    pattern: "#5a3c18",
    eye: "#e0c060",
    tongue: "#c05060",
  },
};

const SEGMENT_COUNT = 14;

/** Chiado procedural (ruído filtrado) — cobra rastejando. */
function playSnakeHiss(volume = 0.12) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.9);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(4200, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.55);
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.85);
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* Autoplay / sem áudio */
  }
}

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function SnakeModel({
  kind,
  segmentRefs,
  headRef,
  tongueRef,
}: {
  kind: SnakeKind;
  segmentRefs: MutableRefObject<(THREE.Group | null)[]>;
  headRef: MutableRefObject<THREE.Group | null>;
  tongueRef: MutableRefObject<THREE.Group | null>;
}) {
  const palette = PALETTES[kind];
  const isCoral = kind === "coral";

  return (
    <group>
      {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
        const t = i / (SEGMENT_COUNT - 1);
        const radius = THREE.MathUtils.lerp(0.055, 0.018, t * t);
        const band = i % 3;
        let color = palette.body;
        if (isCoral) {
          color = band === 0 ? "#c42828" : band === 1 ? "#1a1a1a" : "#e8c84a";
        } else if (band === 0) {
          color = palette.pattern;
        }
        return (
          <group
            key={i}
            ref={(node) => {
              segmentRefs.current[i] = node;
            }}
          >
            <mesh castShadow>
              <sphereGeometry args={[radius, 10, 8]} />
              <meshPhysicalMaterial
                color={color}
                roughness={0.55}
                clearcoat={0.35}
                clearcoatRoughness={0.4}
                sheen={0.2}
                sheenColor={palette.body}
                transparent
                opacity={1}
              />
            </mesh>
            {i < 4 && (
              <mesh position={[0, -radius * 0.55, 0]} scale={[0.9, 0.45, 0.85]}>
                <sphereGeometry args={[radius * 0.85, 8, 6]} />
                <meshStandardMaterial color={palette.belly} roughness={0.75} transparent opacity={1} />
              </mesh>
            )}
          </group>
        );
      })}

      <group ref={headRef}>
        <mesh castShadow scale={[1.15, 0.85, 0.95]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshPhysicalMaterial
            color={palette.body}
            roughness={0.5}
            clearcoat={0.4}
            clearcoatRoughness={0.35}
            transparent
            opacity={1}
          />
        </mesh>
        <mesh position={[0.04, -0.02, 0]} scale={[0.9, 0.55, 0.8]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color={palette.belly} roughness={0.7} transparent opacity={1} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[0.035, 0.028, side * 0.045]}>
            <mesh>
              <sphereGeometry args={[0.016, 10, 8]} />
              <meshPhysicalMaterial color={palette.eye} roughness={0.25} clearcoat={0.6} />
            </mesh>
            <mesh position={[0.008, 0, 0]}>
              <sphereGeometry args={[0.008, 8, 6]} />
              <meshBasicMaterial color="#0a0806" />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`n-${side}`} position={[0.065, 0.005, side * 0.012]}>
            <sphereGeometry args={[0.005, 6, 5]} />
            <meshStandardMaterial color="#1a1410" />
          </mesh>
        ))}
        <group ref={tongueRef} position={[0.075, -0.005, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.35, 1, 0.35]}>
            <capsuleGeometry args={[0.006, 0.05, 4, 6]} />
            <meshStandardMaterial color={palette.tongue} roughness={0.45} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0.04, 0, side * 0.012]}
              rotation={[side * 0.55, 0, Math.PI / 2]}
              scale={[0.3, 0.7, 0.3]}
            >
              <capsuleGeometry args={[0.004, 0.028, 3, 5]} />
              <meshStandardMaterial color={palette.tongue} roughness={0.45} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

type SnakeActorProps = {
  kind: SnakeKind;
  zone: SnakeZone;
  seed: number;
  muted?: boolean;
};

function SnakeActor({ kind, zone, seed, muted = false }: SnakeActorProps) {
  const root = useRef<THREE.Group>(null!);
  const segmentRefs = useRef<(THREE.Group | null)[]>([]);
  const headRef = useRef<THREE.Group | null>(null);
  const tongueRef = useRef<THREE.Group | null>(null);
  const rattleRef = useRef<THREE.Group | null>(null);

  const state = useRef({
    phase: "wait" as "wait" | "slither" | "hide",
    endsAt: 0,
    progress: 0,
    hissed: false,
    tongueT: 0,
    startAngle: 0,
    direction: 1 as 1 | -1,
  });

  const rnd = useMemo(() => seededRandom(seed * 9973 + (zone === "forest" ? 17 : 3)), [seed, zone]);

  const radius = zone === "forest" ? 21.5 + rnd() * 4.5 : 12.2 + rnd() * 3.8;
  const speed = zone === "forest" ? 0.055 + rnd() * 0.03 : 0.07 + rnd() * 0.04;
  const waveAmp = zone === "forest" ? 0.28 : 0.22;
  const waveFreq = 2.4 + rnd() * 0.8;
  const scale = zone === "forest" ? 0.95 + rnd() * 0.35 : 0.72 + rnd() * 0.28;
  const yBase = zone === "forest" ? 0.04 : 0.035;

  useEffect(() => {
    const now = performance.now() / 1000;
    state.current.phase = "wait";
    state.current.endsAt = now + 4 + rnd() * 14 + seed * 1.7;
    state.current.startAngle = rnd() * Math.PI * 2;
    state.current.direction = rnd() > 0.5 ? 1 : -1;
    state.current.hissed = false;
    if (root.current) root.current.visible = false;
  }, [rnd, seed]);

  useFrame((frame, delta) => {
    const dt = Math.min(0.05, delta);
    const now = frame.clock.elapsedTime;
    const s = state.current;

    if (now >= s.endsAt) {
      if (s.phase === "wait") {
        s.phase = "slither";
        s.progress = 0;
        s.hissed = false;
        s.endsAt = now + (zone === "forest" ? 9 + rnd() * 6 : 7 + rnd() * 5);
        s.startAngle = rnd() * Math.PI * 2;
        s.direction = rnd() > 0.5 ? 1 : -1;
        if (root.current) root.current.visible = true;
      } else if (s.phase === "slither") {
        s.phase = "hide";
        s.endsAt = now + 1.35;
      } else {
        s.phase = "wait";
        s.endsAt = now + 10 + rnd() * 22;
        if (root.current) root.current.visible = false;
      }
    }

    if (s.phase === "wait" || !root.current) return;

    const hideT = s.phase === "hide" ? 1 - Math.max(0, (s.endsAt - now) / 1.35) : 0;
    const appearBoost = s.phase === "slither" ? Math.min(1, s.progress * 3) : 1 - hideT;

    s.progress += speed * dt * (zone === "forest" ? 0.85 : 1);
    const arc = s.progress * 1.15 * s.direction;
    const angle = s.startAngle + arc;

    const wave = Math.sin(s.progress * waveFreq * Math.PI * 2) * waveAmp;
    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const normalX = -tangentZ;
    const normalZ = tangentX;

    const cx = Math.cos(angle) * radius + normalX * wave;
    const cz = Math.sin(angle) * radius + normalZ * wave;

    const forestHide = zone === "forest" ? hideT : hideT * 0.35;
    const hidePush = forestHide * (zone === "forest" ? 3.2 : 1.2);
    const px = cx + tangentX * hidePush * s.direction;
    const pz = cz + tangentZ * hidePush * s.direction;
    const py = yBase - forestHide * 0.1;

    root.current.position.set(px, py, pz);
    root.current.rotation.y = Math.atan2(tangentX * s.direction, tangentZ * s.direction);
    root.current.scale.setScalar(scale * (0.55 + appearBoost * 0.45));

    root.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && "opacity" in mat) {
        mat.transparent = true;
        mat.opacity = Math.max(0, appearBoost * (zone === "forest" ? 0.9 : 1));
        mat.depthWrite = appearBoost > 0.35;
      }
    });

    if (!s.hissed && s.phase === "slither" && s.progress > 0.08 && s.progress < 0.4) {
      s.hissed = true;
      if (!muted) playSnakeHiss(zone === "forest" ? 0.09 : 0.15);
    }

    const segSpacing = 0.09;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = segmentRefs.current[i];
      if (!seg) continue;
      const lag = i * 0.07;
      const localProgress = s.progress - lag;
      const localWave = Math.sin(localProgress * waveFreq * Math.PI * 2) * waveAmp;
      const along = -i * segSpacing;
      const side = localWave * (1 - i / SEGMENT_COUNT) * 0.85;
      seg.position.set(along, Math.sin(localProgress * 8 + i) * 0.008, side);
      const twist = Math.cos(localProgress * waveFreq * Math.PI * 2) * 0.35;
      seg.rotation.y = twist * 0.15;
      seg.rotation.z = twist * 0.4;
    }

    if (headRef.current) {
      headRef.current.position.set(0.06, 0.02, 0);
      headRef.current.rotation.z = Math.sin(s.progress * 6) * 0.08;
    }

    s.tongueT -= dt;
    if (tongueRef.current) {
      if (s.tongueT <= 0) s.tongueT = 1.2 + rnd() * 2.5;
      const flick = s.tongueT > 0.85 ? Math.sin((1 - (s.tongueT - 0.85) / 0.15) * Math.PI) : 0;
      tongueRef.current.scale.setScalar(0.15 + flick * 0.95);
      tongueRef.current.visible = flick > 0.05;
    }

    if (kind === "cascavel" && rattleRef.current) {
      const last = segmentRefs.current[SEGMENT_COUNT - 1];
      if (last) {
        rattleRef.current.position.set(last.position.x - 0.05, last.position.y, last.position.z);
        rattleRef.current.rotation.y = now * 16;
      }
    }
  });

  return (
    <group ref={root} visible={false}>
      <SnakeModel
        kind={kind}
        segmentRefs={segmentRefs}
        headRef={headRef}
        tongueRef={tongueRef}
      />
      {kind === "cascavel" && (
        <group ref={rattleRef}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-i * 0.025, 0, 0]} scale={1 - i * 0.15}>
              <sphereGeometry args={[0.02, 8, 6]} />
              <meshStandardMaterial color="#c8a878" roughness={0.6} transparent opacity={1} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

type GardenSnakesProps = {
  pathCount?: number;
  forestCount?: number;
  muted?: boolean;
};

/** Cobras ocasionais no caminho e no fundo das árvores (somem na mata). */
export function GardenSnakes({ pathCount = 1, forestCount = 2, muted = false }: GardenSnakesProps) {
  const pathSnakes = useMemo(
    () =>
      Array.from({ length: Math.max(0, pathCount) }, (_, i) => ({
        kind: SNAKE_KINDS[i % SNAKE_KINDS.length],
        seed: 11 + i * 13,
      })),
    [pathCount],
  );
  const forestSnakes = useMemo(
    () =>
      Array.from({ length: Math.max(0, forestCount) }, (_, i) => ({
        kind: SNAKE_KINDS[(i + 2) % SNAKE_KINDS.length],
        seed: 41 + i * 17,
      })),
    [forestCount],
  );

  return (
    <group>
      {pathSnakes.map((s, i) => (
        <SnakeActor key={`path-${i}`} kind={s.kind} zone="path" seed={s.seed} muted={muted} />
      ))}
      {forestSnakes.map((s, i) => (
        <SnakeActor key={`forest-${i}`} kind={s.kind} zone="forest" seed={s.seed} muted={muted} />
      ))}
    </group>
  );
}
