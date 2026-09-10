#!/usr/bin/env bash
# Los GIF pesan cientos de MB y cargan peor que el video que representan.
# Esto los pasa a MP4 (h264, sin audio, loop) y borra el original.
# Reejecutable: si ya existe el .mp4 lo salta.
set -euo pipefail
cd "$(dirname "$0")/.."
find media -type f -name '*.gif' -print0 | while IFS= read -r -d '' g; do
  out="${g%.gif}.mp4"
  [ -f "$out" ] && { echo "salto $out"; continue; }
  ffmpeg -nostdin -loglevel error -y -i "$g" \
    -movflags +faststart -pix_fmt yuv420p -an \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:v libx264 -crf 26 -preset slow "$out"
  printf '%-56s %6s -> %6s\n' "$(basename "$g")" \
    "$(du -h "$g" | cut -f1)" "$(du -h "$out" | cut -f1)"
  rm "$g"
done
