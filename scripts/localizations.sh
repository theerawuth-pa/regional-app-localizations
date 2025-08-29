#!/bin/sh
set -e

# ---- Config ----
DEST_URL="https://script.google.com/macros/s/AKfycbwCdVrusGQf_cfPaxxjIYlNR67UjjQafmqnMk7gtpzKA9AJ9IdAK20u34ZEdT9qyYoA/exec"
OUT_DIR="assets/locales"

# Groups
TH_GROUP="th_th th_en"
ID_GROUP="id_en id_id"

# Default when no args provided
DEFAULT_LOCALES="$TH_GROUP $ID_GROUP"

usage() {
  echo "Usage:"
  echo "  $0                   # fetch all (th_th th_en id_en id_id)"
  echo "  $0 th                # fetch th group (th_th, th_en)"
  echo "  $0 id                # fetch id group (id_en, id_id)"
  echo "  $0 th id             # fetch both groups"
  echo "  $0 th_th id_en       # fetch specific locales"
  exit 1
}

# Build requested locale list (supports groups + explicit locales)
build_locales() {
  if [ "$#" -eq 0 ]; then
    echo "$DEFAULT_LOCALES"
    return
  fi

  REQ=""
  for arg in "$@"; do
    case "$arg" in
      th) REQ="$REQ $TH_GROUP" ;;
      id) REQ="$REQ $ID_GROUP" ;;
      *_*) REQ="$REQ $arg" ;;  # looks like specific locale (e.g., th_en)
      -h|--help) usage ;;
      *) echo "Warning: unknown selector '$arg' (skipped)" >&2 ;;
    esac
  done

  # de-duplicate while preserving order
  printf '%s\n' $REQ | awk '!seen[$0]++' | tr '\n' ' '
}

mkdir -p "$OUT_DIR"

# Expand args to locales
# shellcheck disable=SC2048,SC2086
LOCALES="$(build_locales $*)"
LOCALES="$(echo "$LOCALES" | xargs)" # trim

if [ -z "$LOCALES" ]; then
  echo "No valid locales selected."
  usage
fi

echo "=== Fetching locales: $LOCALES ==="
for L in $LOCALES; do
  FILE="${L}.json"
  URL="${DEST_URL}?file=${FILE}"
  OUT_PATH="${OUT_DIR}/${FILE}"

  echo "Downloading ${FILE} -> ${OUT_PATH}"
  curl -sSL "$URL" -o "$OUT_PATH"

  if grep -q '"error"' "$OUT_PATH" 2>/dev/null; then
    echo "Download failed for ${FILE}:"
    cat "$OUT_PATH"
    exit 1
  fi
done

echo "=== Done. Files saved under ${OUT_DIR} ==="