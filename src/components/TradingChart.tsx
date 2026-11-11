import { useMemo } from "react";
import { Easing, interpolate } from "remotion";
import { z } from "zod";
import { CAPTION_FONT } from "../lib/fonts";
import { STYLE } from "../lib/style";

/**
 * Animated, procedurally generated candlestick chart. Each pattern is shaped to illustrate
 * one trading idea; the data is seeded, so every render is identical.
 */
export const chartPatterns = [
  "uptrend",
  "downtrend",
  "range",
  "breakout",
  "pullback",
  "scalp",
  "ma-cross",
  "rsi",
  "news",
  "long-term",
] as const;

export const chartSchema = z.object({
  pattern: z.enum(chartPatterns),
  /** Small label in the panel's top-left, e.g. "BTC · 1m" */
  label: z.string().optional(),
  /** Show volume bars under the candles */
  volume: z.boolean().optional(),
  /** Draw the stop-loss line for patterns that have one */
  stop: z.boolean().optional(),
  seed: z.number().optional(),
});
export type ChartSpec = z.infer<typeof chartSchema>;

type Candle = { o: number; h: number; l: number; c: number; v: number };

const N = 44;

/** Deterministic PRNG (mulberry32). */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Build candles that follow a target close path with noise. */
const fromPath = (path: (i: number) => number, noise: number, seed: number, volFn?: (i: number) => number): Candle[] => {
  const r = rng(seed);
  const out: Candle[] = [];
  let prev = path(0);
  for (let i = 0; i < N; i++) {
    const target = path(i) + (r() - 0.5) * noise * 2;
    const o = prev;
    const c = target;
    const wick = noise * (0.3 + r() * 0.9);
    out.push({
      o,
      c,
      h: Math.max(o, c) + wick * r(),
      l: Math.min(o, c) - wick * r(),
      v: (volFn ? volFn(i) : 1) * (0.5 + r() * 0.6),
    });
    prev = c;
  }
  return out;
};

const generate = (p: ChartSpec["pattern"], seed: number): Candle[] => {
  switch (p) {
    case "uptrend":
      return fromPath((i) => 100 + i * 1.1 + Math.sin(i / 2.6) * 3.2, 1.6, seed);
    case "downtrend":
      return fromPath((i) => 150 - i * 1.1 + Math.sin(i / 2.6) * 3.2, 1.6, seed);
    case "long-term":
      return fromPath((i) => 100 + i * 1.3 + Math.sin(i / 5) * 6 + Math.sin(i * 1.7) * 1.5, 2.2, seed);
    case "range":
      return fromPath((i) => 120 + Math.sin(i / 2.2) * 9, 1.4, seed);
    case "breakout":
      return fromPath(
        (i) => (i < 30 ? 118 + Math.sin(i / 2.0) * 6 : 124 + (i - 30) * 2.4),
        1.3,
        seed,
        (i) => (i >= 30 && i <= 33 ? 3.2 : 1),
      );
    case "pullback":
      return fromPath((i) => (i < 22 ? 100 + i * 1.5 : i < 30 ? 133 - (i - 22) * 1.6 : 120 + (i - 30) * 1.9), 1.3, seed);
    case "scalp":
      return fromPath((i) => 100 + Math.sin(i / 1.6) * 1.6 + Math.sin(i / 5) * 2.2, 0.7, seed);
    case "ma-cross":
      return fromPath((i) => (i < 18 ? 130 - i * 1.2 : 108 + (i - 18) * 1.4) + Math.sin(i / 2) * 2, 1.4, seed);
    case "rsi":
      return fromPath((i) => (i < 28 ? 100 + i * 1.6 : 145 - (i - 28) * 1.5) + Math.sin(i / 1.8) * 1.5, 1.2, seed);
    case "news":
      return fromPath(
        (i) => (i < 20 ? 120 + Math.sin(i / 2) * 1.5 : i === 20 ? 136 : i === 21 ? 112 : i === 22 ? 130 : 126 + (i - 22) * 0.9),
        1.0,
        seed,
        (i) => (i >= 20 && i <= 23 ? 4 : 1),
      );
  }
};

