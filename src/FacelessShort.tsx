import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { HostCharacter, HostLights } from "./character/HostCharacter";
import { GlbHost } from "./character/GlbHost";
import { CameraRig } from "./lib/CameraRig";
import { CAPTION_FONT, SHORTS_FONT } from "./lib/fonts";
import { STYLE } from "./lib/style";
import { mouthAt, mouthRoundAt, talkingAt, useVoice, type Voice } from "./lib/useVoice";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

const beatSchema = z.object({
  /** Seconds from the start */
  at: z.number(),
  /** host = full-frame character, split = graphic on top + host card, card = full graphic */
  layout: z.enum(["host", "split", "card"]),
  gesture: z.enum(["idle", "wave", "point", "explain"]).optional(),
  /** Headline for split/card layouts. Wrap the accent word in *stars*. */
  title: z.string().optional(),
  /** List that builds item by item */
  items: z.array(z.string()).optional(),
  /** Big number that counts up, e.g. "$0" or "20" */
  number: z.string().optional(),
  numberLabel: z.string().optional(),
  /** Amber flash on the cut (max 1 per 10 s) */
  flash: z.boolean().optional(),
});

export const facelessShortSchema = z.object({
  /** Name in public/voice/ made by scripts/make-voice.py */
  voice: z.string(),
  /** Hook title shown 0–3 s. Wrap the accent word in *stars*. */
  hook: z.string(),
  beats: z.array(beatSchema),
  /** Words highlighted in amber in the captions */
  keywords: z.array(z.string()),
  musicFile: z.string(),
  /** 0.125 ≈ 18 dB under the voice (style.md §9) */
  musicVolume: z.number().min(0).max(1),
  /** "3d" = built-in character, "glb" = realistic avatar file (see docs/realistic-host.md) */
  host: z.enum(["3d", "glb"]).optional(),
  /** Avatar file in public/ (host "glb") */
  hostModel: z.string().optional(),
  /** Body animation clip inside the .glb, e.g. a Mixamo idle/talking loop (optional) */
  hostAnimation: z.string().optional(),
});

export type FacelessShortProps = z.infer<typeof facelessShortSchema>;
type Beat = z.infer<typeof beatSchema>;

