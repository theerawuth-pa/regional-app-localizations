/*** UTILS ***/
function safeStr_(v) {
  return (v == null) ? '' : String(v).trim();
}

/** แปลงข้อความส่วน feature ให้เป็น dot-segment (เช่น "App Common" -> "app.common") */
function toDotSegment_(input) {
  return input
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')   // non-alphanumeric -> dot
    .replace(/^\.+|\.+$/g, '');    // trim dots
}

/** แปลงข้อความส่วน key ให้เป็น snake_case (เช่น "copy link success!" -> "copy_link_success!") */
function toSnake_(input) {
  return input
    .toString()
    .toLowerCase()
    .replace(/[_\-./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .join('_');
}

/** สร้างคีย์สุดท้าย: {feature}.{key_snake_case} */
function toDotKey_(feature, rawKey) {
  return `${toDotSegment_(feature)}.${toSnake_(rawKey)}`;
}