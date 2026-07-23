import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Coruja-de-orelha — detalhada; olha, pisca e ajeita as asas como ave real. */
type OwlPhase = "idle" | "scan" | "hold" | "blink" | "fluff" | "alert" | "preen";

export function GardenOwl({
  position,
  offset = 0,
  night = false,
}: {
  position: [number, number, number];
  offset?: number;
  night?: boolean;
}) {
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Group>(null!);
  const eyeR = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);

  const phase = useRef<OwlPhase>("idle");
  const phaseEnds = useRef(0.6 + offset);
  const headYaw = useRef(0);
  const headPitch = useRef(0);
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const blinkAmt = useRef(0);
  const fluffAmt = useRef(0);
  const lean = useRef(0);
  const targetLean = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(0.05, delta);
    const active = night ? 1 : 0.55;

    if (t >= phaseEnds.current) {
      const roll = Math.random();
      if (phase.current === "blink") {
        phase.current = "idle";
        phaseEnds.current = t + 1.2 + Math.random() * 2.5;
      } else if (phase.current === "scan") {
        phase.current = "hold";
        phaseEnds.current = t + (night ? 0.9 : 1.4) + Math.random() * (night ? 1.8 : 2.4);
      } else if (phase.current === "hold") {
        if (roll < 0.45 * active) {
          phase.current = "scan";
          targetYaw.current = (Math.random() * 2 - 1) * (night ? 1.35 : 0.85);
          targetPitch.current = (Math.random() * 2 - 1) * 0.22;
          phaseEnds.current = t + 0.45 + Math.random() * 0.55;
        } else if (roll < 0.58) {
          phase.current = "blink";
          phaseEnds.current = t + 0.16;
        } else if (roll < 0.72 * active) {
          phase.current = "fluff";
          fluffAmt.current = 1;
          phaseEnds.current = t + 0.7 + Math.random() * 0.5;
        } else if (roll < 0.82 * active) {
          phase.current = "alert";
          targetYaw.current = (Math.random() * 2 - 1) * 1.1;
          targetPitch.current = -0.18 - Math.random() * 0.12;
          targetLean.current = 0.12;
          phaseEnds.current = t + 0.9 + Math.random() * 1.1;
        } else if (roll < 0.9) {
          phase.current = "preen";
          targetYaw.current = (Math.random() < 0.5 ? -1 : 1) * 0.75;
          targetPitch.current = 0.35;
          phaseEnds.current = t + 1.1 + Math.random() * 0.8;
        } else {
          phase.current = "idle";
          targetYaw.current *= 0.35;
          targetPitch.current = 0;
          targetLean.current = 0;
          phaseEnds.current = t + 1.5 + Math.random() * 2.8;
        }
      } else if (phase.current === "fluff" || phase.current === "alert" || phase.current === "preen") {
        phase.current = "idle";
        targetLean.current = 0;
        targetPitch.current *= 0.2;
        phaseEnds.current = t + 1 + Math.random() * 2;
      } else if (roll < 0.55 * active) {
        phase.current = "scan";
        targetYaw.current = (Math.random() * 2 - 1) * (night ? 1.4 : 0.9);
        targetPitch.current = (Math.random() * 2 - 1) * 0.2;
        phaseEnds.current = t + 0.4 + Math.random() * 0.5;
      } else if (roll < 0.68) {
        phase.current = "blink";
        phaseEnds.current = t + 0.14;
      } else if (roll < 0.8 * active) {
        phase.current = "fluff";
        fluffAmt.current = 1;
        phaseEnds.current = t + 0.65 + Math.random() * 0.45;
      } else if (roll < 0.9 * active) {
        phase.current = "alert";
        targetYaw.current = (Math.random() * 2 - 1) * 1.15;
        targetPitch.current = -0.2;
        targetLean.current = 0.14;
        phaseEnds.current = t + 0.8 + Math.random() * 1.2;
      } else {
        phase.current = "hold";
        phaseEnds.current = t + 1.5 + Math.random() * 2;
      }
    }

    const yawSpeed = phase.current === "alert" ? 5.5 : phase.current === "scan" ? 3.2 : 2.2;
    headYaw.current = THREE.MathUtils.damp(headYaw.current, targetYaw.current, yawSpeed, dt);
    headPitch.current = THREE.MathUtils.damp(headPitch.current, targetPitch.current, 2.8, dt);
    lean.current = THREE.MathUtils.damp(lean.current, targetLean.current, 3.5, dt);
    fluffAmt.current = THREE.MathUtils.damp(fluffAmt.current, 0, 2.2, dt);

    const blinkTarget = phase.current === "blink" ? 1 : 0;
    blinkAmt.current = THREE.MathUtils.damp(blinkAmt.current, blinkTarget, 18, dt);

    const breath = Math.sin(t * (night ? 1.35 : 1.05) + offset) * 0.006;
    const fluff = fluffAmt.current * 0.04;

    if (head.current) {
      head.current.rotation.y = headYaw.current;
      head.current.rotation.x = headPitch.current + Math.sin(t * 0.35 + offset) * 0.02;
      head.current.rotation.z = headYaw.current * -0.08;
    }
    if (body.current) {
      body.current.position.y = breath + fluff * 0.35;
      body.current.rotation.x = lean.current + Math.sin(t * 0.5 + offset) * 0.015;
      body.current.scale.setScalar(1 + fluff * 0.55);
    }
    const wingOpen =
      fluffAmt.current * 0.35 +
      (phase.current === "preen" ? 0.22 : 0) +
      Math.sin(t * 0.7 + offset) * 0.03;
    if (wingL.current) wingL.current.rotation.z = 0.35 + wingOpen;
    if (wingR.current) wingR.current.rotation.z = -0.35 - wingOpen;
    if (tail.current) {
      tail.current.rotation.x = -0.35 + Math.sin(t * 0.6 + offset) * 0.04 + lean.current * 0.4;
    }
    const lid = 1 - blinkAmt.current * 0.92;
    if (eyeL.current) eyeL.current.scale.y = lid;
    if (eyeR.current) eyeR.current.scale.y = lid;
  });

  const fur = "#6e573c";
  const furDark = "#4a3a28";
  const furLite = "#9a8160";
  const chest = "#e6d8bc";
  const disc = "#dcc8a4";
  const beak = "#d4892a";
  const talon = "#2a1c10";

  return (
    <group position={position} scale={1.05}>
      <group ref={body}>
        <mesh position={[0, 0.02, 0]} scale={[0.92, 1.15, 0.88]} castShadow>
          <sphereGeometry args={[0.17, 20, 16]} />
          <meshPhysicalMaterial
            color={fur}
            roughness={0.78}
            sheen={0.4}
            sheenColor="#c4a878"
            sheenRoughness={0.55}
          />
        </mesh>
        <mesh position={[0.04, -0.02, 0]} scale={[0.7, 0.95, 0.72]}>
          <sphereGeometry args={[0.135, 16, 12]} />
          <meshStandardMaterial color={chest} roughness={0.82} />
        </mesh>
        {[
          [0.06, 0.06, 0.05],
          [0.06, 0.0, -0.05],
          [0.05, -0.08, 0.04],
          [0.05, -0.08, -0.04],
          [0.07, 0.1, 0],
        ].map(([x, y, z], i) => (
          <mesh key={`bar-${i}`} position={[x, y, z]} scale={[0.35, 0.9, 1.4]}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshStandardMaterial color="#c4b090" roughness={0.85} />
          </mesh>
        ))}
        {[
          [-0.08, 0.1, 0.08],
          [-0.08, 0.1, -0.08],
          [-0.1, 0.0, 0.06],
          [-0.1, 0.0, -0.06],
          [-0.06, 0.16, 0],
        ].map(([x, y, z], i) => (
          <mesh key={`spot-${i}`} position={[x, y, z]} scale={[1, 0.55, 1.2]}>
            <sphereGeometry args={[0.032, 8, 6]} />
            <meshStandardMaterial color={furDark} roughness={0.88} />
          </mesh>
        ))}

        {([-1, 1] as const).map((s) => (
          <group
            key={`wing-${s}`}
            ref={s < 0 ? wingL : wingR}
            position={[-0.02, 0.04, s * 0.13]}
            rotation={[0.2, s * 0.15, s * 0.35]}
          >
            <mesh scale={[0.42, 1.05, 0.32]} castShadow>
              <capsuleGeometry args={[0.07, 0.14, 5, 10]} />
              <meshPhysicalMaterial color={furDark} roughness={0.82} sheen={0.2} sheenColor="#a88860" />
            </mesh>
            {[0.02, -0.04, -0.1].map((yy, fi) => (
              <mesh
                key={`prim-${s}-${fi}`}
                position={[-0.02, yy, s * 0.02]}
                rotation={[0.1, 0, s * 0.15]}
                scale={[0.25, 0.85, 0.55]}
              >
                <capsuleGeometry args={[0.035, 0.06, 3, 6]} />
                <meshStandardMaterial color={fi === 2 ? "#3a2c1c" : furLite} roughness={0.86} />
              </mesh>
            ))}
          </group>
        ))}

        <group ref={tail} position={[-0.14, -0.06, 0]} rotation={[-0.35, 0, 0]}>
          {[-0.04, 0, 0.04].map((z, i) => (
            <mesh
              key={`tail-${i}`}
              position={[-0.04, 0, z]}
              rotation={[0.1, 0, (i - 1) * 0.12]}
              scale={[0.9, 0.35, 0.55]}
              castShadow
            >
              <capsuleGeometry args={[0.03, 0.08, 3, 6]} />
              <meshStandardMaterial color={i === 1 ? furDark : "#5a4630"} roughness={0.88} />
            </mesh>
          ))}
        </group>

        {([-1, 1] as const).map((s) => (
          <group key={`foot-${s}`} position={[0.03, -0.2, s * 0.055]} rotation={[0.15, 0, s * 0.1]}>
            <mesh rotation={[0.4, 0, 0]}>
              <capsuleGeometry args={[0.014, 0.035, 3, 6]} />
              <meshStandardMaterial color="#c97828" roughness={0.55} />
            </mesh>
            {[-0.025, 0, 0.025].map((fz, fi) => (
              <mesh
                key={`toe-${s}-${fi}`}
                position={[0.025, -0.035, fz]}
                rotation={[1.05, 0, -0.55 + fi * 0.15]}
                scale={[0.28, 1, 0.28]}
              >
                <coneGeometry args={[0.01, 0.032, 4]} />
                <meshStandardMaterial color={talon} roughness={0.45} />
              </mesh>
            ))}
            <mesh position={[-0.015, -0.03, 0]} rotation={[1.1, 0, 0.9]} scale={[0.28, 0.95, 0.28]}>
              <coneGeometry args={[0.009, 0.028, 4]} />
              <meshStandardMaterial color={talon} roughness={0.45} />
            </mesh>
          </group>
        ))}

        <group ref={head} position={[0, 0.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 18, 16]} />
            <meshPhysicalMaterial
              color="#65503a"
              roughness={0.76}
              sheen={0.35}
              sheenColor="#b89868"
              sheenRoughness={0.5}
            />
          </mesh>
          {([-1, 1] as const).map((s) => (
            <group key={`disc-${s}`} position={[0.05, 0.01, s * 0.065]}>
              <mesh scale={[0.5, 0.72, 0.9]}>
                <sphereGeometry args={[0.075, 14, 12]} />
                <meshStandardMaterial color={disc} roughness={0.72} />
              </mesh>
              <mesh position={[0.01, 0, 0]} scale={[0.35, 0.55, 0.7]}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <meshStandardMaterial color="#f0e4c8" roughness={0.68} />
              </mesh>
              <mesh position={[0.02, 0, 0]} rotation={[0, s * 0.2, 0]} scale={[0.15, 1, 1]}>
                <torusGeometry args={[0.055, 0.006, 6, 18]} />
                <meshStandardMaterial color="#b8a078" roughness={0.8} />
              </mesh>
            </group>
          ))}
          <mesh position={[0.08, 0.06, 0]} rotation={[0, 0, 0.15]} scale={[0.45, 0.25, 1.3]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={furDark} roughness={0.85} />
          </mesh>

          {([-1, 1] as const).map((s) => (
            <group key={`eye-${s}`} ref={s < 0 ? eyeL : eyeR} position={[0.07, 0.02, s * 0.072]}>
              <mesh>
                <sphereGeometry args={[0.04, 14, 12]} />
                <meshPhysicalMaterial
                  color="#f0c850"
                  roughness={0.22}
                  clearcoat={0.55}
                  clearcoatRoughness={0.18}
                  emissive="#6a4010"
                  emissiveIntensity={night ? 0.18 : 0.05}
                />
              </mesh>
              <mesh position={[0.018, 0, 0]}>
                <sphereGeometry args={[0.022, 12, 10]} />
                <meshPhysicalMaterial color="#1a1208" roughness={0.12} clearcoat={0.8} />
              </mesh>
              <mesh position={[0.026, 0, 0]}>
                <sphereGeometry args={[0.01, 8, 6]} />
                <meshBasicMaterial color="#050403" />
              </mesh>
              <mesh position={[0.024, 0.012, s * 0.008]}>
                <sphereGeometry args={[0.007, 6, 5]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.005, 0.028, 0]} rotation={[0, 0, 0.2]} scale={[0.9, 0.35, 1]}>
                <sphereGeometry args={[0.032, 10, 8]} />
                <meshStandardMaterial color="#5a4832" roughness={0.8} />
              </mesh>
            </group>
          ))}

          <group position={[0.125, -0.015, 0]} rotation={[0.15, 0, -0.35]}>
            <mesh castShadow>
              <coneGeometry args={[0.026, 0.065, 7]} />
              <meshPhysicalMaterial color={beak} roughness={0.38} clearcoat={0.25} />
            </mesh>
            <mesh position={[0, -0.02, 0]} rotation={[0.4, 0, 0]} scale={[0.7, 0.55, 0.7]}>
              <coneGeometry args={[0.016, 0.03, 5]} />
              <meshStandardMaterial color="#a86820" roughness={0.5} />
            </mesh>
          </group>

          {([-1, 1] as const).map((s) => (
            <group key={`ear-${s}`} position={[-0.02, 0.12, s * 0.09]} rotation={[0.2, 0, s * 0.45]}>
              <mesh scale={[0.38, 1.15, 0.32]} castShadow>
                <coneGeometry args={[0.042, 0.13, 6]} />
                <meshStandardMaterial color={furDark} roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.02, 0]} scale={[0.28, 0.9, 0.22]}>
                <coneGeometry args={[0.03, 0.1, 5]} />
                <meshStandardMaterial color={furLite} roughness={0.86} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
