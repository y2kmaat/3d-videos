import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { HostCharacter } from "./character/HostCharacter";

/** Model sheet: the host character rotating 360°, for reviewing the design. */
export const CharacterTurnaround: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const rot = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#2b2f5a, #0b0b18)" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 1.2, 10] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 6]} intensity={2.2} />
        <directionalLight position={[-4, 2, -3]} intensity={1.2} color="#8fb4ff" />
        <HostCharacter position={[0, -0.8, 0]} rotationY={rot} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
