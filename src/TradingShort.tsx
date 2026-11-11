import { z } from "zod";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { HostLights } from "./character/HostCharacter";
import { beatSchema, GLB_HEIGHT, Headline, HostCanvas, HostScene, WordCaptions } from "./FacelessShort";
import { chartSchema, TradingChart, type ChartSpec } from "./components/TradingChart";
import { CAPTION_FONT, SHORTS_FONT } from "./lib/fonts";
import { STYLE } from "./lib/style";
import { useVoice } from "./lib/useVoice";

/**
 * Trading Reel layout (v2):
 *   top     — title (y 150) + word captions (y 300): all text lives here
 *   middle  — animated trading chart panel that slides to a new chart on every beat
 *   bottom  — the host, always on screen
 */

const tradingBeatSchema = beatSchema.extend({ chart: chartSchema.optional() });

export const tradingShortSchema = z.object({
  voice: z.string(),
  hook: z.string(),
  beats: z.array(tradingBeatSchema),
  keywords: z.array(z.string()),
  musicFile: z.string(),
  musicVolume: z.number().min(0).max(1),
  /** Chart used when a beat has none */
  chart: chartSchema.optional(),
  host: z.enum(["3d", "glb"]).optional(),
  hostModel: z.string().optional(),
  hostAnimation: z.string().optional(),
});
export type TradingShortProps = z.infer<typeof tradingShortSchema>;
type Beat = z.infer<typeof tradingBeatSchema>;

export const calculateTradingMetadata: CalculateMetadataFunction<TradingShortProps> = async ({ props }) => {
  const m = await fetch(staticFile(`voice/${props.voice}.mouth.json`)).then((r) => r.json());
  return { durationInFrames: Math.ceil(m.open.length + 0.2 * m.fps) };
};

// Layout (px)
const TITLE_Y = 150;
const CAPTION_Y = 305;
const PANEL = { x: 40, y: 372, w: 1000, h: 610 };
const HOST_TOP = 940;
const SLIDE = 9; // frames for the chart transition

const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const lastIndex = <T,>(arr: T[], pred: (x: T) => boolean) => {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
};

export const TradingShort: React.FC<TradingShortProps> = ({
  voice: voiceName,
  hook,
  beats,
  keywords,
  musicFile,
  musicVolume,
  chart: defaultChart = { pattern: "uptrend" },
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
  const beatStart = Math.round(beat.at * fps);
  const beatFrame = frame - beatStart;
  const prev = idx > 0 ? sorted[idx - 1] : null;

  // Title: the hook for the first 3 s, then the latest beat title (it persists until a new one).
  const titleIdx = lastIndex(sorted.slice(0, idx + 1), (b) => !!b.title);
  const title = sec < 3 || titleIdx < 0 ? hook : sorted[titleIdx].title!;
  const titleStart = sec < 3 || titleIdx < 0 ? 0 : Math.round(sorted[titleIdx].at * fps);

  const chartOf = (b: Beat | null): ChartSpec => b?.chart ?? defaultChart;
  const chartKey = (c: ChartSpec) => `${c.pattern}|${c.label ?? ""}|${c.seed ?? ""}|${c.stop ?? ""}|${c.volume ?? ""}`;
  // Only slide when the chart actually changes; otherwise it keeps animating in place.
  const chartChanged = !prev || chartKey(chartOf(prev)) !== chartKey(chartOf(beat));
  const chartStartIdx = (() => {
    let i = idx;
    while (i > 0 && chartKey(chartOf(sorted[i - 1])) === chartKey(chartOf(sorted[idx]))) i--;
    return i;
  })();
  const chartFrame = frame - Math.round(sorted[chartStartIdx]?.at * fps || 0);
  const slide = chartChanged && prev ? interpolate(beatFrame, [0, SLIDE], [0, 1], { ...clamp, easing: ease }) : 1;

  const flash = beat.flash ? interpolate(beatFrame, [0, 4], [0.28, 0], clamp) : 0;
  // Subtle push-in on every other beat keeps the always-on host shot alive.
  const push = idx % 2 === 0 ? 1 : 1.06;
  const pushNow = interpolate(beatFrame, [0, 6], [idx % 2 === 0 ? 1.06 : 1, push], { ...clamp, easing: ease });

  const glb = hostType === "glb" ? { src: hostModel, animation: hostAnimation } : null;
  const cam = glb ? GLB_CAM : CHARACTER_CAM;

  return (
    <AbsoluteFill style={{ backgroundColor: STYLE.bg }}>
      {/* Host: always on screen */}
      <div style={{ position: "absolute", left: 0, top: HOST_TOP, width: 1080, height: 1920 - HOST_TOP, overflow: "hidden" }}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #262230 0%, #0B0B0F 70%)" }} />
        <div style={{ position: "absolute", inset: 0, transform: `scale(${pushNow})`, transformOrigin: "50% 30%" }}>
          <HostCanvas width={1080} height={1920 - HOST_TOP} camera={cam[0]} target={cam[1]}>
            <HostScene
              voice={voice}
              sec={sec}
              gesture={beat.gesture ?? "explain"}
              gestureStart={beatStart}
              glb={glb}
            />
          </HostCanvas>
        </div>
        {/* soft fade into the chart above */}
        <AbsoluteFill style={{ height: 120, background: `linear-gradient(${STYLE.bg}, transparent)` }} />
      </div>

      {/* Chart panel with slide transition */}
      <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, overflow: "hidden", borderRadius: 28 }}>
        {chartChanged && prev && slide < 1 && (
          <Panel spec={chartOf(prev)} frame={frame - Math.round(prev.at * fps) + 40} beat={prev} beatFrame={99} offset={-slide * PANEL.w} />
        )}
        <Panel spec={chartOf(beat)} frame={chartFrame} beat={beat} beatFrame={beatFrame} offset={(1 - slide) * PANEL.w} />
      </div>

      {/* All text at the top */}
      <Headline key={title} text={title} frame={frame - titleStart} y={TITLE_Y} size={84} />
      <WordCaptions voice={voice} keywords={keywords} y={CAPTION_Y} />

      {flash > 0 && <AbsoluteFill style={{ backgroundColor: STYLE.accent, opacity: flash }} />}

      <Audio src={staticFile(`voice/${voiceName}.mp3`)} />
      {musicFile ? <Audio src={staticFile(musicFile)} volume={musicVolume} loop /> : null}
    </AbsoluteFill>
  );
};

