#!/usr/bin/env python3
"""
Episode file -> voice + FacelessShort props, with beats placed on spoken words.

    .venv/bin/python scripts/build-episode.py scripts/episodes/scalping.json [--voice <id>] [--skip-voice]

Episode JSON:
{
  "script": "Full voiceover text…",
  "hook": "Trading for *seconds*",
  "keywords": ["seconds", "small"],
  "beats": [
    {"cue": "",              "layout": "host", "gesture": "point"},       # cue "" = start of the video
    {"cue": "You trade on",  "layout": "card", "title": "Tiny *timeframes*", "items": ["…"]},
    …
  ]
}
Each beat starts when its cue words are spoken (searched in order through the captions).

Writes public/episodes/<name>.json, ready for:
    npx remotion render FacelessShort done/<name>.mp4 --props=public/episodes/<name>.json
"""
import argparse, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def find_cue(cue: str, words: list[str], starts: list[float], start_idx: int):
    toks = [norm(t) for t in cue.split() if norm(t)]
    for i in range(start_idx, len(words) - len(toks) + 1):
        if words[i : i + len(toks)] == toks:
            return i
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voice", help="ElevenLabs voice id (default: make-voice.py's)")
    ap.add_argument("--skip-voice", action="store_true", help="reuse public/voice/<name>.* if present")
    a = ap.parse_args()

    ep_path = Path(a.episode)
    ep = json.loads(ep_path.read_text())
    name = ep_path.stem
    voice_dir = ROOT / "public" / "voice"

    if not (a.skip_voice and (voice_dir / f"{name}.mp3").exists()):
        txt = ROOT / "scripts" / "episodes" / f"{name}.txt"
        txt.write_text(ep["script"].strip() + "\n")
        cmd = [sys.executable, "-I", str(ROOT / "scripts" / "make-voice.py"), str(txt)]
        if a.voice:
            cmd += ["--voice", a.voice]
        subprocess.run(cmd, check=True)

    caps = json.loads((voice_dir / f"{name}.captions.json").read_text())
    words = [norm(c["text"]) for c in caps]
    starts = [c["startMs"] / 1000 for c in caps]
    duration = caps[-1]["endMs"] / 1000
    script_toks = [norm(t) for t in ep["script"].split() if norm(t)]

    beats, idx = [], 0
    for b in ep["beats"]:
        b = dict(b)
        cue = b.pop("cue", "")
        if not cue:
            at = 0.0
        else:
            i = find_cue(cue, words, starts, idx)
            if i is None:
                # Fall back to the cue's position in the script, scaled to the voice length.
                j = find_cue(cue, script_toks, [], 0)
                if j is None:
                    sys.exit(f"cue not found in script: {cue!r}")
                at = round(j / len(script_toks) * duration, 2)
                print(f"   note: cue {cue!r} not in captions, estimated at {at}s")
            else:
                at, idx = starts[i], i + 1
        beats.append({"at": round(at, 2), **b})

    props = {
        "voice": name,
        "hook": ep["hook"],
        "beats": beats,
        "keywords": ep.get("keywords", []),
        "musicFile": ep.get("musicFile", "music.mp3"),
        "musicVolume": ep.get("musicVolume", 0.125),
    }
    # Realistic avatar: used automatically once public/host/host-avatar.glb exists.
    if (ROOT / "public" / "host" / "host-avatar.glb").exists():
        props.update({"host": "glb", "hostModel": "host/host-avatar.glb", "hostAnimation": ep.get("hostAnimation", "")})
    out = ROOT / "public" / "episodes" / f"{name}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(props, indent=2))
    print(f"props: {out.relative_to(ROOT)}  ({duration:.1f}s, {len(beats)} beats: " + ", ".join(f"{b['layout']}@{b['at']}" for b in beats) + ")")


if __name__ == "__main__":
    main()
