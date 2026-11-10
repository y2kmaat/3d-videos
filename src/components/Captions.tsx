import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";

// How long a caption "page" may span before breaking to a new one.
const COMBINE_TOKENS_WITHIN_MS = 1200;

export const Captions: React.FC<{ file: string; accent: string }> = ({ file, accent }) => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [handle] = useState(() => delayRender("Loading captions"));
  const { fps } = useVideoConfig();

  const load = useCallback(async () => {
    try {
      const res = await fetch(staticFile(file));
      setCaptions((await res.json()) as Caption[]);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [file, handle]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = useMemo(() => {
    if (!captions) return [];
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: COMBINE_TOKENS_WITHIN_MS,
    }).pages;
  }, [captions]);

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.floor((page.startMs / 1000) * fps);
        const endMs = next ? Math.min(next.startMs, page.startMs + page.durationMs + 600) : page.startMs + page.durationMs + 600;
        const duration = Math.max(1, Math.ceil(((endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="none">
            <CaptionPage page={page} accent={accent} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{ page: TikTokPage; accent: string }> = ({ page, accent }) => {
  const frame = useCurrentFrame(); // relative to the Sequence start
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}>
      <div
        style={{
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          fontSize: 64,
          fontWeight: 800,
          color: "white",
          textAlign: "center",
          whiteSpace: "pre",
          padding: "14px 32px",
          borderRadius: 18,
          background: "rgba(0,0,0,0.45)",
          textShadow: "0 4px 18px rgba(0,0,0,0.6)",
        }}
      >
        {page.tokens.map((token) => {
          const active = token.fromMs <= nowMs && token.toMs > nowMs;
          return (
            <span key={token.fromMs} style={{ color: active ? accent : "white" }}>
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
