import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { HostCharacter, type Gesture } from "./character/HostCharacter";
import { Captions } from "./components/Captions";
import { SHORTS_FONT } from "./lib/fonts";
import { CameraRig } from "./lib/CameraRig";
import { PortraitHost } from "./components/PortraitHost";
import { GlbHost } from "./character/GlbHost";
import { isTalkingAt, mouthOpenAt, useCaptions } from "./lib/useCaptions";

// Layout (px, 1080x1920). Camera is framed so the character fills the stage band.
const STAGE_TOP = 470;
const STAGE_BOTTOM = 1500;

const gestureSchema = z.enum(["idle", "wave", "point", "explain"]);

export const characterShortSchema = z.object({
  /** Big headline at the top of the frame */
  headline: z.string(),
  /** Punchline under the captions, e.g. "WATCH TO LEARN HOW" */
  footer: z.string(),
  captionsFile: z.string(),
  /** Voiceover track in public/ (leave empty if none) */
  voiceFile: z.string(),
  /** Background music in public/ (leave empty if none) */
  musicFile: z.string(),
  musicVolume: z.number().min(0).max(1),
  /** Gesture timeline: each entry starts at `at` seconds */
  gestures: z.array(z.object({ at: z.number(), gesture: gestureSchema })),
  accent: z.string(),
  /**
   * Which host to show:
   * - "3d": the built-in procedural HostCharacter
   * - "portrait": a still image (e.g. a Pixar-style AI render of you) in public/
   * - "video": a talking-head clip (e.g. from a lip-sync tool) in public/; its own audio is used
   * - "glb": a realistic rigged 3D avatar (.glb) in public/, lip-synced to the captions
   */
  host: z.enum(["3d", "portrait", "video", "glb"]),
  hostModel: z.string(),
  /** Optional animation clip name inside the .glb (e.g. an idle loop) */
  hostAnimation: z.string(),
  /** Size of the .glb avatar on screen (world units it is scaled to; ~3 fills the stage) */
  hostModelHeight: z.number().min(0.5).max(10),
  hostImage: z.string(),
  hostVideo: z.string(),
  /** Crop focus for portrait/video, 0 = top, 100 = bottom */
  hostFocusY: z.number().min(0).max(100),
});

export type CharacterShortProps = z.infer<typeof characterShortSchema>;

/** Vertical 9:16 talking-host video featuring the official character. */
export const CharacterShort: React.FC<CharacterShortProps> = ({
  headline,
  footer,
  captionsFile,
  voiceFile,
  musicFile,
  musicVolume,
  gestures,
  accent,
  host,
  hostImage,
  hostVideo,
  hostFocusY,
  hostModel,
  hostAnimation,
  hostModelHeight,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const captions = useCaptions(captionsFile);
  const ms = (frame / fps) * 1000;

  // Current gesture from the timeline.
  const sorted = [...gestures].sort((a, b) => a.at - b.at);
  const current = sorted.filter((g) => g.at * fps <= frame).pop();
  const gesture: Gesture = current?.gesture ?? "idle";
  const gestureStart = current ? Math.round(current.at * fps) : 0;

  const enter = spring({ frame, fps, config: { damping: 14 } });
  const headlineIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const footerIn = spring({ frame: frame - Math.round(fps * 1.5), fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeOut }}>
      {/* Stage */}
      <AbsoluteFill style={{ top: STAGE_TOP, height: STAGE_BOTTOM - STAGE_TOP, background: `radial-gradient(circle at 50% 35%, ${accent}, #0b1a4a 55%, #050816)` }} />
      {host === "3d" ? (
        <ThreeCanvas width={width} height={height} camera={{ fov: 30 }}>
          {/* Frames the character from mid-torso to the top of the durag inside the stage band */}
          <CameraRig position={[0, 1.78, 14]} target={[0, 1.78, 0]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 5, 6]} intensity={2.3} />
          <directionalLight position={[-4, 2, -3]} intensity={1.4} color="#8fb4ff" />
          <pointLight position={[0, 3, 3]} intensity={8} color={accent} />
          <HostCharacter
            position={[0, -(1 - enter) * 3, 0]}
            mouthOpen={mouthOpenAt(captions, ms)}
            talking={isTalkingAt(captions, ms)}
            gesture={gesture}
            gestureStart={gestureStart}
            lookX={Math.sin(frame / 50) * 0.15}
          />
        </ThreeCanvas>
      ) : host === "glb" ? (
        <ThreeCanvas width={width} height={height} camera={{ fov: 30 }}>
          <CameraRig position={[0, 1.78, 14]} target={[0, 1.78, 0]} />
          <hemisphereLight args={["#fff4e8", "#2a1d18", 1.1]} />
          <directionalLight position={[2.5, 3, 5]} intensity={2.6} color="#ffe6cc" />
          <directionalLight position={[-3, 1.5, 2]} intensity={0.8} color="#9fb8ff" />
          <directionalLight position={[0, 3, -4]} intensity={2.2} color={accent} />
          <GlbHost
            src={hostModel}
            animation={hostAnimation || undefined}
            mouthOpen={mouthOpenAt(captions, ms)}
            talking={isTalkingAt(captions, ms)}
            lookX={Math.sin(frame / 50) * 0.15}
            height={hostModelHeight}
            position={[0, 1.78 - (1 - enter) * 4, 0]}
          />
        </ThreeCanvas>
      ) : (
        <PortraitHost
          mode={host as "portrait" | "video"}
          src={host === "video" ? hostVideo : hostImage}
          talking={isTalkingAt(captions, ms)}
          top={STAGE_TOP}
          bottom={STAGE_BOTTOM}
          focusY={hostFocusY}
        />
      )}

      {/* Fade the character's lower body into the caption area */}
      <AbsoluteFill style={{ top: STAGE_BOTTOM - 220, height: 220, background: "linear-gradient(transparent, #000)" }} />
      <AbsoluteFill style={{ top: STAGE_BOTTOM, backgroundColor: "#000" }} />

      {/* Headline */}
      <AbsoluteFill style={{ top: 60, height: STAGE_TOP - 60, justifyContent: "center", alignItems: "center", paddingInline: 70 }}>
        <div style={{ ...shortsText, fontSize: 120, opacity: headlineIn, transform: `translateY(${(1 - headlineIn) * -30}px)` }}>
          {headline}
        </div>
      </AbsoluteFill>

      <Captions captions={captions} accent={accent} variant="bold" bottom={250} />

      {/* Footer */}
      <AbsoluteFill style={{ top: 1720, height: 140, justifyContent: "center", alignItems: "center" }}>
        <div style={{ ...shortsText, fontSize: 74, opacity: footerIn, transform: `scale(${0.9 + footerIn * 0.1})` }}>
          {footer}
        </div>
      </AbsoluteFill>

      {voiceFile ? <Audio src={staticFile(voiceFile)} /> : null}
      {musicFile ? <Audio src={staticFile(musicFile)} volume={musicVolume} /> : null}
    </AbsoluteFill>
  );
};

const shortsText: React.CSSProperties = {
  fontFamily: SHORTS_FONT,
  fontWeight: 400,
  fontStyle: "italic",
  textAlign: "center",
  lineHeight: 1.05,
  textTransform: "uppercase",
  color: "#fff6a8",
  background: "linear-gradient(#ffffff 0%, #fff27a 45%, #ffd60a 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 6px 0 #000) drop-shadow(0 0 18px rgba(0,0,0,0.7))",
  // Italic glyphs overhang their box; padding keeps background-clip text from cutting them off.
  padding: "0 0.2em",
};
