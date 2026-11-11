import { useMemo } from "react";
import * as THREE from "three";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { CHARACTER } from "./config";

export type Gesture = "idle" | "wave" | "point" | "explain";

export type HostCharacterProps = {
  /** 0 (closed) to 1 (wide open); drive from audio or captions */
  mouthOpen?: number;
  /** 0 (neutral) to 1 (rounded "oo/oh" lips). Optional viseme hint. */
  mouthRound?: number;
  /** Whether the character is currently speaking (adds head nods and brow life) */
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

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

const Skin: React.FC<{ color?: string }> = ({ color = C.skin }) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.52}
    metalness={0}
    sheen={0.35}
    sheenRoughness={0.6}
    sheenColor={C.skinSheen}
    clearcoat={0.08}
    clearcoatRoughness={0.6}
  />
);

const Mat: React.FC<{ color: string; rough?: number; sheen?: number }> = ({ color, rough = 0.65, sheen = 0 }) => (
  <meshPhysicalMaterial color={color} roughness={rough} metalness={0} sheen={sheen} sheenColor="#ffffff" sheenRoughness={0.8} />
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Deterministic pseudo-random in [0,1) from an integer seed. */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A rounded tube along a smooth curve through `points`, with ball caps on both ends. */
const Tube: React.FC<{
  points: [number, number, number][];
  radius: number;
  color: string;
  rough?: number;
  segments?: number;
  skin?: boolean;
}> = ({ points, radius, color, rough = 0.8, segments = 24, skin = false }) => {
  const key = points.flat().map((n) => n.toFixed(3)).join(",") + radius;
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, segments, radius, 12, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const mat = skin ? <Skin color={color} /> : <Mat color={color} rough={rough} />;
  return (
    <group>
      <mesh geometry={geo}>{mat}</mesh>
      <mesh position={points[0]}>
        <sphereGeometry args={[radius, 12, 12]} />
        {mat}
      </mesh>
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[radius, 12, 12]} />
        {mat}
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Lighting: use inside any ThreeCanvas that shows the host            */
/* ------------------------------------------------------------------ */

export const HostLights: React.FC<{ accent?: string; rim?: number }> = ({ accent = "#FFB020", rim = 1 }) => (
  <>
    <ambientLight intensity={0.25} />
    {/* Key: warm, high, camera-left */}
    <directionalLight position={[-3, 4, 6]} intensity={2.4} color="#fff1e2" />
    {/* Fill: cool, low, camera-right */}
    <directionalLight position={[4, 1, 4]} intensity={0.7} color="#9fb6ff" />
    {/* Rim lights from behind: separate the silhouette from a dark background */}
    <directionalLight position={[-4, 3, -4]} intensity={2.2 * rim} color={accent} />
    <directionalLight position={[4, 3, -4]} intensity={1.6 * rim} color="#7aa2ff" />
    {/* Soft studio reflections (generated locally, no HDR download) */}
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2} position={[-3, 3, 4]} scale={[4, 3, 1]} color="#fff3e6" />
      <Lightformer form="rect" intensity={0.8} position={[4, 1, 3]} scale={[3, 3, 1]} color="#a9c0ff" />
      <Lightformer form="ring" intensity={1.5} position={[0, 3, -5]} scale={3} color={accent} />
    </Environment>
  </>
);

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

export const HostCharacter: React.FC<HostCharacterProps> = ({
  mouthOpen = 0,
  mouthRound = 0,
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

  // Idle life: breathing, sway, blinking (irregular, deterministic).
  const breathe = Math.sin(t * 2.0) * 0.012;
  const blinkEvery = [83, 101, 67, 112, 95];
  let acc = 11;
  let blink = 0;
  for (let i = 0; acc < frame + 200; i++) {
    const d = frame - acc;
    if (d >= 0 && d < 5) blink = Math.sin((d / 5) * Math.PI);
    acc += blinkEvery[i % blinkEvery.length];
  }
  const talk = talking ? 1 : 0;
  const nod = talk * (Math.sin(t * 6.5) * 0.03 + Math.sin(t * 2.3) * 0.02);
  const headY = Math.sin(t * 0.6) * 0.07 + lookX * 0.3 + talk * Math.sin(t * 1.7) * 0.05;
  const headX = Math.sin(t * 0.85) * 0.025 + nod - 0.03;
  const headZ = Math.sin(t * 0.45) * 0.035 + talk * Math.sin(t * 1.3) * 0.03;
  const brow = talk * clamp01(0.5 + Math.sin(t * 2.9) * 0.6) * 0.05 + mouthOpen * 0.015;
  const open = clamp01(mouthOpen);
  const round = clamp01(mouthRound);

  // Gesture blend in over ~0.35s.
  const g = interpolate(frame - gestureStart, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Arm pose: [shoulder raise (Z), shoulder forward (X), elbow bend, wrist twist]
  type Pose = { raise: number; fwd: number; elbow: number; twist: number; hand: HandShape };
  const rest: Pose = { raise: 0.12, fwd: 0.05, elbow: -0.2, twist: 0, hand: "relaxed" };
  let right: Pose = rest;
  let left: Pose = rest;
  if (gesture === "wave") {
    const w = Math.sin(t * 9) * 0.3;
    right = { raise: 0.12 + g * 2.2, fwd: g * -0.2, elbow: -0.2 - g * (1.1 + w), twist: g * 0.3, hand: "open" };
  } else if (gesture === "point") {
    right = { raise: 0.12 + g * 0.45, fwd: -g * 1.3, elbow: -0.2 + g * 0.05, twist: g * -0.4, hand: "point" };
  } else if (gesture === "explain") {
    const e = Math.sin(t * 3) * 0.12;
    const e2 = Math.sin(t * 2.4 + 1) * 0.12;
    right = { raise: 0.12 + g * 0.3, fwd: -g * (0.85 + e), elbow: -0.2 - g * 1.1, twist: g * 0.6, hand: "open" };
    left = { raise: 0.12 + g * 0.3, fwd: -g * (0.85 + e2), elbow: -0.2 - g * 1.1, twist: g * 0.6, hand: "open" };
  }

  // Locs: smooth curved tubes from under the durag down past the shoulders.
  const locs = useMemo(() => {
    const out: { pts: [number, number, number][]; r: number; tone: string; phase: number }[] = [];
    const n = CHARACTER.locCount;
    for (let i = 0; i < n; i++) {
      // From the right temple, around the back, to the left temple (face stays open).
      const a = interpolate(i, [0, n - 1], [Math.PI * 0.3, Math.PI * 1.7]);
      const front = Math.cos(a) > 0.2; // locs near the face hang a bit forward
      const len = 1.2 + rand(i) * 0.45;
      const r0 = 0.82;
      const sx = Math.sin(a);
      const sz = Math.cos(a);
      const out1 = 0.12 + rand(i + 7) * 0.08;
      const pts: [number, number, number][] = [
        [sx * r0, 0.32, sz * r0 - 0.04],
        [sx * (r0 + out1), -0.05, sz * (r0 + out1) - 0.06],
        [sx * (r0 + out1 + 0.04), -len * 0.55, sz * (r0 + out1) - (front ? 0 : 0.12)],
        [sx * (r0 + out1 + 0.02), -len, sz * (r0 + out1 - 0.05) - (front ? -0.05 : 0.2)],
      ];
      out.push({
        pts,
        r: 0.062 + rand(i + 99) * 0.018,
        tone: rand(i + 3) > 0.7 ? C.hairLight : C.hair,
        phase: rand(i + 21) * Math.PI * 2,
      });
    }
    return out;
  }, []);

  // Mouth shape
  const mouthW = 0.16 + (1 - round) * open * 0.03 - round * 0.05;
  const mouthH = 0.012 + open * 0.12 + round * 0.02;
  const jawDrop = open * 0.06;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* ---------- BODY ---------- */}
      <group position={[0, breathe, 0]}>
        <Torso />
        {/* Neck */}
        <mesh position={[0, 1.02, 0.02]}>
          <cylinderGeometry args={[0.27, 0.33, 0.55, 32]} />
          <Skin color={C.skinShadow} />
        </mesh>

        <Arm side={1} pose={right} t={t} />
        <Arm side={-1} pose={left} t={t} />
      </group>

      {/* ---------- HEAD ---------- */}
      <group position={[0, 2.08 + breathe * 1.2, 0]} rotation={[headX, headY, headZ]} scale={1.15}>
        {/* Cranium + face */}
        <mesh scale={[0.86, 1.04, 0.92]}>
          <sphereGeometry args={[0.9, 64, 64]} />
          <Skin />
        </mesh>
        {/* Ears */}
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.76, -0.02, -0.05]} rotation={[0, s * 0.35, 0]}>
            <mesh scale={[0.3, 0.6, 0.45]}>
              <sphereGeometry args={[0.3, 24, 24]} />
              <Skin color={C.skinShadow} />
            </mesh>
          </group>
        ))}

        <Durag t={t} />

        {/* Locs */}
        {locs.map((l, i) => {
          const sway = Math.sin(t * 1.4 + l.phase) * 0.04 + headZ * -0.6;
          return (
            <group key={i} rotation={[sway * 0.5, 0, sway]} position={[0, 0.32, 0]}>
              <group position={[0, -0.32, 0]}>
                <Tube points={l.pts} radius={l.r} color={l.tone} rough={0.95} segments={20} />
              </group>
            </group>
          );
        })}

        {/* Brows: thick, softly arched, lift while talking */}
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.27, 0.27 + brow, 0.73]} rotation={[0, s * 0.28, 0]}>
            <Tube
              points={[
                [-s * 0.13, -0.025, 0],
                [0, 0.012, 0.02],
                [s * 0.12, -0.005, 0],
              ]}
              radius={0.034}
              color={C.hair}
              rough={1}
              segments={12}
            />
          </group>
        ))}

        {/* Eyes */}
        {[1, -1].map((s) => (
          <Eye key={s} side={s as 1 | -1} blink={blink} lookX={lookX} />
        ))}

        {/* Nose: bridge, broad tip, nostril wings */}
        <mesh position={[0, -0.02, 0.8]} rotation={[0.22, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.16, 8, 16]} />
          <Skin />
        </mesh>
        <mesh position={[0, -0.17, 0.86]} scale={[1.35, 0.85, 0.95]}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <Skin />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.12, -0.21, 0.8]} scale={[0.8, 0.7, 0.75]}>
            <sphereGeometry args={[0.075, 24, 24]} />
            <Skin />
          </mesh>
        ))}

        {/* Mouth */}
        <group position={[0, -0.45 - jawDrop * 0.4, 0.79]} rotation={[0.12, 0, 0]}>
          {/* Cavity */}
          <mesh position={[0, -mouthH * 0.35, -0.03]} scale={[mouthW, mouthH, 0.07]}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshStandardMaterial color={C.mouth} roughness={0.9} />
          </mesh>
          {/* Upper teeth */}
          {open > 0.12 && (
            <RoundedBox args={[mouthW * 1.35, 0.045, 0.04]} radius={0.015} position={[0, -0.012, 0.036]}>
              <meshStandardMaterial color={C.teeth} roughness={0.35} />
            </RoundedBox>
          )}
          {/* Tongue */}
          {open > 0.3 && (
            <mesh position={[0, -mouthH * 0.8, 0.02]} scale={[mouthW * 0.7, 0.035, 0.03]}>
              <sphereGeometry args={[1, 20, 12]} />
              <meshStandardMaterial color={C.tongue} roughness={0.6} />
            </mesh>
          )}
          {/* Upper lip */}
          <Tube
            points={[
              [-mouthW - 0.012, -0.012, -0.03],
              [-mouthW * 0.45, 0.022, 0.015],
              [0, 0.016, 0.03],
              [mouthW * 0.45, 0.022, 0.015],
              [mouthW + 0.012, -0.012, -0.03],
            ]}
            radius={0.026}
            color={C.lips}
            skin
            segments={20}
          />
          {/* Lower lip (fuller), follows the jaw */}
          <Tube
            points={[
              [-mouthW - 0.005, -0.016, -0.03],
              [-mouthW * 0.45, -0.012 - mouthH * 0.85, 0.018],
              [0, -0.016 - mouthH * 0.95, 0.03],
              [mouthW * 0.45, -0.012 - mouthH * 0.85, 0.018],
              [mouthW + 0.005, -0.016, -0.03],
            ]}
            radius={0.036}
            color={C.lips}
            skin
            segments={20}
          />
        </group>

        {/* Mustache */}
        <Tube
          points={[
            [-0.2, -0.43, 0.74],
            [-0.1, -0.36, 0.83],
            [0, -0.355, 0.85],
            [0.1, -0.36, 0.83],
            [0.2, -0.43, 0.74],
          ]}
          radius={0.026}
          color={C.hair}
          rough={1}
          segments={16}
        />
        {/* Goatee sides down to the chin (move with the jaw) */}
        {[1, -1].map((s) => (
          <Tube
            key={s}
            points={[
              [s * 0.2, -0.43, 0.73],
              [s * 0.21, -0.56 - jawDrop * 0.5, 0.71],
              [s * 0.13, -0.7 - jawDrop, 0.66],
            ]}
            radius={0.045}
            color={C.hair}
            rough={1}
            segments={12}
          />
        ))}
        {/* Soul patch under the lower lip + filled chin */}
        <mesh position={[0, -0.63 - jawDrop, 0.66]} scale={[0.06, 0.05, 0.04]}>
          <sphereGeometry args={[1, 20, 20]} />
          <Mat color={C.hair} rough={1} />
        </mesh>
        <mesh position={[0, -0.74 - jawDrop, 0.56]} scale={[0.2, 0.13, 0.14]}>
          <sphereGeometry args={[1, 32, 32]} />
          <Mat color={C.hair} rough={1} />
        </mesh>
        {/* Chin beard: a soft tuft hanging below the chin */}
        <group position={[0, -0.84 - jawDrop, 0.6]} rotation={[0.35, 0, 0]}>
          <mesh scale={[0.2, 0.17, 0.15]}>
            <sphereGeometry args={[1, 32, 32]} />
            <Mat color={C.hair} rough={1} />
          </mesh>
          <mesh position={[0, -0.16, -0.04]} scale={[0.15, 0.2, 0.12]}>
            <sphereGeometry args={[1, 32, 32]} />
            <Mat color={C.hair} rough={1} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

