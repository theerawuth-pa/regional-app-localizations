/*** UTILS ***/
function safeStr_(v) {
  return (v == null) ? '' : String(v).trim();
}

/** Convert namespace text into dot-segment (e.g., "App Common" -> "app.common") */
function toDotSegment_(input) {
  return input
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')   // non-alphanumeric -> dot
    .replace(/^\.+|\.+$/g, '');    // trim dots
}

/** Convert key text into snake_case (e.g., "copy link success" -> "copy_link_success") */
function toSnake_(input) {
  return input
    .toString()
    .toLowerCase()
    .replace(/[_\-./]+/g, ' ')     // replace separators with space
    .replace(/\s+/g, ' ')          // normalize multiple spaces
    .trim()
    .replace(/[^a-z0-9\s]/g, '')   // remove invalid chars
    .split(' ')
    .filter(Boolean)
    .join('_');
}

/** Build final key: {namespace}.{key_snake_case} */
function toDotKey_(feature, rawKey) {
  return `${toDotSegment_(feature)}.${toSnake_(rawKey)}`;
}