const sma = (cs: Candle[], n: number) =>
  cs.map((_, i) => (i + 1 < n ? null : cs.slice(i + 1 - n, i + 1).reduce((s, c) => s + c.c, 0) / n));

const rsiSeries = (cs: Candle[], n = 7) =>
  cs.map((_, i) => {
    if (i < n) return null;
    let up = 0;
    let dn = 0;
    for (let k = i - n + 1; k <= i; k++) {
      const d = cs[k].c - cs[k - 1].c;
      if (d > 0) up += d;
      else dn -= d;
    }
    return dn === 0 ? 100 : 100 - 100 / (1 + up / dn);
  });

const ease = Easing.out(Easing.cubic);
const clampOpt = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const TradingChart: React.FC<{
  spec: ChartSpec;
  /** Frames since this chart appeared */
  frame: number;
  width: number;
  height: number;
}> = ({ spec, frame, width, height }) => {
  const { pattern } = spec;
  const candles = useMemo(() => generate(pattern, spec.seed ?? 7), [pattern, spec.seed]);
  const hasRsi = pattern === "rsi";
  const hasVol = spec.volume || pattern === "breakout" || pattern === "news";

  // Layout inside the panel
  const pad = { l: 28, r: 92, t: 70, b: 28 };
  const rsiH = hasRsi ? height * 0.24 : 0;
  const volH = hasVol ? height * 0.13 : 0;
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b - rsiH - volH - (hasRsi ? 16 : 0);
  const step = plotW / N;
  const bodyW = step * 0.62;

  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const range = hi - lo || 1;
  const y = (v: number) => pad.t + (1 - (v - lo) / range) * plotH;
  const x = (i: number) => pad.l + i * step + step / 2;

  // Candles draw in over ~1.1 s; then the last candle "breathes" like a live price.
  const shown = interpolate(frame, [0, 33], [6, N], { ...clampOpt, easing: ease });
  const overlayIn = interpolate(frame, [26, 38], [0, 1], { ...clampOpt, easing: ease });
  const live = Math.sin(frame / 4) * range * 0.006;

  const visible = candles.slice(0, Math.ceil(shown)).map((c, i, arr) =>
    i === arr.length - 1 && shown >= N ? { ...c, c: c.c + live, h: Math.max(c.h, c.c + live), l: Math.min(c.l, c.c + live) } : c,
  );
  const last = visible[visible.length - 1];

  const linePath = (vals: (number | null)[]) =>
    vals
      .slice(0, visible.length)
      .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");

  const overlays: React.ReactNode[] = [];
  const hLine = (v: number, color: string, label: string, dashed = true) => (
    <g key={label} opacity={overlayIn}>
      <line x1={pad.l} x2={pad.l + plotW} y1={y(v)} y2={y(v)} stroke={color} strokeWidth={4} strokeDasharray={dashed ? "14 10" : undefined} />
      <rect x={pad.l + plotW - (label.length * 17 + 28) - 8} y={y(v) - 44} rx={10} width={label.length * 17 + 28} height={36} fill={color} />
      <text x={pad.l + plotW - (label.length * 17 + 28) + 6} y={y(v) - 19} fill={STYLE.bg} fontSize={24} fontWeight={700} fontFamily={CAPTION_FONT}>
        {label}
      </text>
    </g>
  );

  if (pattern === "range") {
    overlays.push(hLine(129, STYLE.negative, "RESISTANCE"), hLine(111, STYLE.positive, "SUPPORT"));
  }
  if (pattern === "breakout") {
    overlays.push(hLine(124.5, STYLE.accent, "BREAKOUT LEVEL"));
  }
  if (pattern === "pullback" && spec.stop !== false) {
    const swingLow = Math.min(...candles.slice(24, 32).map((c) => c.l));
    overlays.push(hLine(swingLow - 1.5, STYLE.negative, "STOP LOSS"));
  }
  if ((pattern === "uptrend" || pattern === "long-term") && spec.stop) {
    overlays.push(hLine(lo + range * 0.12, STYLE.negative, "STOP LOSS"));
  }
  if (pattern === "ma-cross" || pattern === "uptrend" || pattern === "long-term") {
    const fast = sma(candles, pattern === "ma-cross" ? 5 : 8);
    const slow = sma(candles, pattern === "ma-cross" ? 12 : 20);
    overlays.push(
      <g key="ma" opacity={overlayIn}>
        <polyline points={linePath(slow)} fill="none" stroke="#7aa2ff" strokeWidth={5} strokeLinejoin="round" />
        {pattern === "ma-cross" && <polyline points={linePath(fast)} fill="none" stroke={STYLE.accent} strokeWidth={5} strokeLinejoin="round" />}
      </g>,
    );
    if (pattern === "ma-cross") {
      // Mark the bullish cross.
      const ci = fast.findIndex((f, i) => i > 14 && f != null && slow[i] != null && f > slow[i]! && fast[i - 1]! <= slow[i - 1]!);
      if (ci > 0 && ci < visible.length) {
        const pulse = 1 + Math.sin(frame / 5) * 0.15;
        overlays.push(
          <g key="cross" opacity={overlayIn}>
            <circle cx={x(ci)} cy={y(fast[ci]!)} r={22 * pulse} fill="none" stroke={STYLE.accent} strokeWidth={5} />
            <rect x={x(ci) - 70} y={y(fast[ci]!) - 82} rx={10} width={140} height={40} fill={STYLE.accent} />
            <text x={x(ci)} y={y(fast[ci]!) - 54} fill={STYLE.bg} fontSize={26} fontWeight={700} fontFamily={CAPTION_FONT} textAnchor="middle">
              CROSS ↑
            </text>
          </g>,
        );
      }
    }
  }
  if (pattern === "news") {
    overlays.push(
      <g key="news" opacity={overlayIn}>
        <line x1={x(20) - step / 2} x2={x(20) - step / 2} y1={pad.t - 10} y2={pad.t + plotH} stroke={STYLE.accent} strokeWidth={4} strokeDasharray="10 8" />
        <rect x={x(20) - 62} y={pad.t - 54} rx={10} width={124} height={38} fill={STYLE.accent} />
        <text x={x(20)} y={pad.t - 26} fill={STYLE.bg} fontSize={24} fontWeight={700} fontFamily={CAPTION_FONT} textAnchor="middle">
          NEWS
        </text>
      </g>,
    );
  }

  const rsi = hasRsi ? rsiSeries(candles) : [];
  const rsiTop = pad.t + plotH + volH + 16;
  const ry = (v: number) => rsiTop + (1 - v / 100) * rsiH;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={pad.l} x2={pad.l + plotW} y1={pad.t + g * plotH} y2={pad.t + g * plotH} stroke={STYLE.border} strokeWidth={1.5} />
      ))}
      {/* price axis */}
      {[0, 0.5, 1].map((g) => (
        <text key={g} x={pad.l + plotW + 14} y={pad.t + g * plotH + 8} fill={STYLE.muted} fontSize={22} fontFamily={CAPTION_FONT}>
          {(hi - g * range).toFixed(1)}
        </text>
      ))}

      {/* candles */}
      {visible.map((c, i) => {
        const up = c.c >= c.o;
        const col = up ? STYLE.positive : STYLE.negative;
        const top = y(Math.max(c.o, c.c));
        const h = Math.max(3, Math.abs(y(c.o) - y(c.c)));
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={3} />
            <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={h} rx={2} fill={col} />
          </g>
        );
      })}

      {/* volume */}
      {hasVol &&
        visible.map((c, i) => {
          const vMax = Math.max(...candles.map((k) => k.v));
          const h = (c.v / vMax) * (volH - 8);
          return (
            <rect
              key={`v${i}`}
              x={x(i) - bodyW / 2}
              y={pad.t + plotH + volH - h}
              width={bodyW}
              height={h}
              fill={c.v > vMax * 0.6 ? STYLE.accent : "#3a3d48"}
              rx={2}
            />
          );
        })}

      {overlays}

      {/* live price tag */}
      {last && (
        <g>
          <line x1={pad.l} x2={pad.l + plotW} y1={y(last.c)} y2={y(last.c)} stroke={STYLE.muted} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.6} />
          <rect x={pad.l + plotW + 6} y={y(last.c) - 18} width={pad.r - 10} height={36} rx={8} fill={last.c >= last.o ? STYLE.positive : STYLE.negative} />
          <text x={pad.l + plotW + 6 + (pad.r - 10) / 2} y={y(last.c) + 8} fill={STYLE.bg} fontSize={22} fontWeight={700} fontFamily={CAPTION_FONT} textAnchor="middle">
            {last.c.toFixed(1)}
          </text>
        </g>
      )}

      {/* RSI sub-panel */}
      {hasRsi && (
        <g>
          <rect x={pad.l} y={rsiTop} width={plotW} height={rsiH} fill="#121318" stroke={STYLE.border} strokeWidth={1.5} rx={6} />
          <rect x={pad.l} y={ry(100)} width={plotW} height={ry(70) - ry(100)} fill={STYLE.negative} opacity={0.12} />
          <rect x={pad.l} y={ry(30)} width={plotW} height={ry(0) - ry(30)} fill={STYLE.positive} opacity={0.12} />
          {[70, 30].map((lv) => (
            <g key={lv}>
              <line x1={pad.l} x2={pad.l + plotW} y1={ry(lv)} y2={ry(lv)} stroke={lv === 70 ? STYLE.negative : STYLE.positive} strokeWidth={2.5} strokeDasharray="10 8" />
              <text x={pad.l + plotW + 14} y={ry(lv) + 8} fill={lv === 70 ? STYLE.negative : STYLE.positive} fontSize={22} fontWeight={700} fontFamily={CAPTION_FONT}>
                {lv}
              </text>
            </g>
          ))}
          <polyline
            points={rsi
              .slice(0, visible.length)
              .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${ry(v).toFixed(1)}`))
              .filter(Boolean)
              .join(" ")}
            fill="none"
            stroke="#c9a2ff"
            strokeWidth={4}
          />
          <text x={pad.l + 12} y={rsiTop + 30} fill={STYLE.muted} fontSize={22} fontWeight={700} fontFamily={CAPTION_FONT}>
            RSI
          </text>
        </g>
      )}

      {/* label */}
      <text x={pad.l} y={42} fill={STYLE.muted} fontSize={26} fontWeight={700} fontFamily={CAPTION_FONT}>
        {spec.label ?? defaultLabel[pattern]}
      </text>
      {/* live dot */}
      <circle cx={width - 30} cy={33} r={8} fill={STYLE.negative} opacity={0.6 + 0.4 * Math.abs(Math.sin(frame / 8))} />
      <text x={width - 46} y={42} fill={STYLE.muted} fontSize={22} fontWeight={700} fontFamily={CAPTION_FONT} textAnchor="end">
        LIVE
      </text>
    </svg>
  );
};

const defaultLabel: Record<ChartSpec["pattern"], string> = {
  uptrend: "PRICE · 4H",
  downtrend: "PRICE · 4H",
  "long-term": "PRICE · WEEKLY",
  range: "PRICE · 1H",
  breakout: "PRICE · 1H",
  pullback: "PRICE · DAILY",
  scalp: "PRICE · 1M",
  "ma-cross": "PRICE · DAILY · MA FAST / SLOW",
  rsi: "PRICE · 4H · RSI",
  news: "PRICE · 5M",
};
