# Localization Generator with Google Apps Script & Flutter

This project lets you manage translations in **Google Sheets** and automatically generate **nested JSON** files per locale using **Google Apps Script**.  
Each JSON file is grouped by `namespace` and `keys`, and the output can be integrated into Flutter projects with a simple shell script.

---

## ✨ Features

- **Google Sheets as source of truth**
- **Nested JSON structure**
  ```json
  {
    "common": {
      "yes": "yes",
      "no": "no"
    },
    "product": {
      "copy_link_success": "Link copied.",
      "price": "{price} baht"
    }
  }
  ```
- **One file per locale** (e.g. `th_en.json`, `th_th.json`, `id_en.json`, `id_id.json`)
- **Shell script integration**: automatically downloads JSON files into `assets/locales/`
- **Unit tests included** for Apps Script core logic

---

## 📊 Google Sheet Structure

- **Tab name**: `app`
- **Columns**:
  - `namespace` → high-level group (e.g. `common`, `product`)
  - `keys` → actual key name inside the namespace (converted to snake_case)
  - One column per locale (header **must be the locale code**, e.g. `th_en`, `th_th`, `id_en`, `id_id`)

### Example Sheet

| namespace | keys               | th_en         | th_th                   | id_en         | id_id          |
|-----------|--------------------|---------------|-------------------------|---------------|----------------|
| common    | yes                | yes           | ใช่                     | yes           | ya             |
| common    | no                 | no            | ไม่                      | no            | tidak          |
| product   | copy link success  | Link copied.  | คัดลอกลิงก์เรียบร้อยแล้ว | Link copied.  | Tautan disalin |
| product   | price              | {price} baht  | {price} บาท             | {price} rupiah| {price} rupiah |

---

## 📂 Apps Script

- `config.gs`
  ```js
  const CONFIG = {
    SPREADSHEET_ID: 'YOUR_SHEET_ID', // from the Sheet URL
    SHEET_NAME: 'app',
  };
  ```
- `utils.gs` → helpers (normalize keys, etc.)
- `core.gs` → parser, builder, endpoint
- `tests/TestRunner.gs` → simple unit tests

---

## ⚙️ Deploy (Web App)

1. Open the Apps Script project
2. Set your `SPREADSHEET_ID` in `config.gs`
3. Deploy → **New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Copy the `/exec` URL

---

## 🔗 API Endpoints

- **List available files**
  ```
  GET /exec?list=1
  ```
  Response:
  ```json
  {
    "files": ["th_en.json", "th_th.json", "id_en.json", "id_id.json"],
    "locales": ["id_en","id_id","th_en","th_th"]
  }
  ```

- **Fetch a file**
  ```
  GET /exec?file=th_en.json
  ```
  or
  ```
  GET /exec?locale=th_en
  ```

---

## 🐚 Shell Script (Flutter Integration)

The following script downloads JSON files from the Apps Script Web App and saves them under `assets/locales/<lang>/<locale>.json`.

Save this as `scripts/localizations.sh` and make it executable (`chmod +x scripts/localizations.sh`).

```sh
#!/bin/sh
set -e

# ---- Config ----
DEST_URL="https://script.google.com/a/macros/nocnoc.com/s/AKfycbx-6BqERWQ3PTcOk6kgc2GVHHByUuzoCo-lmldPfHtslct1twehbT_V3b1dYLf-t-rq/exec"
OUT_DIR="assets/locales"

# Groups
TH_GROUP="th_th th_en"
ID_GROUP="id_en id_id"

# Default when no args provided
DEFAULT_LOCALES="$TH_GROUP $ID_GROUP"

usage() {
  echo "Usage:"
  echo "  $0                   # fetch all (th_th th_en id_en id_id)"
  echo "  $0 th                # fetch th group"
  echo "  $0 id                # fetch id group"
  echo "  $0 th id             # fetch both groups"
  echo "  $0 th_th id_en       # fetch specific locales"
  exit 1
}

# Build requested locale list
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
      *_*) REQ="$REQ $arg" ;;  # specific locale
      -h|--help) usage ;;
      *) echo "Warning: unknown selector '$arg' (skipped)" >&2 ;;
    esac
  done

  # deduplicate
  printf '%s\n' $REQ | awk '!seen[$0]++' | tr '\n' ' '
}

mkdir -p "$OUT_DIR"

# Expand args
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

  # group folder = first part before underscore (th / id)
  GROUP=$(echo "$L" | cut -d'_' -f1)
  OUT_PATH="${OUT_DIR}/${GROUP}/${FILE}"

  mkdir -p "$(dirname "$OUT_PATH")"

  echo "Downloading ${FILE} -> ${OUT_PATH}"
  curl -sSL "$URL" -o "$OUT_PATH"

  if grep -q '"error"' "$OUT_PATH" 2>/dev/null; then
    echo "Download failed for ${FILE}:"
    cat "$OUT_PATH"
    exit 1
  fi
done

echo "=== Done. Files saved under ${OUT_DIR} ==="
```

### Script Usage
```bash
sh scripts/localizations.sh             # fetch all locales
sh scripts/localizations.sh th          # fetch th_en + th_th
sh scripts/localizations.sh id          # fetch id_en + id_id
sh scripts/localizations.sh th id       # fetch both groups
sh scripts/localizations.sh th_en id_en # fetch specific locales
```

### Download Path
```
assets/locales/
    th_en.json
    th_th.json
    id_en.json
    id_id.json
```

### Flutter Setup
Add once to your `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/locales/
```

---

## 🧪 Testing (Apps Script)

1. In Apps Script IDE, select `runTests` from `tests/TestRunner.gs`
2. Run ▶
3. See pass/fail in **Executions**

---

## 🔁 Keeping Shell Script in Sync with the Sheet

- **Locale columns changed** (add/remove/rename):  
  Re-run `GET /exec?list=1` to confirm available locales, then call the script with the needed selectors (e.g., `th`, `id`, or explicit `th_en`).
- **Web App URL changed** (new deployment):  
  Update `DEST_URL` in `tool/fetch_localizations.sh`.
- **Folder layout** remains stable: `assets/locales/<lang>/<locale>.json` (derived from the locale prefix, e.g., `th` or `id`).

Quick health checks:
```bash
curl -s "<WEB_APP_URL>?list=1"
curl -s "<WEB_APP_URL>?file=th_en.json"
```

---

## 🔧 Troubleshooting

- **Sheet not found** → Check `CONFIG.SHEET_NAME` and `SPREADSHEET_ID`
- **HTML error page** → Re-deploy Web App, verify access
- **`{"error":"not_found"}`** → Wrong locale code or not present in the Sheet
- **Files not loaded in Flutter** → Ensure `assets/locales/` is in `pubspec.yaml`

---

## 🚀 Future Enhancements

- `?list=1&prefix=th` to filter
- ZIP export of all JSONs
- Integration with Lokalise/Crowdin or ARB generation
- Add CI step to fetch before build

---

## 📄 License

MIT License © NocNoc
