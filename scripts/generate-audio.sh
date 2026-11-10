#!/usr/bin/env bash
# Generates a placeholder 10s ambient music bed at public/music.mp3 using ffmpeg.
# Replace public/music.mp3 with your own track (and adjust captions) for real videos.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "sine=frequency=110:duration=10" \
  -f lavfi -i "sine=frequency=164.81:duration=10" \
  -f lavfi -i "sine=frequency=220:duration=10" \
  -f lavfi -i "sine=frequency=277.18:duration=10" \
  -filter_complex "[0][1][2][3]amix=inputs=4:normalize=0,volume=0.7,tremolo=f=0.5:d=0.4,afade=t=in:d=1.5,afade=t=out:st=8.5:d=1.5,aecho=0.8:0.7:400:0.35,pan=stereo|c0=c0|c1=c0" \
  -c:a libmp3lame -b:a 128k public/music.mp3
echo "Wrote public/music.mp3"
