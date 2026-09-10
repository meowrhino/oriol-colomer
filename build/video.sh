#!/usr/bin/env bash
# Video para web. De cada clip salen dos ficheros con el mismo nombre:
#   .webm (VP9)  -> lo cogen Chrome, Firefox y Safari moderno
#   .mp4  (h264) -> respaldo universal
# El JSON solo guarda el .mp4: el generador anade el <source> del .webm
# cuando existe. Reejecutable: salta lo que ya esta hecho.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. GIF -> mp4 + webm, y fuera el GIF
find media -type f -name '*.gif' -print0 | while IFS= read -r -d '' g; do
  base="${g%.gif}"
  [ -f "$base.mp4" ] || ffmpeg -nostdin -loglevel error -y -i "$g" \
      -movflags +faststart -pix_fmt yuv420p -an \
      -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
      -c:v libx264 -crf 26 -preset slow "$base.mp4"
  echo "gif -> mp4  $(basename "$base").mp4  $(du -h "$base.mp4"|cut -f1)"
  rm -f "$g"
done

# 2. todo mp4 sin gemelo -> webm
find media -type f -name '*.mp4' -print0 | while IFS= read -r -d '' m; do
  out="${m%.mp4}.webm"
  [ -f "$out" ] && continue
  ffmpeg -nostdin -loglevel error -y -i "$m" \
    -c:v libvpx-vp9 -crf 42 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -an "$out"
  printf '%-46s mp4 %7s  webm %7s\n' "$(basename "$m")" \
    "$(du -h "$m"|cut -f1)" "$(du -h "$out"|cut -f1)"
done

# 3. un fotograma de cada video como poster: lo usa <video poster> y, si el
#    proyecto no tiene ninguna foto, tambien la carta del tunel
find media -type f -name '*.mp4' -print0 | while IFS= read -r -d '' m; do
  out="${m%.mp4}.poster.jpg"
  [ -f "$out" ] && continue
  ffmpeg -nostdin -loglevel error -y -i "$m" -frames:v 1 -q:v 5 "$out"
  echo "poster    $(basename "$out")  $(du -h "$out"|cut -f1)"
done
