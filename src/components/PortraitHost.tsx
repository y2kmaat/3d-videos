import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  /** "portrait": animate a still AI-generated character image. "video": play a talking-head clip. */
  mode: "portrait" | "video";
  src: string;
  talking: boolean;
  top: number;
  bottom: number;
  /** Vertical focus of the crop (0 = top, 100 = bottom) */
  focusY?: number;
};

/**
 * Shows a realistic (e.g. Pixar-style AI-generated) version of the host inside the stage band.
 * Stills get subtle "alive" motion: slow push-in, breathing, and small nods while talking.
 */
export const PortraitHost: React.FC<Props> = ({ mode, src, talking, top, bottom, focusY = 25 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const pushIn = interpolate(frame, [0, durationInFrames], [1.0, 1.08]);
  const breathe = 1 + Math.sin(t * 2.2) * 0.006;
  const nodY = talking ? Math.sin(t * 7) * 4 : 0;
  const sway = Math.sin(t * 0.6) * 0.6;

  const media =
    mode === "video" ? (
      <OffthreadVideo src={staticFile(src)} style={fill(focusY)} />
    ) : (
      <Img src={staticFile(src)} style={fill(focusY)} />
    );

  return (
    <AbsoluteFill style={{ top, height: bottom - top, overflow: "hidden", opacity: enter }}>
      <AbsoluteFill
        style={{
          transform:
            mode === "video"
              ? undefined
              : `translateY(${nodY}px) scale(${pushIn * breathe}) rotate(${sway}deg)`,
          transformOrigin: "50% 40%",
        }}
      >
        {media}
      </AbsoluteFill>
      {/* Vignette to blend into the black layout */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />
    </AbsoluteFill>
  );
};

const fill = (focusY: number): React.CSSProperties => ({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: `50% ${focusY}%`,
});
