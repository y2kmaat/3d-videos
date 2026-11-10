import { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SHORTS_FONT } from "../lib/fonts";
import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";

export type CaptionStyle = "box" | "bold";

type Props = {
  captions: Caption[] | null;
  accent: string;
  /** "box": white text on a dark pill. "bold": big yellow italic, Shorts style. */
  variant?: CaptionStyle;
  /** Distance from the bottom of the frame */
  bottom?: number;
  combineTokensWithinMs?: number;
};

export const Captions: React.FC<Props> = ({
  captions,
  accent,
  variant = "box",
  bottom = 110,
  combineTokensWithinMs = 1200,
}) => {
  const { fps } = useVideoConfig();

  const pages = useMemo(() => {
    if (!captions) return [];
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: combineTokensWithinMs,
    }).pages;
  }, [captions, combineTokensWithinMs]);

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.floor((page.startMs / 1000) * fps);
        const tail = page.startMs + page.durationMs + 600;
        const endMs = next ? Math.min(next.startMs, tail) : tail;
        const duration = Math.max(1, Math.ceil(((endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="none">
            <CaptionPage page={page} accent={accent} variant={variant} bottom={bottom} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{
  page: TikTokPage;
  accent: string;
  variant: CaptionStyle;
  bottom: number;
}> = ({ page, accent, variant, bottom }) => {
  const frame = useCurrentFrame(); // relative to the Sequence start
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const pop = Math.min(1, frame / 4);

  const bold = variant === "bold";

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom, paddingInline: 60 }}
    >
      <div
        style={{
          fontFamily: bold ? SHORTS_FONT : "Inter, Helvetica, Arial, sans-serif",
          fontSize: bold ? 100 : 64,
          fontWeight: bold ? 400 : 800,
          fontStyle: bold ? "italic" : "normal",
          textTransform: bold ? "uppercase" : "none",
          lineHeight: 1.05,
          textAlign: "center",
          padding: bold ? 0 : "14px 32px",
          borderRadius: 18,
          background: bold ? "none" : "rgba(0,0,0,0.45)",
          textShadow: bold ? "0 6px 0 #000, 0 0 24px rgba(0,0,0,0.8)" : "0 4px 18px rgba(0,0,0,0.6)",
          WebkitTextStroke: bold ? "4px #000" : undefined,
          paintOrder: "stroke fill",
          transform: `scale(${0.85 + pop * 0.15})`,
        }}
      >
        {page.tokens.map((token) => {
          const active = token.fromMs <= nowMs && token.toMs > nowMs;
          const color = bold ? (active ? "#ffffff" : "#ffe94a") : active ? accent : "white";
          return (
            <span key={token.fromMs} style={{ color, whiteSpace: "pre" }}>
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
