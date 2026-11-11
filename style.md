# Style guide — v1

Format: **a mix of talking to camera and voiceover over screen recordings / graphics.**
Vertical short-form (TikTok / Reels / Shorts).

This style is my own, informed by what I measured in the reference reels (numbers at the bottom).
It reuses no shots, text, logos, colors or brand elements from them.

---

## 1. Output

| Setting | Value |
|---|---|
| Canvas | 1080 × 1920, 9:16 |
| Frame rate | 30 fps (constant) |
| Video | H.264 High, CRF 18, yuv420p, `-movflags +faststart` |
| Audio | AAC 48 kHz stereo, 192 kb/s |
| Loudness | −14 LUFS integrated, true peak ≤ −1.0 dBTP |
| Length | 25–55 s (sweet spot 35 s) |
| Safe area | Keep text inside x 90–990, y 220–1600 (clear of the platform UI) |

## 2. The first 3 seconds

| Rule | Value |
|---|---|
| First spoken word | at frame 0 (≤ 0.10 s). No intro, no logo, no breath. |
| Hook line | ≤ 10 words, states the payoff ("You can now…", "How to go from this → to this") |
| Hook title on screen | 0.00–3.00 s, top third (center y = 420 px), ≤ 6 words, headline style (§5) |
| First visual change | between 1.0 and 1.5 s (cut, punch-in or graphic entering) |
| Second visual change | before 3.0 s |
| Show the result first | if there is a before/after, show the *after* inside the first 3 s |

## 3. Pacing and cuts

| Rule | Value |
|---|---|
| Speech rate after cutting | 230–260 words/min |
| Pause cuts | remove every silence > 0.18 s (threshold −35 dBFS) |
| Handles | keep 0.07 s (2 frames) before and after each word |
| Longest gap allowed between words | 0.25 s |
| Breaths, "um", "uh", false starts, retakes | always cut |
| Visual change rhythm | something changes every 1.5–3.0 s |
| Longest uninterrupted shot | 4.0 s (screen recordings: 5.0 s, but add a push-in or highlight) |
| Ending | hard cut ≤ 0.20 s after the last word. No outro, no "follow for more" card. |

## 4. Layouts (rotate between them)

| ID | Layout | When |
|---|---|---|
| **A — Face** | Full-frame talking head, eyes at y ≈ 640 px | Hook, opinions, transitions between points |
| **B — Split** | Graphic/screen on top (y 0–1040), face card below (x 140–940, y 1100–1920, radius 32 px, 2 px border `#2A2C33`) | Explaining a tool/step while staying present |
| **C — Screen** | Full-frame screen recording or B-roll, voiceover only | Demos, step-by-step |
| **D — Card** | Full-frame graphic on `#0B0B0F` | Key numbers, lists, "free / price / result" moments |

- Layout A on consecutive cuts alternates scale **100% ↔ 112%** (punch-in) so jump cuts read as intentional.
- Screen recordings (C) get a slow push of **100% → 106%** over the shot (ease-in-out), plus a **cursor / tap highlight**: 48 px ring, accent color, 60% opacity.
- Target time split: A 35%, B 25%, C 25%, D 15%.

## 5. Text

### Captions (spoken words)

| Property | Value |
|---|---|
| Grouping | 1–2 words per caption, ≤ 14 characters, break on natural phrases |
| Timing | word-level from faster-whisper; caption appears on the word's start frame, holds until the next caption |
| Font | Inter, weight 700 |
| Size | 66 px (at 1080 wide) |
| Case | as spoken, lowercase except proper nouns; no punctuation |
| Color | `#FFFFFF` |
| Keyword | 1 keyword per sentence in accent `#FFB020` |
| Background | rounded box `#111318` at 82% opacity, padding 14 px × 24 px, radius 14 px |
| Position | centered, box center at y = 1340 px (70%). In layout B: y = 1050 px (on the seam between graphic and face) |
| Entry | scale 0.90 → 1.00 + opacity 0 → 1 over 3 frames, ease-out cubic. No exit animation. |

### Headlines (on-screen titles)

| Property | Value |
|---|---|
| Font | Anton (already in `public/fonts`), uppercase |
| Size | 92 px, letter-spacing −0.5% , line-height 1.0 |
| Color | `#FFFFFF`, with **one** word in accent `#FFB020` |
| Position | top third, center y = 420 px; max 2 lines |
| Entry | slide up 24 px + fade, 6 frames, ease-out cubic |

## 6. Color

