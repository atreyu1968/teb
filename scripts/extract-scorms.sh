#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES="$ROOT/packages"
TARGET="$ROOT/web/reutilizados"

extract_one(){
  local prefix="$1" dest="$2"
  local tmp
  tmp="$(mktemp --suffix=.zip)"
  trap 'rm -f "$tmp"' RETURN
  cat "$PACKAGES/${prefix}.part"*.b64 | tr -d '\r\n\t ' | base64 -d > "$tmp"
  unzip -tqq "$tmp"
  rm -rf "$TARGET/$dest"
  mkdir -p "$TARGET/$dest"
  unzip -oq "$tmp" -d "$TARGET/$dest"
  for required in index.html app.js scorm.js styles.css imsmanifest.xml README_DOCENTE.txt; do
    test -f "$TARGET/$dest/$required" || { echo "Falta $required en $dest" >&2; exit 1; }
  done
  rm -f "$tmp"
  trap - RETURN
  echo "SCORM preparado: $dest"
}

extract_one scorm03 micro-scorm-de
extract_one scorm04 micro-scorm-f
extract_one scorm05 micro-scorm-g