type Vec3 = [number, number, number];
// Built-in character: head to chest in the bottom band.
const CHARACTER_CAM: [Vec3, Vec3] = [[0, 2.15, 8.2], [0, 1.75, 0]];
// Realistic avatar (scaled to GLB_HEIGHT, feet on the floor): head and chest.
const GLB_CAM: [Vec3, Vec3] = [[0, GLB_HEIGHT * 0.83, 3.6], [0, GLB_HEIGHT * 0.8, 0]];

const Panel: React.FC<{ spec: ChartSpec; frame: number; beat: Beat; beatFrame: number; offset: number }> = ({
  spec,
  frame,
  beat,
  beatFrame,
  offset,
}) => {
  const itemsIn = (i: number) => interpolate(beatFrame - 4 - i * 5, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const m = beat.number?.match(/^(\D*)(\d+)(.*)$/);
  const n = m ? Math.round(interpolate(beatFrame, [4, 16], [0, Number(m[2])], { ...clamp, easing: Easing.out(Easing.cubic) })) : 0;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateX(${offset}px)`,
        background: STYLE.surface,
        border: `2px solid ${STYLE.border}`,
        borderRadius: 28,
      }}
    >
      <TradingChart spec={spec} frame={frame} width={PANEL.w - 4} height={PANEL.h - 4} />

      {/* Bullet chips (top-left, under the chart label) */}
      {beat.items && (
        <div style={{ position: "absolute", left: 26, top: 66, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          {beat.items.map((it, i) => (
            <div
              key={i}
              style={{
                opacity: itemsIn(i),
                transform: `translateX(${(1 - itemsIn(i)) * -16}px)`,
                background: "rgba(11, 11, 15, 0.86)",
                border: `2px solid ${STYLE.border}`,
                borderRadius: 16,
                padding: "10px 18px",
                display: "flex",
                gap: 14,
                alignItems: "center",
                fontFamily: CAPTION_FONT,
                fontWeight: 700,
                fontSize: 34,
                color: STYLE.text,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: STYLE.accent,
                  color: STYLE.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                {i + 1}
              </span>
              {it}
            </div>
          ))}
        </div>
      )}

      {/* Big number badge (top-right) */}
      {beat.number && (
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 70,
            opacity: itemsIn(0),
            transform: `scale(${0.9 + 0.1 * itemsIn(0)})`,
            background: "rgba(11, 11, 15, 0.9)",
            border: `3px solid ${STYLE.accent}`,
            borderRadius: 22,
            padding: "14px 34px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: SHORTS_FONT, fontSize: 120, lineHeight: 1, color: STYLE.accent }}>{m ? `${m[1]}${n}${m[3]}` : beat.number}</div>
          {beat.numberLabel && (
            <div style={{ fontFamily: CAPTION_FONT, fontWeight: 700, fontSize: 24, color: STYLE.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 6 }}>
              {beat.numberLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Keep HostLights referenced for tree-shaking clarity (HostCanvas includes it).
void HostLights;
