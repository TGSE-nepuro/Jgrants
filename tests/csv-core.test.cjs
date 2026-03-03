const test = require('node:test');
const assert = require('node:assert/strict');

const { grantsToCsv } = require('../dist-electron/main/csv-core.js');

test('grantsToCsv renders header and rows', () => {
  const csv = grantsToCsv([
    { id: 'g1', title: '補助金A', organization: '機関A', deadline: '2026-12-31', region: '東京' },
    { id: 'g2', title: '補助金B', organization: '機関B' }
  ]);

  const lines = csv.split('\n');
  assert.equal(lines[0], '"id","title","organization","deadline","region"');
  assert.equal(lines[1], '"g1","補助金A","機関A","2026-12-31","東京"');
  assert.equal(lines[2], '"g2","補助金B","機関B","",""');
});

test('grantsToCsv escapes double quotes', () => {
  const csv = grantsToCsv([
    { id: 'g1', title: '"特別"補助金', organization: '機関"A"' }
  ]);

  assert.match(csv, /"""特別""補助金"/);
  assert.match(csv, /"機関""A"""/);
});
