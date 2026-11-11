#!/usr/bin/env python3
"""
Script text -> voiceover + word captions + lip-sync data for the 3D host.

    .venv/bin/python scripts/make-voice.py scripts/episodes/my-video.txt
    .venv/bin/python scripts/make-voice.py my-video.txt --engine espeak     # free offline test voice
    .venv/bin/python scripts/make-voice.py my-video.txt --voice <voice_id>  # pick an ElevenLabs voice

Writes, in public/voice/:
    <name>.mp3            voice, pauses > 0.18 s cut (style.md §3), loudness-normalised
    <name>.captions.json  word-level captions (@remotion/captions format)
    <name>.mouth.json     {"fps":30,"open":[...]} per-frame mouth opening 0..1 from the audio

ElevenLabs: the API key is injected by this environment's network proxy for api.elevenlabs.io,
so nothing needs to be set here. Elsewhere, export ELEVENLABS_API_KEY.
"""
import argparse, json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import urllib.request

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "voice"
FPS = 30
# A clear, confident, conversational male narrator. Change with --voice.
DEFAULT_VOICE = "pNInz6obpgDQGcFmaJgB"  # ElevenLabs premade voice "Adam"


def sh(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def tts_elevenlabs(text: str, voice: str, out_path: Path):
    key = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192",
        data=json.dumps({
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": 1.08},
        }).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            out_path.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs error {e.code}: {e.read().decode()[:300]}")


def tts_espeak(text: str, out_path: Path):
    sh("espeak-ng", "-s", "175", "-v", "en-us+m3", "-w", str(out_path), text)


def cut_pauses(src: Path, dst: Path):
    """Remove silences > 0.18 s, keep ~0.07 s handles, then normalise to -14 LUFS / -1 dBTP."""
    af = (
        "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.03:"
        "stop_periods=-1:stop_duration=0.18:stop_threshold=-40dB:stop_silence=0.07,"
        "highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
        "loudnorm=I=-14:TP=-1.0:LRA=7"
    )
    sh("ffmpeg", "-y", "-i", str(src), "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", str(dst))


def words_from_audio(path: Path):
    from faster_whisper import WhisperModel
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(str(path), word_timestamps=True, vad_filter=False)
    return [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]


def to_captions(words):
    caps = []
    for i, (s, e, w) in enumerate(words):
        caps.append({
            "text": (" " if i else "") + w,
            "startMs": round(s * 1000),
            "endMs": round(e * 1000),
            "timestampMs": round((s + e) / 2 * 1000),
            "confidence": 1,
        })
    return caps


def mouth_envelope(path: Path):
    with tempfile.TemporaryDirectory() as d:
        wav = Path(d) / "m.wav"
        sh("ffmpeg", "-y", "-i", str(path), "-ac", "1", "-ar", "16000", str(wav))
        w = wave.open(str(wav))
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    hop = 16000 // FPS
    n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    db = 20 * np.log10(rms + 1e-6)
    # Map -45 dB (closed) .. -12 dB (wide open), then soften so the jaw doesn't jitter.
    o = np.clip((db + 45) / 33, 0, 1)
    sm = np.copy(o)
    for i in range(1, len(o)):  # fast attack, slower release
        a = 0.75 if o[i] > sm[i - 1] else 0.45
        sm[i] = sm[i - 1] + a * (o[i] - sm[i - 1])
    return [round(float(v), 3) for v in sm]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", help="text file with the voiceover script (or the text itself)")
    ap.add_argument("--name", help="output name (default: script file name)")
    ap.add_argument("--engine", choices=["elevenlabs", "espeak"], default="elevenlabs")
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    a = ap.parse_args()

    p = Path(a.script)
    text = p.read_text().strip() if p.exists() else a.script
    name = a.name or (p.stem if p.exists() else "voice")
    OUT.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as d:
        raw = Path(d) / ("raw.mp3" if a.engine == "elevenlabs" else "raw.wav")
        print(f"1/4 generating voice ({a.engine})…")
        (tts_elevenlabs(text, a.voice, raw) if a.engine == "elevenlabs" else tts_espeak(text, raw))
        print("2/4 cutting pauses + loudness…")
        voice = OUT / f"{name}.mp3"
        cut_pauses(raw, voice)

    print("3/4 word timings…")
    words = words_from_audio(voice)
    script_words = text.split()
    if len(script_words) == len(words):  # same count: keep whisper timings, use the exact script spelling
        words = [(s, e, w) for (s, e, _), w in zip(words, script_words)]
    else:
        print(f"   note: whisper heard {len(words)} words vs {len(script_words)} in the script; captions use whisper's text")
    (OUT / f"{name}.captions.json").write_text(json.dumps(to_captions(words)))
    print("4/4 lip-sync…")
    mouth = mouth_envelope(voice)
    (OUT / f"{name}.mouth.json").write_text(json.dumps({"fps": FPS, "open": mouth}))

    dur = len(mouth) / FPS
    gaps = [words[i + 1][0] - words[i][1] for i in range(len(words) - 1)] or [0]
    print(f"done: public/voice/{name}.mp3  {dur:.1f}s  {len(words)} words  {len(words) / dur * 60:.0f} wpm  max gap {max(gaps):.2f}s")


if __name__ == "__main__":
    main()