const Torso: React.FC = () => {
  // Crewneck tee silhouette as a lathe: waist -> chest -> shoulders -> collar.
  const geo = useMemo(() => {
    const pts = [
      [0.0, -1.6],
      [0.9, -1.6],
      [0.98, -1.0],
      [1.04, -0.3],
      [1.06, 0.25],
      [1.0, 0.55],
      [0.82, 0.78],
      [0.52, 0.9],
      [0.3, 0.94],
      [0.0, 0.95],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 64);
  }, []);
  return (
    <group>
      <mesh geometry={geo} scale={[1, 1, 0.62]}>
        <Mat color={C.shirt} rough={0.92} sheen={0.4} />
      </mesh>
      {/* Collar ribbing */}
      <mesh position={[0, 0.9, 0.02]} rotation={[Math.PI / 2 - 0.1, 0, 0]} scale={[1, 0.72, 1]}>
        <torusGeometry args={[0.33, 0.045, 16, 48]} />
        <Mat color={C.shirtShadow} rough={0.9} />
      </mesh>
    </group>
  );
};

const Eye: React.FC<{ side: 1 | -1; blink: number; lookX: number }> = ({ side, blink, lookX }) => {
  const s = side;
  const lid = 0.38 + blink * 1.25; // upper lid rotation: relaxed, slightly heavy
  return (
    <group position={[s * 0.27, 0.07, 0.69]} rotation={[0, s * 0.2, 0]}>
      {/* Eyeball */}
      <mesh scale={[1.12, 0.9, 0.75]}>
        <sphereGeometry args={[0.13, 32, 32]} />
        <meshPhysicalMaterial color={C.eyeWhite} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <group position={[lookX * 0.035, -0.008, 0.09]}>
        {/* Iris */}
        <mesh scale={[1, 1, 0.45]}>
          <sphereGeometry args={[0.068, 32, 32]} />
          <meshPhysicalMaterial color={C.iris} roughness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.022]} scale={[1, 1, 0.4]}>
          <sphereGeometry args={[0.036, 24, 24]} />
          <meshBasicMaterial color="#050303" />
        </mesh>
        {/* Catch-light */}
        <mesh position={[-0.022, 0.026, 0.034]}>
          <sphereGeometry args={[0.014, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      {/* Upper lid */}
      <mesh rotation={[lid, 0, 0]} scale={[1.2, 0.98, 0.83]}>
        <sphereGeometry args={[0.136, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Skin color={C.skinShadow} />
      </mesh>
      {/* Lash line */}
      <mesh rotation={[lid - Math.PI / 2, 0, 0]} scale={[1.2, 0.98, 0.83]}>
        <torusGeometry args={[0.136, 0.009, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#120b08" roughness={1} />
      </mesh>
      {/* Lower lid */}
      <mesh rotation={[Math.PI - 0.5 - blink * 0.25, 0, 0]} scale={[1.18, 0.95, 0.8]}>
        <sphereGeometry args={[0.134, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Skin />
      </mesh>
    </group>
  );
};

const Durag: React.FC<{ t: number }> = ({ t }) => {
  const flutter = Math.sin(t * 2.2) * 0.06;
  return (
    <group>
      {/* Cap */}
      <mesh position={[0, 0.1, -0.04]} rotation={[-0.2, 0, 0]} scale={[0.94, 1.12, 0.99]}>
        <sphereGeometry args={[0.93, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.44]} />
        <meshPhysicalMaterial color={C.durag} roughness={0.55} sheen={0.8} sheenColor="#3a3d52" sheenRoughness={0.5} />
      </mesh>
      {/* Center seam */}
      <mesh position={[0, 0.1, -0.04]} rotation={[-0.2, Math.PI / 2, 0]} scale={[0.99, 1.13, 0.95]}>
        <torusGeometry args={[0.935, 0.012, 8, 64, Math.PI * 0.86]} />
        <meshStandardMaterial color="#26283a" roughness={0.4} />
      </mesh>
      {/* Wrapped band across the forehead */}
      <mesh position={[0, 0.38, -0.08]} rotation={[Math.PI / 2 - 0.22, 0, 0]} scale={[0.86, 0.94, 1]}>
        <torusGeometry args={[0.93, 0.07, 16, 64]} />
        <meshPhysicalMaterial color={C.durag} roughness={0.5} sheen={0.8} sheenColor="#3a3d52" sheenRoughness={0.5} />
      </mesh>
      {/* Knot at the back */}
      <mesh position={[0, 0.3, -0.9]} scale={[1.2, 0.8, 0.8]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshPhysicalMaterial color={C.durag} roughness={0.35} sheen={1} sheenColor="#4b4f66" />
      </mesh>
      {/* Tails */}
      {[1, -1].map((s, i) => (
        <group key={s} position={[s * 0.08, 0.28, -0.94]} rotation={[0.2 + flutter * (i ? 1 : -1), 0, s * 0.12]}>
          <mesh position={[0, -0.6, 0]}>
            <boxGeometry args={[0.2, 1.2 - i * 0.15, 0.025]} />
            <meshPhysicalMaterial color={C.durag} roughness={0.35} sheen={1} sheenColor="#4b4f66" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

type HandShape = "relaxed" | "open" | "point";

const Arm: React.FC<{
  side: 1 | -1;
  pose: { raise: number; fwd: number; elbow: number; twist: number; hand: HandShape };
  t: number;
}> = ({ side, pose, t }) => {
  return (
    <group position={[side * 0.98, 0.58, 0]} rotation={[pose.fwd, 0, side * pose.raise]}>
      {/* Sleeve (short, slightly flared) */}
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.27, 0.29, 0.5, 32]} />
        <Mat color={C.shirt} rough={0.92} sheen={0.4} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.27, 32, 32]} />
        <Mat color={C.shirt} rough={0.92} sheen={0.4} />
      </mesh>
      {/* Upper arm */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.17, 0.15, 0.6, 24]} />
        <Skin />
      </mesh>
      {/* Elbow */}
      <group position={[0, -0.92, 0]} rotation={[pose.elbow, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.152, 24, 24]} />
          <Skin />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.12, 0.6, 24]} />
          <Skin />
        </mesh>
        {/* Wrist + hand */}
        <group position={[0, -0.62, 0]} rotation={[0, side * pose.twist, 0]}>
          <Hand side={side} shape={pose.hand} t={t} />
        </group>
      </group>
    </group>
  );
};

const Hand: React.FC<{ side: 1 | -1; shape: HandShape; t: number }> = ({ side, shape, t }) => {
  // Curl per finger (index, middle, ring, pinky), radians per joint.
  const curls: Record<HandShape, number[]> = {
    relaxed: [0.45, 0.55, 0.6, 0.65],
    open: [0.1, 0.08, 0.1, 0.15],
    point: [0, 1.35, 1.4, 1.45],
  };
  const c = curls[shape];
  const wiggle = shape === "open" ? Math.sin(t * 3) * 0.05 : 0;
  const fingers = [
    { x: 0.075, len: 0.17 },
    { x: 0.025, len: 0.19 },
    { x: -0.025, len: 0.18 },
    { x: -0.072, len: 0.14 },
  ];
  return (
    <group>
      <mesh position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <Skin />
      </mesh>
      {/* Palm */}
      <RoundedBox args={[0.24, 0.24, 0.1]} radius={0.045} smoothness={4} position={[0, -0.14, 0]}>
        <Skin />
      </RoundedBox>
      {/* Fingers: two segments each, curl toward the palm (local +Z is palm-forward) */}
      {fingers.map((f, i) => {
        const curl = c[i] + wiggle;
        const r = 0.027;
        return (
          <group key={i} position={[f.x * side, -0.26, 0]} rotation={[curl, 0, 0]}>
            <mesh position={[0, -f.len * 0.28, 0]}>
              <capsuleGeometry args={[r, f.len * 0.5, 6, 12]} />
              <Skin />
            </mesh>
            <group position={[0, -f.len * 0.58, 0]} rotation={[curl * 1.1, 0, 0]}>
              <mesh position={[0, -f.len * 0.22, 0]}>
                <capsuleGeometry args={[r * 0.92, f.len * 0.38, 6, 12]} />
                <Skin />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* Thumb */}
      <group position={[0.12 * side, -0.12, 0.03]} rotation={[0.3, 0, side * (shape === "point" ? 0.4 : 0.75)]}>
        <mesh position={[0, -0.08, 0]}>
          <capsuleGeometry args={[0.032, 0.11, 6, 12]} />
          <Skin />
        </mesh>
        <mesh position={[0, -0.17, 0.01]} rotation={[0.3, 0, 0]}>
          <capsuleGeometry args={[0.029, 0.07, 6, 12]} />
          <Skin />
        </mesh>
      </group>
    </group>
  );
};
