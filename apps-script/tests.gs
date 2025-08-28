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
  assertEquals('a.b.c', toDotSegment_('A/B\\C   ')); // non-alnum -> dot
}
function test_utils_toSnake() {
  assertEquals('copy_link_success', toSnake_('Copy link Success'));
  assertEquals('price', toSnake_(' price '));
  assertEquals('a_b_c', toSnake_('A/B/C'));
}
function test_utils_toDotKey() {
  assertEquals('product.copy_link_success', toDotKey_('Product', 'Copy link Success'));
}

/** ---------- Parser tests ---------- **/
function test_parser_mapHeaderIndexes() {
  const header = ['Feature','Keys','English (th_en)','Thai (th_th)','English (id_en)','Indonisia (id_id)'];
  const m = mapHeaderIndexes_(header);
  assertTrue(typeof m.feature === 'number');
  assertTrue(typeof m.keys === 'number');
  assertTrue(m.locales['th_en'] >= 0, 'th_en missing');
  assertTrue(m.locales['th_th'] >= 0, 'th_th missing');
  assertTrue(m.locales['id_en'] >= 0, 'id_en missing');
  assertTrue(m.locales['id_id'] >= 0, 'id_id missing');
}

function test_parser_collectAllLocales() {
  const header = ['Feature','Keys','English (th_en)','Thai (th_th)'];
  const m = mapHeaderIndexes_(header);
  const rows = [
    ['common','yes','yes','ใช่'],
    ['product','copy link success','Link copied.','คัดลอกลิงก์เรียบร้อยแล้ว'],
    ['product','price','{price} baht','{price} บาท'],
  ];
  const dict = collectAllLocales_(rows, m);
  assertEquals('yes', dict['th_en']['common.yes']);
  assertEquals('ใช่', dict['th_th']['common.yes']);
  assertTrue(!!dict['th_en']['product.copy_link_success']);
}

/** ---------- Builder (pure) tests ---------- **/
function test_builder_buildFilesFromTable() {
  const header = ['Feature','Keys','English (th_en)','Thai (th_th)'];
  const rows = [
    ['common','yes','yes','ใช่'],
    ['common','no','no','ไม่'],
    ['product','copy link success','Link copied.','คัดลอกลิงก์เรียบร้อยแล้ว'],
    ['product','price','{price} baht','{price} บาท'],
  ];
  const brands = ['nocnoc','renos'];
  const bundle = buildFilesFromTable_(header, rows, brands);

  // ตรวจไฟล์คีย์
  assertTrue(!!bundle.filesMap['nocnoc_th_en']);
  assertTrue(!!bundle.filesMap['nocnoc_th_th']);
  assertTrue(!!bundle.filesMap['renos_th_en']);
  assertTrue(!!bundle.filesMap['renos_th_th']);

  // ตรวจเนื้อหาอย่างน้อย 1 key
  assertEquals('yes', bundle.filesMap['nocnoc_th_en']['common.yes']);
  assertEquals('{price} บาท', bundle.filesMap['renos_th_th']['product.price']);
}

/** ---------- Endpoint (logic) tests ---------- **/
function test_endpoint_handleRequestWithData() {
  const header = ['Feature','Keys','English (th_en)','Thai (th_th)'];
  const rows = [
    ['common','yes','yes','ใช่'],
    ['common','no','no','ไม่'],
  ];
  const brands = ['nocnoc'];
  const bundle = buildFilesFromTable_(header, rows, brands);

  // list
  let res = handleRequestWithData_({ list: '1' }, bundle);
  let json = JSON.parse(res.getContent());
  assertTrue(Array.isArray(json.files), 'files should be array');

  // file by name
  res = handleRequestWithData_({ file: 'nocnoc_th_en.json' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('yes', json['common.yes']);

  // file by brand+locale
  res = handleRequestWithData_({ brand: 'nocnoc', locale: 'th_th' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('ไม่', json['common.no']);

  // not found
  res = handleRequestWithData_({ file: 'unknown_xx.json' }, bundle);
  json = JSON.parse(res.getContent());
  assertEquals('not_found', json.error);
}

/** ---------- Run all ---------- **/
function runTests() {
  const tests = [
    // utils
    test_utils_toDotSegment,
    test_utils_toSnake,
    test_utils_toDotKey,
    // parser
    test_parser_mapHeaderIndexes,
    test_parser_collectAllLocales,
    // builder
    test_builder_buildFilesFromTable,
    // endpoint
    test_endpoint_handleRequestWithData,
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