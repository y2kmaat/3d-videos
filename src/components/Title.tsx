import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Title: React.FC<{ title: string; subtitle: string; accent: string }> = ({
  title,
  subtitle,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 5, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [90, 110], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        paddingTop: 90,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * -40}px)`,
        fontFamily: "Inter, Helvetica, Arial, sans-serif",
        color: "white",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>{title}</div>
      <div style={{ fontSize: 40, fontWeight: 500, color: accent, marginTop: 8 }}>{subtitle}</div>
    </AbsoluteFill>
  );
};
