#!/usr/bin/env bash
# Renders every public/episodes/<name>.json to done/<name>.mp4 with the FacelessShort template.
#   bash scripts/render-episodes.sh            # all episodes
#   bash scripts/render-episodes.sh 03 07      # only names starting with these
set -uo pipefail
cd "$(dirname "$0")/.."
: "${REMOTION_BROWSER_EXECUTABLE:=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}"
export REMOTION_BROWSER_EXECUTABLE
mkdir -p done
for f in public/episodes/*.json; do
  name=$(basename "$f" .json)
  if [ $# -gt 0 ]; then match=0; for p in "$@"; do [[ $name == $p* ]] && match=1; done; [ $match = 1 ] || continue; fi
  echo "== $name  $(date +%H:%M:%S)"
  if npx remotion render FacelessShort "done/$name.mp4" --props="$f" --gl=swangle --crf=18 --concurrency=4 > "/tmp/render-$name.log" 2>&1; then
    echo "   ok  done/$name.mp4"
  else
    echo "   FAILED (see /tmp/render-$name.log)"; tail -5 "/tmp/render-$name.log"
  fi
done
echo "all done $(date +%H:%M:%S)"