/** Video length = voice length + 0.2 s (style.md §3: hard cut after the last word). */
export const calculateFacelessMetadata: CalculateMetadataFunction<FacelessShortProps> = async ({ props }) => {
  const m = await fetch(staticFile(`voice/${props.voice}.mouth.json`)).then((r) => r.json());
  return { durationInFrames: Math.ceil(m.open.length + 0.2 * m.fps) };
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const FacelessShort: React.FC<FacelessShortProps> = ({
  voice: voiceName,
  hook,
  beats,
  keywords,
  musicFile,
  musicVolume,
  host: hostType = "3d",
  hostModel = "host/host-avatar.glb",
  hostAnimation = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const voice = useVoice(voiceName);
  const sec = frame / fps;

  const sorted = [...beats].sort((a, b) => a.at - b.at);
  const idx = Math.max(0, lastIndex(sorted, (b) => b.at <= sec));
  const beat: Beat = sorted[idx] ?? { at: 0, layout: "host" };
  const beatFrame = frame - Math.round(beat.at * fps);
  // Punch-in alternates on consecutive host shots (style.md §4)
  const hostCount = sorted.slice(0, idx + 1).filter((b) => b.layout === "host").length;
  const punch = hostCount % 2 === 0 ? 1.12 : 1;

  const host = (
    <HostScene
      voice={voice}
      sec={sec}
      gesture={beat.gesture ?? "explain"}
      gestureStart={Math.round(beat.at * fps)}
      glb={hostType === "glb" ? { src: hostModel, animation: hostAnimation } : null}
    />
  );
  // Camera framing per host type: [position, target] for the full-frame and the split-card shots.
  const cams = hostType === "glb" ? GLB_CAMS : CHARACTER_CAMS;

  const flash = beat.flash ? interpolate(beatFrame, [0, 4], [0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.bg }}>
      {beat.layout === "host" && (
        <AbsoluteFill style={{ transform: `scale(${punch})`, background: "radial-gradient(circle at 50% 38%, #23202a, #0B0B0F 65%)" }}>
          <HostCanvas width={1080} height={1920} camera={cams.full[0]} target={cams.full[1]}>
            {host}
          </HostCanvas>
        </AbsoluteFill>
      )}

      {beat.layout === "split" && (
        <>
          <AbsoluteFill style={{ height: 1040 }}>
            <Graphic beat={beat} beatFrame={beatFrame} compact />
          </AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: 140,
              top: 1100,
              width: 800,
              height: 820,
              borderRadius: 32,
              overflow: "hidden",
              border: `2px solid ${STYLE.border}`,
              background: "radial-gradient(circle at 50% 30%, #23202a, #111216 70%)",
            }}
          >
            <HostCanvas width={800} height={820} camera={cams.card[0]} target={cams.card[1]}>
              {host}
            </HostCanvas>
          </div>
        </>
      )}

      {beat.layout === "card" && <Graphic beat={beat} beatFrame={beatFrame} />}

      {/* Hook title, 0–3 s (style.md §2) */}
      {sec < 3 && <Headline text={hook} frame={frame} y={420} />}

      <WordCaptions voice={voice} keywords={keywords} y={beat.layout === "split" ? 1050 : beat.layout === "host" ? 1560 : 1340} />

      {flash > 0 && <AbsoluteFill style={{ backgroundColor: STYLE.accent, opacity: flash }} />}

      <Audio src={staticFile(`voice/${voiceName}.mp3`)} />
      {musicFile ? <Audio src={staticFile(musicFile)} volume={musicVolume} loop /> : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Host                                                                */
/* ------------------------------------------------------------------ */

const HostCanvas: React.FC<{
  width: number;
  height: number;
  camera: [number, number, number];
  target: [number, number, number];
  children: React.ReactNode;
}> = ({ width, height, camera, target, children }) => (
  <ThreeCanvas width={width} height={height} camera={{ fov: 30 }}>
    <CameraRig position={camera} target={target} />
    <HostLights accent={STYLE.accent} />
    {children}
  </ThreeCanvas>
);

type Vec3 = [number, number, number];
const CHARACTER_CAMS: Record<"full" | "card", [Vec3, Vec3]> = {
  full: [[0, 2.35, 11], [0, 2.35, 0]],
  card: [[0, 2.0, 8.5], [0, 1.75, 0]],
};
// Realistic avatar: scaled to 3.6 units tall, feet on the floor. Frames head + chest.
const GLB_HEIGHT = 3.6;
const GLB_CAMS: Record<"full" | "card", [Vec3, Vec3]> = {
  full: [[0, 3.0, 4.8], [0, 2.92, 0]],
  card: [[0, 3.2, 3.1], [0, 3.14, 0]],
};

const HostScene: React.FC<{
  voice: Voice | null;
  sec: number;
  gesture: "idle" | "wave" | "point" | "explain";
  gestureStart: number;
  glb: { src: string; animation: string } | null;
}> = ({ voice, sec, gesture, gestureStart, glb }) => {
  const ms = sec * 1000;
  if (glb) {
    return (
      <GlbHost
        src={glb.src}
        animation={glb.animation || undefined}
        mouthOpen={mouthAt(voice, sec)}
        talking={talkingAt(voice, ms)}
        lookX={Math.sin(sec * 0.6) * 0.12}
        height={GLB_HEIGHT}
        position={[0, GLB_HEIGHT / 2, 0]}
      />
    );
  }
  return (
    <HostCharacter
      mouthOpen={mouthAt(voice, sec)}
      mouthRound={mouthRoundAt(voice, ms)}
      talking={talkingAt(voice, ms)}
      gesture={gesture}
      gestureStart={gestureStart}
      lookX={Math.sin(sec * 0.6) * 0.12}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

const ease = Easing.out(Easing.cubic);

const lastIndex = <T,>(arr: T[], pred: (x: T) => boolean) => {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
};

/** "ALL YOUR *SOCIALS*" -> white text with the starred word in amber. */
const accentText = (text: string) =>
  text.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith("*") ? (
      <span key={i} style={{ color: STYLE.accent }}>
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

const Headline: React.FC<{ text: string; frame: number; y: number; size?: number }> = ({ text, frame, y, size = 92 }) => {
  const p = interpolate(frame, [0, 6], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: y,
        transform: `translateY(calc(-50% + ${(1 - p) * 24}px))`,
        opacity: p,
        textAlign: "center",
        fontFamily: SHORTS_FONT,
        fontSize: size,
        lineHeight: 1.0,
        letterSpacing: "-0.005em",
        textTransform: "uppercase",
        color: STYLE.text,
        textShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      {accentText(text)}
    </div>
  );
};

/** 1–2 words at a time on a dark box (style.md §5). */
const WordCaptions: React.FC<{ voice: Voice | null; keywords: string[]; y: number }> = ({ voice, keywords, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!voice) return null;
  const ms = (frame / fps) * 1000;
  const caps = voice.captions;

  // Group into chunks of 1–2 words, ≤ 14 chars, never across a sentence end.
  const groups: { start: number; end: number; words: string[] }[] = [];
  for (let i = 0; i < caps.length; i++) {
    const w = caps[i].text.trim();
    const last = groups[groups.length - 1];
    const prevEndsSentence = i > 0 && /[.!?,]$/.test(caps[i - 1].text.trim());
    if (last && last.words.length < 2 && !prevEndsSentence && (last.words.join(" ") + " " + w).length <= 14) {
      last.words.push(w);
      last.end = caps[i].endMs;
    } else {
      groups.push({ start: caps[i].startMs, end: caps[i].endMs, words: [w] });
    }
  }
  const gi = lastIndex(groups, (g) => g.start <= ms);
  if (gi < 0) return null;
  const g = groups[gi];
  const next = groups[gi + 1];
  if (!next && ms > g.end + 300) return null;

  const local = (ms - g.start) / (1000 / fps); // frames since this caption appeared
  const p = interpolate(local, [0, 3], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kw = new Set(keywords.map((k) => k.toLowerCase()));
  const clean = (w: string) => w.replace(/[^\p{L}\p{N}$%'-]/gu, "");

  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `translateY(-50%) scale(${0.9 + 0.1 * p})`,
          opacity: p,
          background: STYLE.captionBox,
          borderRadius: 14,
          padding: "14px 24px",
          fontFamily: CAPTION_FONT,
          fontWeight: 700,
          fontSize: 66,
          lineHeight: 1.1,
          color: STYLE.text,
          whiteSpace: "nowrap",
        }}
      >
        {g.words.map((w, i) => {
          const c = clean(w);
          const isKw = kw.has(c.toLowerCase());
          return (
            <span key={i} style={{ color: isKw ? STYLE.accent : STYLE.text }}>
              {(i ? " " : "") + c}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Graphics (style.md §7)                                              */
/* ------------------------------------------------------------------ */

const Graphic: React.FC<{ beat: Beat; beatFrame: number; compact?: boolean }> = ({ beat, beatFrame, compact = false }) => {
  const enter = interpolate(beatFrame, [0, 6], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bare = !beat.items && !beat.number;
  const top = compact ? (bare ? 520 : 260) : bare ? 860 : 560;
  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.bg, opacity: enter, transform: `scale(${0.94 + 0.06 * enter})` }}>
      {beat.title && <Headline text={beat.title} frame={beatFrame} y={top} size={compact ? 84 : 92} />}

      {beat.number && <CountUp value={beat.number} label={beat.numberLabel} beatFrame={beatFrame} top={top + 120} />}

      {beat.items && (
        <div style={{ position: "absolute", left: 140, right: 140, top: top + 110, display: "flex", flexDirection: "column", gap: 20 }}>
          {beat.items.map((item, i) => {
            const p = interpolate(beatFrame - 6 - i * 6, [0, 6], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  opacity: p,
                  transform: `translateX(${(1 - p) * -16}px)`,
                  background: STYLE.surface,
                  border: `2px solid ${STYLE.border}`,
                  borderRadius: 20,
                  padding: "22px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  fontFamily: CAPTION_FONT,
                  fontWeight: 700,
                  fontSize: 44,
                  color: STYLE.text,
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: STYLE.accent,
                    color: STYLE.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {item}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const CountUp: React.FC<{ value: string; label?: string; beatFrame: number; top: number }> = ({ value, label, beatFrame, top }) => {
  const m = value.match(/^(\D*)(\d+)(.*)$/);
  const target = m ? Number(m[2]) : 0;
  const n = Math.round(interpolate(beatFrame, [4, 16], [0, target], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const shown = m ? `${m[1]}${n}${m[3]}` : value;
  const p = interpolate(beatFrame, [2, 8], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: p }}>
      <div
        style={{
          background: STYLE.surface,
          border: `2px solid ${STYLE.accent}`,
          borderRadius: 28,
          padding: "30px 80px",
          textAlign: "center",
          transform: `scale(${0.94 + 0.06 * p})`,
        }}
      >
        <div style={{ fontFamily: SHORTS_FONT, fontSize: 200, lineHeight: 1, color: STYLE.accent }}>{shown}</div>
        {label && (
          <div style={{ fontFamily: CAPTION_FONT, fontWeight: 700, fontSize: 36, color: STYLE.muted, marginTop: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
