/*** SIMPLE TEST HARNESS ***/
function assertEquals(expected, actual, msg) {
  if (expected !== actual) {
    throw new Error((msg || 'assertEquals failed') + ` | expected=${expected} actual=${actual}`);
  }
}
function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'assertTrue failed');
}
function assertDeepEquals(expected, actual, msg) {
  const e = JSON.stringify(expected);
  const a = JSON.stringify(actual);
  if (e !== a) {
    throw new Error((msg || 'assertDeepEquals failed') + ` | expected=${e} actual=${a}`);
  }
}

/** ---------- Utils tests ---------- **/
function test_utils_toDotSegment() {
  assertEquals('product', toDotSegment_('Product'));
  assertEquals('app.common', toDotSegment_('App  Common'));
  assertEquals('user.mgmt', toDotSegment_('user-mgmt'));
  assertEquals('a.b.c', toDotSegment_('A/B\\C   '));
}
function test_utils_toSnake() {
  assertEquals('copy_link_success', toSnake_('Copy link Success'));
  assertEquals('price', toSnake_(' price '));
  assertEquals('a_b_c', toSnake_('A/B/C'));
}

/** ---------- Parser tests (namespace/keys + locales) ---------- **/
function test_parser_mapHeaderIndexes_namespace_keys() {
  const header = ['namespace','keys','th_en','th_th','id_en','id_id'];
  const m = mapHeaderIndexes_(header);
  assertTrue(typeof m.namespace === 'number', 'namespace index missing');
  assertTrue(typeof m.keys === 'number', 'keys index missing');
  assertTrue(m.locales['th_en'] >= 0, 'th_en missing');
  assertTrue(m.locales['th_th'] >= 0, 'th_th missing');
  assertTrue(m.locales['id_en'] >= 0, 'id_en missing');
  assertTrue(m.locales['id_id'] >= 0, 'id_id missing');
}

function test_parser_collectAllLocales_nested() {
  const header = ['namespace','keys','th_en','th_th'];
  const m = mapHeaderIndexes_(header);
  const rows = [
    ['common','yes','yes','ใช่'],
    ['common','no','no','ไม่'],
    ['product','copy link success','Link copied.','คัดลอกลิงก์เรียบร้อยแล้ว'],
    ['product','price','{price} baht','{price} บาท'],
  ];
  const dict = collectAllLocales_(rows, m);

  // th_en
  assertEquals('yes', dict['th_en']['common']['yes']);
  assertEquals('no', dict['th_en']['common']['no']);
  assertEquals('Link copied.', dict['th_en']['product']['copy_link_success']);
  assertEquals('{price} baht', dict['th_en']['product']['price']);

  // th_th
  assertEquals('ใช่', dict['th_th']['common']['yes']);
  assertEquals('ไม่', dict['th_th']['common']['no']);
  assertEquals('คัดลอกลิงก์เรียบร้อยแล้ว', dict['th_th']['product']['copy_link_success']);
  assertEquals('{price} บาท', dict['th_th']['product']['price']);
}

/** ---------- Builder (pure) tests ---------- **/
function test_builder_buildLocaleFilesFromTable() {
  const header = ['namespace','keys','th_en','th_th'];
  const rows = [
    ['common','yes','yes','ใช่'],
    ['common','no','no','ไม่'],
    ['product','copy link success','Link copied.','คัดลอกลิงก์เรียบร้อยแล้ว'],
    ['product','price','{price} baht','{price} บาท'],
  ];

  const bundle = buildLocaleFilesFromTable_(header, rows);

  // Expect locales
  assertTrue(!!bundle.filesMap['th_en'], 'th_en file missing');
  assertTrue(!!bundle.filesMap['th_th'], 'th_th file missing');

  // Nested structure checks
  assertEquals('yes', bundle.filesMap['th_en']['common']['yes']);
  assertEquals('{price} บาท', bundle.filesMap['th_th']['product']['price']);
}

/** ---------- Endpoint logic tests (using pure bundle) ---------- **/
function test_endpoint_handleRequestWithData_localeFiles() {
  const header = ['namespace','keys','th_en','th_th'];
  const rows = [
    ['common','yes','yes','ใช่'],
    ['common','no','no','ไม่'],
  ];
  const bundle = buildLocaleFilesFromTable_(header, rows);

  // list
  let res = handleRequestWithData_({ list: '1' }, bundle);
  let json = JSON.parse(res.getContent());
  // should be ["th_en.json", "th_th.json"] order may vary, so assert membership
  const files = json.files.sort();
  assertDeepEquals(['th_en.json','th_th.json'], files);

  // file by name
  res = handleRequestWithData_({ file: 'th_en.json' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('yes', json.common.yes);
  assertEquals('no', json.common.no);

  // file by locale
  res = handleRequestWithData_({ locale: 'th_th' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('ใช่', json.common.yes);
  assertEquals('ไม่', json.common.no);

  // not found
  res = handleRequestWithData_({ file: 'id_en.json' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('not_found', json.error);
}

/** ---------- Run all ---------- **/
function runTests() {
  const tests = [
    // utils
    test_utils_toDotSegment,
    test_utils_toSnake,
    // parser
    test_parser_mapHeaderIndexes_namespace_keys,
    test_parser_collectAllLocales_nested,
    // builder
    test_builder_buildLocaleFilesFromTable,
    // endpoint
    test_endpoint_handleRequestWithData_localeFiles,
  ];
  let passed = 0, failed = 0;
  tests.forEach(fn => {
    try {
      fn();
      console.log(`✅ ${fn.name} passed`);
      passed++;
    } catch (e) {
      console.error(`❌ ${fn.name} failed: ${e.message}`);
      failed++;
    }
  });
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) throw new Error('Some tests failed');
}