# 3d-videos

Three.js + Remotion setup for rendering 3D animated videos with word-highlighted captions and an audio track.

## Stack

- [Remotion](https://remotion.dev) 4: React-based video rendering
- [`@remotion/three`](https://www.remotion.dev/docs/three) + [React Three Fiber](https://r3f.docs.pmnd.rs) + Three.js: 3D scenes
- [`@remotion/captions`](https://www.remotion.dev/docs/captions): TikTok-style caption paging
- [`@remotion/fonts`](https://www.remotion.dev/docs/fonts-api) for the bundled Anton font
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

## Official host character

`src/character/HostCharacter.tsx` is the channel's official on-screen character: a stylized 3D version of the channel owner (black durag, shoulder-length locs, goatee, dusty-rose tee). **Every video that uses a graphic character should render `<HostCharacter />`**, so the look stays consistent and any update applies everywhere.

- **Look:** colours and loc count live in `src/character/config.ts` (skin, lips and shirt were sampled from the reference photo).
- **Talking:** pass `mouthOpen` (0 to 1) and `talking`. `mouthOpenAt(captions, ms)` and `isTalkingAt(captions, ms)` in `src/lib/useCaptions.ts` lip-sync it to your caption timings.
- **Gestures:** `gesture="idle" | "wave" | "point" | "explain"`, plus `gestureStart` (frame) to ease in.
- **Other props:** `lookX`, `position`, `rotationY`, `scale`. It blinks, breathes, sways and nods on its own.

```tsx
<ThreeCanvas width={width} height={height}>
  <ambientLight intensity={0.6} />
  <directionalLight position={[3, 5, 6]} intensity={2.2} />
  <HostCharacter mouthOpen={mouthOpenAt(captions, ms)} talking gesture="explain" />
</ThreeCanvas>
```

### Realistic (Pixar-style) host

For a film-quality look, generate a portrait of yourself with an AI image model and use
`CharacterShort` with `host: "portrait"` (still) or `host: "video"` (lip-synced clip).
See **[docs/realistic-host.md](docs/realistic-host.md)** for the prompt and steps.

### Compositions

| ID | Size | What it is |
| --- | --- | --- |
| `CharacterShort` | 1080×1920 | Shorts/Reels/TikTok template: headline, host on a stage, big yellow captions, footer. Change text, captions, voice/music and the gesture timeline from Studio's props panel. |
| `CharacterTurnaround` | 1080×1080 | 360° model sheet of the host, for reviewing design changes. |
| `HelloThree` | 1920×1080 | Original 3D scene demo. |

```bash
npm run render:short        # out/character-short.mp4
npm run render:turnaround   # out/character-turnaround.mp4
```

To make a new Short: put your voiceover in `public/`, make its captions JSON, then set `voiceFile`, `captionsFile`, `headline`, `footer` and `gestures`.

## Layout

```
src/
  Root.tsx              # Composition registry (1920x1080, 30fps, 10s)
  HelloThree.tsx        # Composition: 3D canvas + title + captions + audio
  scenes/Scene.tsx      # The Three.js scene (all motion driven by useCurrentFrame)
  components/Captions.tsx  # Loads public/captions.json, highlights the active word
  components/Title.tsx
  character/HostCharacter.tsx   # Official host character (3D)
  character/config.ts           # Its colours/proportions
  CharacterShort.tsx            # Vertical talking-host template
  CharacterTurnaround.tsx       # 360° model sheet
  lib/                          # captions + lip-sync, fonts, camera rig
public/
  fonts/Anton-Regular.woff2   # Bundled display font (SIL OFL, see fonts/OFL.txt)
  short-captions.json
  music.mp3             # Placeholder music bed (run `npm run audio` to regenerate)
  captions.json         # Caption[] in @remotion/captions format
scripts/generate-audio.sh
```

## Making your own videos

- **3D:** edit `src/scenes/Scene.tsx`. Animate from `useCurrentFrame()`, `interpolate()` and `spring()` only. Never use `useFrame()`, clocks, or `Math.random()` without a seed, or frames won't be deterministic when rendered in parallel.
- **Audio:** drop a file in `public/` and set the `audioFile` prop (Studio sidebar or `defaultProps` in `Root.tsx`).
- **Captions:** `public/captions.json` is an array of `{ text, startMs, endMs, timestampMs, confidence }`. Words after the first start with a space. You can generate this from a voiceover with `@remotion/install-whisper-cpp` (`transcribe()` + `toCaptions()`), or from an `.srt` with `parseSrt()` from `@remotion/captions`.
- **New compositions:** add another `<Composition>` in `Root.tsx`, then `npx remotion render <id> out/<name>.mp4`.
