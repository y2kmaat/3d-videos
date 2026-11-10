import { useCallback, useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Caption } from "@remotion/captions";

/** Loads a Caption[] JSON file from public/ and holds rendering until it's ready. */
export const useCaptions = (file: string): Caption[] | null => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [handle] = useState(() => delayRender(`Loading captions ${file}`));

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

  return captions;
};

/**
 * Deterministic lip-sync from caption timing: 0 = closed, 1 = wide open.
 * Each word gets a couple of open/close "syllables" across its duration.
 */
export const mouthOpenAt = (captions: Caption[] | null, ms: number): number => {
  if (!captions) return 0;
  const word = captions.find((c) => c.startMs <= ms && c.endMs > ms);
  if (!word) return 0;
  const len = Math.max(1, word.endMs - word.startMs);
  const syllables = Math.max(1, Math.round(word.text.trim().length / 3));
  const p = (ms - word.startMs) / len;
  return Math.abs(Math.sin(p * Math.PI * syllables)) * 0.85 + 0.1;
};

export const isTalkingAt = (captions: Caption[] | null, ms: number): boolean =>
  !!captions?.some((c) => c.startMs <= ms && c.endMs + 150 > ms);
