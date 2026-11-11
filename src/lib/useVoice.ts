import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Caption } from "@remotion/captions";

export type Voice = { captions: Caption[]; mouth: number[]; mouthFps: number };

/** Loads public/voice/<name>.captions.json + .mouth.json (made by scripts/make-voice.py). */
export const useVoice = (name: string): Voice | null => {
  const [voice, setVoice] = useState<Voice | null>(null);
  const [handle] = useState(() => delayRender(`Loading voice ${name}`));
  useEffect(() => {
    Promise.all([
      fetch(staticFile(`voice/${name}.captions.json`)).then((r) => r.json()),
      fetch(staticFile(`voice/${name}.mouth.json`)).then((r) => r.json()),
    ])
      .then(([captions, m]) => {
        setVoice({ captions, mouth: m.open, mouthFps: m.fps });
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [name, handle]);
  return voice;
};

/** Mouth opening 0..1 at a given time, from the audio envelope. */
export const mouthAt = (v: Voice | null, sec: number) =>
  v ? v.mouth[Math.min(v.mouth.length - 1, Math.max(0, Math.floor(sec * v.mouthFps)))] ?? 0 : 0;

/** Rounded-lips hint ("oo", "oh", "w") from the word being spoken. */
export const mouthRoundAt = (v: Voice | null, ms: number) => {
  const w = v?.captions.find((c) => c.startMs <= ms && c.endMs > ms)?.text.toLowerCase() ?? "";
  return /oo|ou|ow|^ ?w|o$|u/.test(w) ? 0.7 : 0;
};

export const talkingAt = (v: Voice | null, ms: number) =>
  !!v?.captions.some((c) => c.startMs - 100 <= ms && c.endMs + 200 > ms);
