# Localization Generator with Google Apps Script & Flutter

This project provides a **Google Apps Script** backend and a **shell script utility** for managing and fetching localization (`i18n`) files for Flutter applications.  
It enables teams to manage translations in Google Sheets, and automatically generate language JSON files per brand and locale.

---

## ✨ Features

- **Google Sheets as a source of truth** for all translations.
- **Key formatting**:  
  - `feature` → dot notation (`app.common`, `product`).  
  - `keys` → snake_case (`copy_link_success`).  
  - Combined as: `feature.key_snake` (e.g., `product.copy_link_success`).
- **Multiple brand support**: generates `<brand>_<locale>.json` for each brand.
- **Google Apps Script Web API**:  
  - `?list=1` → lists all available files.  
  - `?file=<brand>_<locale>.json` → fetches one file.  
  - `?brand=<b>&locale=<l>` → alternative way to fetch a single file.
- **Shell script integration**: fetch JSON files into `assets/i18n/` in a Flutter project.
- **Unit tests**: pure functions are testable directly in Apps Script.

---

## 📊 Google Sheet Structure

- **Sheet name**: `app` (configurable in `CONFIG.SHEET_NAME`).  
- **Required columns**:
  - `Feature`
  - `Keys`
  - One or more locale columns: must end with `(locale_code)`  
    Example: `English (th_en)`, `Thai (th_th)`, `Indonesian (id_id)`

### Example Sheet

| Feature | Keys               | English (th_en) | Thai (th_th)              | English (id_en) | Indonesia (id_id) |
|---------|--------------------|-----------------|---------------------------|-----------------|-------------------|
| common  | yes                | yes             | ใช่                       | yes             | ya                |
| common  | no                 | no              | ไม่                       | no              | tidak             |
| product | copy link success  | Link copied.    | คัดลอกลิงก์เรียบร้อยแล้ว | Link copied.    | Tautan disalin.   |
| product | price              | {price} baht    | {price} บาท               | {price} rupiah  | {price} rupiah    |

---

## 📂 Apps Script Code Structure

- `config.gs` – global configuration (`SPREADSHEET_ID`, `SHEET_NAME`, `BRANDS`).
- `utils.gs` – helper functions (string formatting, key conversion).
- `core.gs` – parser, builder, and endpoint logic.
- `tests.gs` – simple test harness for unit testing functions.

---

## ⚙️ Deployment

1. Open the Apps Script project.
2. Set up `config.gs`:

```js
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SHEET_ID', // from Google Sheet URL
  SHEET_NAME: 'app',
  BRANDS: ['nocnoc', 'renos']
};

## 🐚 Shell Script (Flutter Integration)

Use the helper script to download brand–locale JSON files from the Apps Script Web API directly into your Flutter project.

### What the script does
- Calls your **Apps Script Web App** with `?file=<brand>_<locale>.json`
- Writes each JSON to `assets/i18n/` (auto-creates the folder)
- Supports **fixed brand–locale mapping** (per your team’s policy)

### Prerequisites
- `curl` available on your machine/CI
- Apps Script is deployed as a Web App and reachable (use the `/exec` URL)
- Flutter project includes the i18n folder in `pubspec.yaml`

```yaml
# pubspec.yaml
flutter:
  assets:
    - assets/i18n/


### Usage
``` bash
sh script/localizations.sh <brand>