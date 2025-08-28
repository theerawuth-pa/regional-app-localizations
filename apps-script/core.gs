/** ===== Parser: header & rows (new requirement) ===== **/
function mapHeaderIndexes_(header) {
  // Normalize column headers (trim + lowercase for matching)
  const norm = header.map(h => (h || '').toString().trim());
  const lower = norm.map(h => h.toLowerCase());

  const nsIdx   = lower.indexOf('namespace');
  const keysIdx = lower.indexOf('keys');
  if (nsIdx < 0 || keysIdx < 0) {
    throw new Error('Header must include "namespace" and "keys".');
  }

  // Every other column is treated as a locale code (e.g., "th_en", "th_th", "id_en", "id_id")
  const locales = {};
  norm.forEach((title, i) => {
    if (i === nsIdx || i === keysIdx) return;
    const lc = title.trim();
    const lcLower = lc.toLowerCase();
    locales[lcLower] = i;
  });

  if (Object.keys(locales).length === 0) {
    throw new Error('No locale columns found. Expect headers like "th_en", "th_th", "id_en", "id_id".');
  }

  return { namespace: nsIdx, keys: keysIdx, locales };
}

function collectAllLocales_(dataRows, colIdx) {
  // Prepare result object per locale
  const result = {};
  Object.keys(colIdx.locales).forEach(locale => (result[locale] = {}));

  for (const row of dataRows) {
    const nsRaw  = safeStr_(row[colIdx.namespace]);
    const keyRaw = safeStr_(row[colIdx.keys]);
    if (!nsRaw || !keyRaw) continue;

    const ns  = toDotSegment_(nsRaw); // "App Common" -> "app.common"
    const key = toSnake_(keyRaw);     // "copy link success" -> "copy_link_success"

    for (const [locale, idx] of Object.entries(colIdx.locales)) {
      const text = safeStr_(row[idx]);

      // Nested structure: result[locale][namespace][key] = text
      if (!result[locale][ns]) result[locale][ns] = {};
      result[locale][ns][key] = text;
    }
  }
  return result;
}

/** ===== Builder: sheet -> files map per locale ===== **/
function buildAllLocaleFiles_() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('No data rows');

  const header = data[0];
  const rows   = data.slice(1);

  const colIdx = mapHeaderIndexes_(header);
  const dictByLocale = collectAllLocales_(rows, colIdx);

  const filesMap = {};  // key = locale (e.g., "th_en", "th_th", ...)
  const locales  = Object.keys(colIdx.locales).sort();

  for (const locale of locales) {
    const src = dictByLocale[locale] || {};
    // Optionally filter out empty values
    const cleaned = {};
    for (const [ns, kv] of Object.entries(src)) {
      const inner = {};
      for (const [k, v] of Object.entries(kv)) {
        if (v !== '' && v != null) inner[k] = v;
      }
      if (Object.keys(inner).length > 0) cleaned[ns] = inner;
    }
    filesMap[locale] = cleaned;
  }

  return { filesMap, locales };
}

/** ===== Endpoint: supports ?file=<locale>.json and ?locale=<code> ===== **/
function doGet(e)  { return handleRequest_(e); }
function doPost(e) { return handleRequest_(e); }

function handleRequest_(e) {
  const q = (e && e.parameter) || {};
  const bundle = buildAllLocaleFiles_(); // { filesMap, locales }
  return handleRequestWithData_(q, bundle);
}

function handleRequestWithData_(q, bundle) {
  const { filesMap, locales } = bundle;

  if (q.list === '1') {
    const names = Object.keys(filesMap).map(lc => `${lc}.json`);  // e.g., th_en.json
    return ContentService
      .createTextOutput(JSON.stringify({ files: names, locales }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let fileKey = '';
  if (q.file) {
    fileKey = String(q.file).replace(/\.json$/i, ''); // "th_en.json" -> "th_en"
  } else if (q.locale) {
    fileKey = String(q.locale);
  } else {
    const msg = { error: 'missing_param', usage: '?file=<locale>.json OR ?locale=<locale> OR ?list=1' };
    return ContentService.createTextOutput(JSON.stringify(msg))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Normalize locale key to lowercase
  const lcKey = fileKey.toLowerCase();
  const obj = filesMap[lcKey];
  if (!obj) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'not_found', file: `${lcKey}.json` }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * For Unit Test
 * Pure builder: build files map per-locale from in-memory table.
 * @param {Array<string>} header
 * @param {Array<Array<any>>} rows
 * @returns {{ filesMap: Object, locales: string[] }}
 */
function buildLocaleFilesFromTable_(header, rows) {
  const colIdx = mapHeaderIndexes_(header);
  const dictByLocale = collectAllLocales_(rows, colIdx);

  const filesMap = {};
  const locales  = Object.keys(colIdx.locales).sort();

  for (const locale of locales) {
    const src = dictByLocale[locale] || {};
    const cleaned = {};
    for (const [ns, kv] of Object.entries(src)) {
      const inner = {};
      for (const [k, v] of Object.entries(kv)) {
        if (v !== '' && v != null) inner[k] = v;
      }
      if (Object.keys(inner).length > 0) cleaned[ns] = inner;
    }
    filesMap[locale] = cleaned;
  }
  return { filesMap, locales };
}