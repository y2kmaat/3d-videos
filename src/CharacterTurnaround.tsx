import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { HostCharacter, HostLights } from "./character/HostCharacter";
import { CameraRig } from "./lib/CameraRig";

/** Model sheet: the host character rotating 360°, for reviewing the design. */
export const CharacterTurnaround: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const rot = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #1d1f29, #0B0B0F 70%)" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30 }}>
        <CameraRig position={[0, 1.3, 10.5]} target={[0, 1.3, 0]} />
        <HostLights />
        <HostCharacter position={[0, -0.4, 0]} rotationY={rot} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Close-up of the face cycling through mouth shapes, gestures and blinks, for reviewing detail. */
export const CharacterFaceTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  // Step through fixed mouth shapes every 0.5 s: closed, half, open, round "oo", wide "ah".
  const shapes: [number, number][] = [[0, 0], [0.45, 0], [1, 0], [0.4, 1], [0.8, 0.2]];
  const [open, round] = shapes[Math.floor(t * 2) % shapes.length];
  const gesture = t < 2 ? "wave" : t < 4 ? "explain" : "point";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #1d1f29, #0B0B0F 70%)" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30 }}>
        <CameraRig position={[0, 1.9, 8]} target={[0, 1.6, 0]} />
        <HostLights />
        <HostCharacter
          mouthOpen={open}
          mouthRound={round}
          talking
          gesture={gesture}
          gestureStart={gesture === "wave" ? 0 : gesture === "explain" ? 2 * fps : 4 * fps}
          lookX={Math.sin(t) * 0.3}
        />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
