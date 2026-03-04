const test = require('node:test');
const assert = require('node:assert/strict');

const { REGION_OPTIONS, isRegionOption, suggestRegions } = require('../dist-electron/shared/regions.js');

test('region options include all prefectures and nationwide', () => {
  assert.equal(REGION_OPTIONS.length, 48);
  assert.equal(REGION_OPTIONS[0], '全国');
  assert.ok(REGION_OPTIONS.includes('東京都'));
  assert.ok(REGION_OPTIONS.includes('沖縄県'));
});

test('isRegionOption validates only known options', () => {
  assert.equal(isRegionOption('東京都'), true);
  assert.equal(isRegionOption('東京'), false);
  assert.equal(isRegionOption(''), false);
});

test('suggestRegions returns prefix matches and applies limit', () => {
  const suggestions = suggestRegions('東', 5);
  assert.deepEqual(suggestions, ['東京都']);

  const defaultSuggestions = suggestRegions('');
  assert.equal(defaultSuggestions.length, 12);
  assert.equal(defaultSuggestions[0], '全国');
});
