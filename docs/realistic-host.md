# Realistic host

There are two ways to get a realistic host. Option A gives a true 3D animated version of you.

## Option A: realistic 3D avatar (`host: "glb"`)

> **Faceless trading series:** drop the file at `public/host/host-avatar.glb`, then rebuild and
> re-render. `scripts/build-episode.py` switches every episode to the avatar automatically
> (`"host": "glb"`), and `FacelessShort` frames it head-and-chest. Without a body animation the arms
> are lowered from the T-pose into a relaxed pose automatically; with a Mixamo clip, set
> `"hostAnimation"` in the episode JSON. Lip-sync, blinks and eye/brow motion run either way.
>
> Note (2026): Ready Player Me shut down in January 2026. Photo-based creators that still export
> GLB include Avaturn and Avatar SDK's MetaPerson; check that the export includes ARKit blendshapes.

The project animates any rigged `.glb` avatar in real 3D: lip-sync from your captions, blinking,
eye movement, smiles, head motion, camera framing, plus any body animation inside the file.

1. **Create the 3D model of yourself.** Use a selfie-to-3D-avatar tool that exports **GLB with
   ARKit (52) face blendshapes**, or visemes. Check each tool's current export options; Avaturn
   is one example. For film-level quality, a 3D artist can build one from your photos (ask for a
   GLB with ARKit blendshapes and a humanoid skeleton).
2. Optional: add body motion (idle, talking, waving) with an auto-rigging and animation service
   such as Mixamo, then export it as GLB. Note the clip name.
3. Save it as `public/host/host-avatar.glb`.
4. In Studio, open **CharacterShort** and set `host` to `glb`. Use `hostModelHeight` to resize,
   and `hostAnimation` for a clip name, if the file has one.

```bash
npx remotion render CharacterShort out/my-short.mp4 --gl=swangle --props='{"host":"glb"}'
```

Without a body animation, the face is driven by the captions (jaw, lips, blinks, brows, eyes)
and the head bone (or the whole model) nods and sways.

## Option B: Pixar-style AI image (`host: "portrait"` / `"video"`)

The built-in `HostCharacter` is made of simple 3D shapes, so it can only ever look like a toy figure.
For the polished, film-style look, generate the character with an AI image model, then let this
project handle captions, music, titles and rendering.

### 1. Generate your character image

In ChatGPT (or another image model), attach a clear, front-facing selfie and paste:

> Turn the person in this photo into a high-quality 3D animated movie character, in the style of a
> modern feature-film animation studio. Keep their exact likeness: face shape, skin tone, eye
> shape with relaxed heavy upper lids, broad nose, full lips, thin mustache that connects down
> into a long goatee/chin beard. They wear a black durag with a wrapped band across the forehead,
> with shoulder-length dark brown locs hanging out underneath, and a dusty-rose crewneck t-shirt.
> Head-and-shoulders portrait, looking straight at the camera, mouth gently closed, expressive
> eyes, soft cinematic lighting with warm rim light, softly blurred warm background.
> Vertical 9:16 image, high detail.

Tips:
- Generate a few and keep your favourite as the **official** look. Reuse that same image every
  time (don't regenerate per video), so the character stays consistent.
- For extra poses, attach the chosen image (not the selfie) and ask for the same character
  "waving", "pointing", "surprised" and so on.

Save it as `public/host/host-portrait.png`.

### 2. (Optional) Make it talk

Upload the portrait and your voiceover to an image-to-talking-video (lip-sync) app. The video you
found uses CapCut; many similar tools exist. Export as MP4 and save it as
`public/host/host-talking.mp4`.

### 3. Render

In Studio (`npm run dev`), open **CharacterShort** and set:

| Prop | Still portrait | Talking clip |
| --- | --- | --- |
| `host` | `portrait` | `video` |
| `voiceFile` | your voiceover (or empty) | empty (the clip has your voice) |
| `captionsFile` | captions for the voiceover | same |
| `hostFocusY` | move the crop up or down (0 to 100) | same |

Or from the command line:

```bash
npx remotion render CharacterShort out/my-short.mp4 --gl=swangle \
  --props='{"host":"portrait","headline":"Why you are not getting what you want"}'
```

Props you leave out keep their defaults.
