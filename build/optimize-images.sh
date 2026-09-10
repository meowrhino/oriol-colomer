#!/usr/bin/env bash
# Capturas de video guardadas en PNG: pesan 10x lo que deberian.
# A JPEG de calidad 72 y 1920 px de ancho maximo. Reejecutable.
set -euo pipefail
cd "$(dirname "$0")/.."
find media -type f -name '*.png' -print0 | while IFS= read -r -d '' p; do
  out="${p%.png}.jpg"
  [ -f "$out" ] && { echo "salto $out"; continue; }
  sips -s format jpeg -s formatOptions 72 -Z 1920 "$p" --out "$out" >/dev/null
  printf '%-52s %6s -> %6s\n' "$(basename "$p")" "$(du -h "$p"|cut -f1)" "$(du -h "$out"|cut -f1)"
  rm "$p"
done
# jpeg -> jpg, un solo sufijo en todo el arbol
find media -type f -name '*.jpeg' -print0 | while IFS= read -r -d '' j; do
  mv "$j" "${j%.jpeg}.jpg"
done
