const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRegionQueries,
  mergeGrantResults
} = require('../dist-electron/shared/grant-search-utils.js');

test('buildRegionQueries appends nationwide when enabled', () => {
  assert.deepEqual(buildRegionQueries(['東京都', '大阪府'], true), ['東京都', '大阪府', '全国']);
  assert.deepEqual(buildRegionQueries(['全国', '東京都'], true), ['全国', '東京都']);
});

test('buildRegionQueries removes empty and duplicate values', () => {
  assert.deepEqual(buildRegionQueries(['東京都', '東京都', ' ', ''], false), ['東京都']);
});

test('mergeGrantResults de-duplicates by id preserving first result', () => {
  const merged = mergeGrantResults([
    [
      { id: 'g1', title: 'A', organization: 'Org1', region: '東京都' },
      { id: 'g2', title: 'B', organization: 'Org2' }
    ],
    [
      { id: 'g1', title: 'A-new', organization: 'Org-new' },
      { id: 'g3', title: 'C', organization: 'Org3' }
    ]
  ]);

  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'g1');
  assert.equal(merged[0].title, 'A');
  assert.equal(merged[2].id, 'g3');
});
