import { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CHARACTER } from "./config";

export type Gesture = "idle" | "wave" | "point" | "explain";

export type HostCharacterProps = {
  /** 0 (closed) to 1 (wide open); drive from audio or captions */
  mouthOpen?: number;
  /** Whether the character is currently speaking (adds head nods) */
  talking?: boolean;
  gesture?: Gesture;
  /** Frame (local) at which the gesture starts, for easing in */
  gestureStart?: number;
  /** Where the eyes/head look: -1 (left) .. 1 (right) */
  lookX?: number;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
};

const C = CHARACTER.colors;

const Mat: React.FC<{ color: string; rough?: number }> = ({ color, rough = 0.65 }) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0.02} />
);

/** Deterministic pseudo-random in [0,1) from an integer seed. */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const HostCharacter: React.FC<HostCharacterProps> = ({
  mouthOpen = 0,
  talking = false,
  gesture = "idle",
  gestureStart = 0,
  lookX = 0,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Idle life: breathing, sway, blinking.
  const breathe = Math.sin(t * 2.2) * 0.015;
  const blinkPhase = (frame + 17) % 96; // blink about every 3.2s at 30fps
  const blink = blinkPhase < 4 ? Math.sin((blinkPhase / 4) * Math.PI) : 0;
  const nod = talking ? Math.sin(t * 7) * 0.035 : 0;
  const headY = Math.sin(t * 0.7) * 0.08 + lookX * 0.35;
  const headX = Math.sin(t * 0.9) * 0.03 + nod - 0.04;
  const headZ = Math.sin(t * 0.5) * 0.03;

  // Gesture blend in over ~0.4s.
  const g = interpolate(frame - gestureStart, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Arm rotations: [shoulderZ, shoulderX, elbowX]
  let right: [number, number, number] = [0.18, 0, -0.25];
  let left: [number, number, number] = [0.18, 0, -0.25];
  if (gesture === "wave") {
    const w = Math.sin(t * 9) * 0.35;
    right = [0.18 + g * 2.3, 0, -0.25 - g * (0.9 + w)];
  } else if (gesture === "point") {
    right = [0.18 + g * 0.5, -g * 1.25, -0.25 + g * 0.1];
  } else if (gesture === "explain") {
    const e = Math.sin(t * 3) * 0.15;
    right = [0.18 + g * 0.35, -g * (0.9 + e), -0.25 - g * 1.0];
    left = [0.18 + g * 0.35, -g * (0.9 - e), -0.25 - g * 1.0];
  }

  const locs = useMemo(() => {
    const out: { angle: number; len: number; tilt: number; r: number }[] = [];
    const n = CHARACTER.locCount;
    for (let i = 0; i < n; i++) {
      // From the right temple, around the back, to the left temple (leave face open).
      const angle = interpolate(i, [0, n - 1], [Math.PI * 0.33, Math.PI * 1.67]);
      out.push({
        angle,
        len: 1.15 + rand(i) * 0.35,
        tilt: 0.12 + rand(i + 50) * 0.12,
        r: 0.07 + rand(i + 99) * 0.02,
      });
    }
    return out;
  }, []);

  const mouthH = 0.02 + mouthOpen * 0.16;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* ---------- BODY ---------- */}
      <group position={[0, breathe, 0]}>
        {/* Torso: crewneck tee */}
        <mesh position={[0, -0.2, 0]} scale={[1.3, 1, 0.68]}>
          <capsuleGeometry args={[0.72, 0.8, 12, 32]} />
          <Mat color={C.shirt} rough={0.9} />
        </mesh>
        {/* Collar ribbing */}
        <mesh position={[0, 0.84, 0.04]} rotation={[Math.PI / 2 - 0.12, 0, 0]} scale={[1.05, 0.8, 1]}>
          <torusGeometry args={[0.36, 0.06, 12, 40]} />
          <Mat color={C.shirtShadow} rough={0.9} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.3, 0.34, 0.6, 24]} />
          <Mat color={C.skinShadow} />
        </mesh>

        <Arm side={1} rot={right} />
        <Arm side={-1} rot={left} />
      </group>

      {/* ---------- HEAD ---------- */}
      <group position={[0, 2.12 + breathe, 0]} rotation={[headX, headY, headZ]} scale={1.18}>
        {/* Skull / face */}
        <mesh scale={[0.86, 1.08, 0.9]}>
          <sphereGeometry args={[0.9, 48, 48]} />
          <Mat color={C.skin} />
        </mesh>
        {/* Jaw / chin mass */}
        <mesh position={[0, -0.5, 0.14]} scale={[0.66, 0.55, 0.62]}>
          <sphereGeometry args={[0.9, 32, 32]} />
          <Mat color={C.skin} />
        </mesh>
        {/* Ears */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.76, 0.0, -0.05]} scale={[0.35, 0.6, 0.45]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <Mat color={C.skinShadow} />
          </mesh>
        ))}

        {/* Durag: cap + wrapped band + tails */}
        <mesh position={[0, 0.12, -0.04]} rotation={[-0.22, 0, 0]} scale={[0.93, 1.13, 0.98]}>
          <sphereGeometry args={[0.93, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.43]} />
          <Mat color={C.durag} rough={0.45} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0, 0.42 + i * 0.1, -0.06 - i * 0.03]}
            rotation={[Math.PI / 2 - 0.22, 0, 0]}
            scale={[0.84 - i * 0.04, 0.9 - i * 0.04, 1]}
          >
            <torusGeometry args={[0.93, 0.065, 12, 48]} />
            <Mat color={C.durag} rough={0.4} />
          </mesh>
        ))}
        {[0.12, -0.12].map((x, i) => (
          <mesh key={x} position={[x, -0.25, -0.9]} rotation={[0.25, 0, x * 0.6]}>
            <boxGeometry args={[0.22, 1.3 - i * 0.15, 0.03]} />
            <Mat color={C.durag} rough={0.45} />
          </mesh>
        ))}

        {/* Locs hanging from under the durag */}
        {locs.map((l, i) => {
          const sway = Math.sin(t * 1.3 + i) * 0.03;
          const x = Math.sin(l.angle) * 0.8;
          const z = Math.cos(l.angle) * 0.8 - 0.05;
          return (
            <group key={i} position={[x, 0.3, z]} rotation={[0, l.angle, 0]}>
              <mesh position={[0, -l.len / 2, 0]} rotation={[-(l.tilt + sway), 0, 0]}>
                <capsuleGeometry args={[l.r, l.len, 6, 10]} />
                <Mat color={C.hair} rough={1} />
              </mesh>
            </group>
          );
        })}

        {/* Brows */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.27, 0.25, 0.74]} rotation={[0, s * 0.25, Math.PI / 2 + s * 0.08]}>
            <capsuleGeometry args={[0.035, 0.2, 4, 8]} />
            <Mat color={C.hair} rough={1} />
          </mesh>
        ))}

        {/* Eyes with heavy, relaxed lids */}
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.27, 0.08, 0.7]} rotation={[0, s * 0.22, 0]}>
            <mesh scale={[1.25, 0.8, 0.6]}>
              <sphereGeometry args={[0.125, 24, 24]} />
              <Mat color={C.eyeWhite} rough={0.3} />
            </mesh>
            <mesh position={[lookX * 0.03, -0.012, 0.055]}>
              <sphereGeometry args={[0.064, 20, 20]} />
              <Mat color={C.iris} rough={0.2} />
            </mesh>
            {/* Upper lid: rotates down to cover the eye */}
            <mesh rotation={[0.55 + blink * 1.1, 0, 0]} scale={[1.3, 0.85, 0.66]}>
              <sphereGeometry args={[0.133, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <Mat color={C.skinShadow} />
            </mesh>
          </group>
        ))}

        {/* Nose: broad tip + bridge */}
        <mesh position={[0, -0.04, 0.78]} rotation={[0.25, 0, 0]}>
          <capsuleGeometry args={[0.055, 0.16, 6, 12]} />
          <Mat color={C.skin} />
        </mesh>
        <mesh position={[0, -0.19, 0.83]} scale={[1.45, 0.85, 0.95]}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <Mat color={C.skin} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.15, -0.24, 0.8]} scale={[0.8, 0.7, 0.8]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <Mat color={C.skin} />
          </mesh>
        ))}

        {/* Mouth */}
        <group position={[0, -0.47, 0.7]}>
          <mesh scale={[0.17, mouthH, 0.06]} position={[0, -0.02, 0.02]}>
            <sphereGeometry args={[1, 24, 16]} />
            <Mat color={C.mouth} rough={0.8} />
          </mesh>
          {mouthOpen > 0.3 && (
            <mesh scale={[0.15, 0.03, 0.04]} position={[0, mouthH * 0.45, 0.02]}>
              <sphereGeometry args={[1, 16, 8]} />
              <Mat color={C.teeth} rough={0.3} />
            </mesh>
          )}
          {/* Upper lip */}
          <mesh position={[0, 0.035 + mouthH * 0.4, 0.04]} scale={[0.17, 0.042, 0.06]}>
            <sphereGeometry args={[1, 24, 16]} />
            <Mat color={C.lips} rough={0.4} />
          </mesh>
          {/* Lower lip (fuller) */}
          <mesh position={[0, -0.05 - mouthH * 0.6, 0.045]} scale={[0.155, 0.055, 0.07]}>
            <sphereGeometry args={[1, 24, 16]} />
            <Mat color={C.lips} rough={0.4} />
          </mesh>
        </group>

        {/* Mustache */}
        <mesh position={[0, -0.37, 0.77]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.5]}>
          <capsuleGeometry args={[0.024, 0.3, 4, 12]} />
          <Mat color={C.hair} rough={1} />
        </mesh>
        {/* Goatee sides connecting mustache to chin */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.19, -0.6, 0.67]} rotation={[0.2, s * 0.3, -s * 0.12]} scale={[1, 1, 0.5]}>
            <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
            <Mat color={C.hair} rough={1} />
          </mesh>
        ))}
        {/* Chin hair connecting goatee to beard */}
        <mesh position={[0, -0.74 - mouthOpen * 0.04, 0.58]} rotation={[0.5, 0, 0]} scale={[0.2, 0.12, 0.12]}>
          <sphereGeometry args={[1, 20, 20]} />
          <Mat color={C.hair} rough={1} />
        </mesh>
        {/* Chin beard: hangs below the chin */}
        <mesh position={[0, -0.95 - mouthOpen * 0.05, 0.42]} rotation={[0.3, 0, 0]} scale={[0.24, 0.3, 0.2]}>
          <sphereGeometry args={[1, 24, 24]} />
          <Mat color={C.hair} rough={1} />
        </mesh>
      </group>
    </group>
  );
};

const Arm: React.FC<{ side: 1 | -1; rot: [number, number, number] }> = ({ side, rot }) => {
  const [shoulderZ, shoulderX, elbowX] = rot;
  return (
    <group position={[side * 0.92, 0.62, 0]} rotation={[shoulderX, 0, side * shoulderZ]}>
      {/* Sleeve */}
      <mesh position={[0, -0.25, 0]}>
        <capsuleGeometry args={[0.3, 0.35, 8, 16]} />
        <Mat color={C.shirt} rough={0.9} />
      </mesh>
      {/* Upper arm */}
      <mesh position={[0, -0.6, 0]}>
        <capsuleGeometry args={[0.2, 0.45, 8, 16]} />
        <Mat color={C.skin} />
      </mesh>
      {/* Forearm + hand */}
      <group position={[0, -0.95, 0]} rotation={[elbowX, 0, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <capsuleGeometry args={[0.17, 0.45, 8, 16]} />
          <Mat color={C.skin} />
        </mesh>
        <mesh position={[0, -0.78, 0]} scale={[0.85, 1.1, 0.6]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <Mat color={C.skin} />
        </mesh>
      </group>
    </group>
  );
};
