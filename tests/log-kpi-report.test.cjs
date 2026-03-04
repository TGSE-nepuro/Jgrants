const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

async function loadModule() {
  const modulePath = pathToFileURL(path.resolve(__dirname, '..', 'scripts', 'log-kpi-report.mjs')).href;
  return import(modulePath);
}

test('computeKpiFromLogs aggregates failure/fallback rates and p95', async () => {
  const { computeKpiFromLogs } = await loadModule();

  const lines = [
    JSON.stringify({
      message: 'Fallback to v1 for search',
      meta: { requestId: 'r1' }
    }),
    JSON.stringify({
      message: 'jgrants search completed',
      meta: { requestId: 'r1', durationMs: 1200 }
    }),
    JSON.stringify({
      message: 'jgrants detail completed',
      meta: { requestId: 'r2', durationMs: 800 }
    }),
    JSON.stringify({
      message: 'jgrants search failed without fallback',
      meta: { requestId: 'r3' }
    }),
    JSON.stringify({
      message: 'jgrants request failed',
      meta: { requestId: 'r4', operation: 'detail' }
    })
  ];

  const report = computeKpiFromLogs(lines.join('\n'));
  assert.equal(report.totals.requests, 4);
  assert.equal(report.totals.failedRequests, 2);
  assert.equal(report.totals.fallbackRequests, 1);
  assert.equal(report.rates.failureRate, 0.5);
  assert.equal(report.rates.fallbackRate, 0.25);
  assert.equal(report.p95.searchMs, 1200);
  assert.equal(report.p95.detailMs, 800);
});

test('computeKpiFromLogs supports test-run prefixed lines and empty input', async () => {
  const { computeKpiFromLogs } = await loadModule();
  const prefixed = '# {"message":"jgrants search completed","meta":{"requestId":"a1","durationMs":900}}';
  const report = computeKpiFromLogs(`${prefixed}\nnot json`);

  assert.equal(report.totals.requests, 1);
  assert.equal(report.rates.failureRate, 0);
  assert.equal(report.rates.fallbackRate, 0);
  assert.equal(report.p95.searchMs, 900);
  assert.equal(report.p95.detailMs, null);

  const empty = computeKpiFromLogs('');
  assert.equal(empty.totals.requests, 0);
  assert.equal(empty.rates.failureRate, 0);
  assert.equal(empty.rates.fallbackRate, 0);
  assert.equal(empty.p95.searchMs, null);
  assert.equal(empty.p95.detailMs, null);
});