### Palette

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0B0B0F` | Graphic backgrounds (layout D) |
| `surface` | `#17181D` | Cards, panels, chat bubbles |
| `border` | `#2A2C33` | 2 px borders on cards and face card |
| `text` | `#FFFFFF` | All primary text |
| `muted` | `#A1A1AA` | Labels, small print |
| `accent` | `#FFB020` | Keyword highlight, headline accent, numbers, cursor ring |
| `negative` | `#FF4D5E` | "Blocked", "before", errors |
| `positive` | `#3DD9C1` | Checkmarks, "after", success states |

### Grade (talking head + screen footage)

| Setting | Value |
|---|---|
| Mood | dark, low-key room with one colored practical light behind me |
| Average luma | 70–90 / 255 for face shots (keep the face at ~150–170) |
| Contrast | +8% |
| Saturation | +5% overall, skin tones protected |
| Shadows | slightly cool (lift blue ~+3) |
| Highlights | neutral-warm |
| Screen recordings | no grade, but exposure set so the screen doesn't clip (white UI ≤ 235) |

## 7. Graphics

- Built in HyperFrames or Remotion, on `bg` with `surface` cards, radius 20 px, 2 px `border`.
- Icons: 72 px tiles, radius 18 px, on `surface`.
- **Lists build item by item**, synced to the word that names the item; stagger 3 frames, each item slides in from 16 px left.
- **Numbers count up** (e.g. 0 → 20) over 12 frames, ease-out, in `accent`.
- "Before → after" uses `negative` for before and `positive` for after.
- At most one graphic idea per 3 s; nothing smaller than 28 px.

## 8. Transitions

| Type | Use | Spec |
|---|---|---|
| Hard cut | ~90% of all cuts | — |
| Punch-in cut | consecutive face shots | 100% ↔ 112% |
| Accent flash | max 1 per 10 s, on a punch word | full-frame `#FFB020` tint at 30% opacity, 4 frames, fade out |
| Whip blur | max 1 per video, A → C or C → A | 6 frames, directional blur 40 px, with a whoosh SFX |
| Graphic entry | layout D and B | scale 0.94 → 1.00 + fade, 6 frames, ease-out cubic |

## 9. Sound

| Element | Value |
|---|---|
| Voice | −14 LUFS integrated after processing: high-pass 80 Hz, light compression (3:1), de-ess around 6–8 kHz |
| Music | constant bed, electronic / lo-fi, 100–120 BPM, no vocals |
| Music level | 18 dB under the voice (≈ −32 LUFS), sidechain ducked |
| Music start | at frame 0 with the voice; ends with a hard cut on the last word |
| SFX — graphic entry | soft whoosh, −24 dBFS peak |
| SFX — list item / number | click or pop, −28 dBFS peak |
| SFX — whip / flash | whoosh, −20 dBFS peak |
| Silence | never; the music bed fills every pause cut |

## 10. Checklist before export

- [ ] First word at ≤ 0.10 s, visual change by 1.5 s
- [ ] No gap between words > 0.25 s
- [ ] No shot > 4.0 s without movement
- [ ] Captions inside the safe area, one keyword highlighted per sentence
- [ ] −14 LUFS, ≤ −1 dBTP
- [ ] Ends within 0.20 s of the last word

---

## Appendix — what I measured in the references

Files in `references/` (study only, not committed). The second link could not be downloaded: TikTok reports it as unavailable (deleted or private).

| | Reel 1 (screen demo, voiceover) | Reel 3 (talking head + graphics) |
|---|---|---|
| Resolution / fps | 720×1280, 30 | 1080×1920, 29.97 |
| Length | 26.1 s | 53.0 s |
| First word | 0.00 s | 0.00 s |
| Speech rate | 244 wpm | 259 wpm |
| Longest gap between words | 0.42 s | 0.40 s |
| Hard cuts (scene detection) | 6 shots, median 3.4 s, max 9.3 s | 15 shots, median 3.6 s, max 6.3 s (graphics animate every 1–2 s in between) |
| Loudness | −11.0 LUFS | −15.5 LUFS |
| Voice vs pauses | pauses only 3 dB quieter than speech, so a music bed is under the voice | same (4 dB) |
| Average luma / sat | 108 / 8.6 | 54 / 9.3 (dark, moody) |
| Captions | one static hook title in the first 3 s, no word captions | 1 word at a time, white on dark rounded box at ~73% height |
| Graphics | none | dark cards, list builds, number count-up, split layout with face card |
| Transitions | hard cuts | hard cuts, color flash, one whip blur |
