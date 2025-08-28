#!/bin/sh
set -e

# ===== Appscript Config =====
DEST_URL="https://script.google.com/macros/s/AKfycbxPCtgfPp5Swt6YNNmpNNplvuUdL3FAdwRtwwuj-NHDLPDjw6XrKGTqgfBRyAVXyvY6/exec"
OUT_DIR="assets/i18n"

# Fixed locales per brand
NOCNOC_LOCALES="th_th th_en"
RENOS_LOCALES="id_id id_en"

# ===== Usage =====
if [ $# -ne 1 ]; then
  echo "Usage: $0 <brand>"
  echo "       $0 nocnoc"
  echo "       $0 renos"
  exit 1
fi

BRAND="$1"
case "$BRAND" in
  nocnoc) LOCALES="$NOCNOC_LOCALES" ;;
  renos)  LOCALES="$RENOS_LOCALES"  ;;
  *)
    echo "Error: unknown brand '$BRAND' (supported: nocnoc, renos)"
    exit 1
    ;;
esac

# ===== Run =====
echo "=== Fetch localizations for brand: $BRAND ==="
echo "Source: $DEST_URL"
mkdir -p "$OUT_DIR"

for L in $LOCALES; do
  FILE="${BRAND}_${L}.json"
  URL="${DEST_URL}?file=${FILE}"
  OUT_PATH="${OUT_DIR}/${FILE}"

  echo "Downloading ${FILE} ..."
  curl -sSL "$URL" -o "$OUT_PATH"

  # quick sanity check: if endpoint returned an error json, show it and fail
  if grep -q '"error"' "$OUT_PATH" 2>/dev/null; then
    echo "Download failed for ${FILE}:"
    cat "$OUT_PATH"
    exit 1
  fi

  echo " -> saved: $OUT_PATH"
done

echo "=== Done. Files saved under: ${OUT_DIR} ==="