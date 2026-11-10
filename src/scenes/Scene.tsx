import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

// IMPORTANT: In Remotion, never use useFrame() / clocks for animation.
// Derive everything from useCurrentFrame() so renders are deterministic.

const ORBITERS = 8;

export const Scene: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera);
  const t = frame / fps;

  // Camera slowly dollies in and orbits.
  const radius = interpolate(frame, [0, durationInFrames], [9, 6.5]);
  const angle = interpolate(frame, [0, durationInFrames], [-0.4, 0.4]);
  camera.position.set(Math.sin(angle) * radius, 0.6, Math.cos(angle) * radius);
  camera.lookAt(0, 0, 0);

  const intro = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const outro = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = intro * outro;

  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  return (
    <>
      <color attach="background" args={["#07060f"]} />
      <fog attach="fog" args={["#07060f", 8, 18]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <pointLight position={[-4, -2, 3]} intensity={30} color={accentColor} />
      <pointLight position={[4, 3, -3]} intensity={20} color="#00d4ff" />

      {/* Hero object */}
      <mesh rotation={[t * 0.6, t * 0.9, 0]} scale={scale}>
        <torusKnotGeometry args={[1, 0.32, 256, 48]} />
        <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Orbiting satellites */}
      {new Array(ORBITERS).fill(true).map((_, i) => {
        const a = (i / ORBITERS) * Math.PI * 2 + t * 0.8;
        const r = 3 + Math.sin(t + i) * 0.3;
        const delay = 10 + i * 4;
        const s = spring({ frame: frame - delay, fps, config: { damping: 12 } }) * outro;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, Math.sin(a * 2) * 0.6, Math.sin(a) * r]}
            rotation={[t * 2 + i, t * 1.5, 0]}
            scale={0.28 * s}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i % 2 ? "#00d4ff" : "#ffffff"}
              flatShading
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        );
      })}

      {/* Ground grid for depth */}
      <gridHelper args={[40, 40, "#2a2350", "#16122e"]} position={[0, -2.2, 0]} />
    </>
  );
};
