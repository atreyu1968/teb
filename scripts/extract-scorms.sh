#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES="$ROOT/packages"
TARGET="$ROOT/web/reutilizados"

extract_one(){
  local prefix="$1" dest="$2" expected_sha="$3"
  local tmp actual_sha
  tmp="$(mktemp --suffix=.zip)"
  trap 'rm -f "$tmp"' RETURN

  cat "$PACKAGES/${prefix}.part"*.b64 | tr -d '\r\n\t ' | base64 -d > "$tmp"
  actual_sha="$(sha256sum "$tmp" | awk '{print $1}')"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    echo "Checksum incorrecto para $dest" >&2
    echo "Esperado: $expected_sha" >&2
    echo "Obtenido: $actual_sha" >&2
    exit 1
  fi

  unzip -tqq "$tmp"
  rm -rf "$TARGET/$dest"
  mkdir -p "$TARGET/$dest"
  unzip -oq "$tmp" -d "$TARGET/$dest"

  for required in index.html app.js scorm.js styles.css imsmanifest.xml README_DOCENTE.txt; do
    test -f "$TARGET/$dest/$required" || { echo "Falta $required en $dest" >&2; exit 1; }
  done

  rm -f "$tmp"
  trap - RETURN
  echo "SCORM preparado y verificado: $dest · SHA-256 $actual_sha"
}

extract_one scorm03 micro-scorm-de 3c9c4af20cc8bc9bb009839a8856933c81111540d8cbdbfa044dca59acee7ee3
extract_one scorm04 micro-scorm-f 05f9795ed3394017f847bfda8db361dc8dd17917311becd7d928f5e15cb536f0
extract_one scorm05 micro-scorm-g 189d3ba4513d185949a2a3bdc7899f72621791f935e87744be7ee992ece43d28
