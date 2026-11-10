# Realistic "Pixar-style" host

The built-in `HostCharacter` is made of simple 3D shapes, so it can only ever look like a toy figure.
For the polished, film-style look, generate the character with an AI image model, then let this
project handle captions, music, titles and rendering.

## 1. Generate your character image

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

## 2. (Optional) Make it talk

Upload the portrait and your voiceover to an image-to-talking-video (lip-sync) app. The video you
found uses CapCut; many similar tools exist. Export as MP4 and save it as
`public/host/host-talking.mp4`.

## 3. Render

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
