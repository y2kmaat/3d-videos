# 3d-videos

Three.js + Remotion setup for rendering 3D animated videos with word-highlighted captions and an audio track.

## Stack

- [Remotion](https://remotion.dev) 4: React-based video rendering
- [`@remotion/three`](https://www.remotion.dev/docs/three) + [React Three Fiber](https://r3f.docs.pmnd.rs) + Three.js: 3D scenes
- [`@remotion/captions`](https://www.remotion.dev/docs/captions): TikTok-style caption paging
- `@react-three/drei` is installed for helpers (Text3D, Environment, etc.)

## Quick start

```bash
npm install
npm run dev          # opens Remotion Studio to preview and edit
npm run render       # renders out/hello-three.mp4 (GPU / ANGLE)
npm run render:cpu   # same, with software WebGL (no GPU, e.g. servers/CI)
npm run still        # renders one frame to out/hello-three.png
```

If Remotion can't download its headless Chrome (for example, on a locked-down network), point it at an existing one:

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell npm run render:cpu
```

## Layout

```
src/
  Root.tsx              # Composition registry (1920x1080, 30fps, 10s)
  HelloThree.tsx        # Composition: 3D canvas + title + captions + audio
  scenes/Scene.tsx      # The Three.js scene (all motion driven by useCurrentFrame)
  components/Captions.tsx  # Loads public/captions.json, highlights the active word
  components/Title.tsx
public/
  music.mp3             # Placeholder music bed (run `npm run audio` to regenerate)
  captions.json         # Caption[] in @remotion/captions format
scripts/generate-audio.sh
```

## Making your own videos

- **3D:** edit `src/scenes/Scene.tsx`. Animate from `useCurrentFrame()`, `interpolate()` and `spring()` only. Never use `useFrame()`, clocks, or `Math.random()` without a seed, or frames won't be deterministic when rendered in parallel.
- **Audio:** drop a file in `public/` and set the `audioFile` prop (Studio sidebar or `defaultProps` in `Root.tsx`).
- **Captions:** `public/captions.json` is an array of `{ text, startMs, endMs, timestampMs, confidence }`. Words after the first start with a space. You can generate this from a voiceover with `@remotion/install-whisper-cpp` (`transcribe()` + `toCaptions()`), or from an `.srt` with `parseSrt()` from `@remotion/captions`.
- **New compositions:** add another `<Composition>` in `Root.tsx`, then `npx remotion render <id> out/<name>.mp4`.
