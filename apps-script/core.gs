/*** CORE (parser + builder + endpoint) ***/

/** ===== Parser (pure) ===== **/
function mapHeaderIndexes_(header) {
  const norm  = header.map(h => (h || '').toString().trim());
  const lower = norm.map(h => h.toLowerCase());

  const featureIdx = lower.indexOf('feature');
  const keysIdx    = lower.indexOf('keys');
  if (featureIdx < 0 || keysIdx < 0) {
    throw new Error('Header must include "Feature" and "Keys".');
  }

  // locale columns: ลงท้ายด้วย "(locale_code)" เช่น "English (th_en)"
  const locales = {};
  norm.forEach((title, i) => {
    if (i === featureIdx || i === keysIdx) return;
    const m = title.match(/\(([^)]+)\)\s*$/);
    if (m && m[1]) locales[m[1].trim()] = i;
  });
  if (Object.keys(locales).length === 0) {
    throw new Error('No locale columns found. Use headers like "English (th_en)".');
  }
  return { feature: featureIdx, keys: keysIdx, locales };
}

function collectAllLocales_(dataRows, colIdx) {
  const result = {};
  Object.keys(colIdx.locales).forEach(locale => (result[locale] = {}));

  for (const row of dataRows) {
    const feature = safeStr_(row[colIdx.feature]);
    const rawKey  = safeStr_(row[colIdx.keys]);
    if (!feature || !rawKey) continue;

    const dotKey = toDotKey_(feature, rawKey); // {feature}.{key_snake}

    for (const [locale, idx] of Object.entries(colIdx.locales)) {
      const text = safeStr_(row[idx]);
      result[locale][dotKey] = text;
    }
  }
  return result;
}

/** ===== Builder (pure) ===== **/
/**
 * @param {Array<string>} header  - แถวหัวตาราง
 * @param {Array<Array<any>>} rows - data rows
 * @param {Array<string>} brands   - รายชื่อแบรนด์
 * @returns {{ filesMap: Object, locales: string[], brands: string[] }}
 */
function buildFilesFromTable_(header, rows, brands) {
  const colIdx = mapHeaderIndexes_(header);
  const dictByLocale = collectAllLocales_(rows, colIdx);

  const locales  = Object.keys(colIdx.locales).sort();
  const filesMap = {};

  for (const brand of brands) {
    for (const locale of locales) {
      const src = dictByLocale[locale] || {};
      const obj = {};
      for (const [k, v] of Object.entries(src)) {
        if (v !== '' && v != null) obj[k] = v; // กรองว่าง
      }
      const fileKey = `${brand}_${locale}`;
      filesMap[fileKey] = obj;
    }
  }
  return { filesMap, locales, brands: brands.slice() };
}

/** ===== Builder (from Spreadsheet) ===== **/
function buildAllBrandFiles_() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('No data rows');

  const header = data[0];
  const rows   = data.slice(1);
  return buildFilesFromTable_(header, rows, CONFIG.BRANDS);
}

/** ===== Endpoint ===== **/
// 3 โหมด:
// 1) ?list=1
// 2) ?file=<brand>_<locale>.json
// 3) ?brand=<b>&locale=<l>
function doGet(e)  { return handleRequest_(e); }
function doPost(e) { return handleRequest_(e); }

function handleRequest_(e) {
  const q = (e && e.parameter) || {};
  const bundle = buildAllBrandFiles_(); // { filesMap, locales, brands }
  return handleRequestWithData_(q, bundle); // แยกเพื่อเทสต์ได้
}

/** แกนลอจิกของ endpoint (pure) */
function handleRequestWithData_(q, bundle) {
  const { filesMap, locales, brands } = bundle;

  if (q.list === '1') {
    const names = Object.keys(filesMap).map(n => n + '.json');
    return ContentService
      .createTextOutput(JSON.stringify({ files: names, locales, brands }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let fileKey = '';
  if (q.file) {
    fileKey = String(q.file).replace(/\.json$/i, '');
  } else if (q.brand && q.locale) {
    fileKey = `${q.brand}_${q.locale}`;
  } else {
    const msg = { error: 'missing_param', usage: '?file=<name>.json OR ?brand=<b>&locale=<l> OR ?list=1' };
    return ContentService.createTextOutput(JSON.stringify(msg))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const obj = filesMap[fileKey];
  if (!obj) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'not_found', file: fileKey + '.json' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}