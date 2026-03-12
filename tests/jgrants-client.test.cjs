const test = require('node:test');
const assert = require('node:assert/strict');

const { searchGrants, fetchGrantDetail, listRegions } = require('../dist-electron/main/jgrants-client.js');

const originalFetch = global.fetch;
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

function captureConsoleJson(method) {
  const lines = [];
  console[method] = (...args) => {
    const first = args[0];
    if (typeof first !== 'string') return;
    try {
      lines.push(JSON.parse(first));
    } catch {
      // ignore non-json logs
    }
  };
  return lines;
}

function mockResponse(status, body, jsonReject = false) {
  return {
    status,
    json: jsonReject ? async () => Promise.reject(new Error('invalid json')) : async () => body
  };
}

function queueFetch(responses) {
  let index = 0;
  global.fetch = async (url) => {
    const next = responses[index++];
    if (!next) {
      throw new Error(`unexpected fetch call: ${String(url)}`);
    }
    if (next.throwError) {
      throw next.throwError;
    }
    return mockResponse(next.status, next.body, next.jsonReject);
  };
}

test.afterEach(() => {
  global.fetch = originalFetch;
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});

test('searchGrants uses v1 public endpoint', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return mockResponse(200, {
      items: [{ subsidy_id: 's-1', name: '補助金A', organization_name: '機関A', close_date: '2026-12-31' }]
    });
  };

  const result = await searchGrants('token', { keyword: 'IT' });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/exp\/v1\/public\/subsidies/);
  const url = new URL(calls[0]);
  assert.equal(url.searchParams.get('keyword'), 'IT');
  assert.equal(url.searchParams.get('sort'), 'acceptance_end_datetime');
  assert.equal(url.searchParams.get('order'), 'ASC');
  assert.equal(url.searchParams.get('acceptance'), '1');
  assert.deepEqual(result[0], {
    id: 's-1',
    title: '補助金A',
    organization: '機関A',
    deadline: '2026-12-31',
    region: undefined
  });
});

test('searchGrants does not fallback on authentication error', async () => {
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    return mockResponse(401, { error: 'unauthorized' });
  };

  await assert.rejects(() => searchGrants('bad-token', { keyword: 'DX' }), /Search failed on v1: 401/);
  assert.equal(callCount, 1);
});

test('searchGrants omits Authorization header when token is empty', async () => {
  let capturedHeaders;
  global.fetch = async (_url, init) => {
    capturedHeaders = init?.headers ?? null;
    return mockResponse(200, { items: [] });
  };

  await searchGrants('', { keyword: 'no-auth' });
  assert.ok(capturedHeaders);
  const authValue = typeof capturedHeaders === 'object' ? capturedHeaders.Authorization : undefined;
  assert.equal(authValue, undefined);
});

test('searchGrants defaults keyword when blank', async () => {
  let capturedUrl = '';
  global.fetch = async (url) => {
    capturedUrl = String(url);
    return mockResponse(200, { items: [] });
  };

  await searchGrants('token', { keyword: '  ' });
  const url = new URL(capturedUrl);
  assert.equal(url.searchParams.get('keyword'), '補助金');
});

test('searchGrants rejects invalid v1 payload shape after fallback', async () => {
  queueFetch([{ status: 200, body: { items: [{ subsidy_id: 's-1', name: '補助金A' }] } }]);

  await assert.rejects(() => searchGrants('token', { keyword: 'AI' }), /Invalid v1 search payload/);
});

test('searchGrants rejects malformed success payload', async () => {
  queueFetch([{ status: 200, body: { message: 'ok but no items key' } }]);
  await assert.rejects(
    () => searchGrants('token', { keyword: 'cloud' }),
    /Invalid v1 search payload/
  );
});

test('searchGrants accepts v1 payload using result key', async () => {
  queueFetch([
    {
      status: 200,
      body: { result: [{ subsidy_id: 's-9', name: '補助金X', ministry: '省庁X' }] }
    }
  ]);

  const result = await searchGrants('token', { keyword: 'result' });
  assert.equal(result[0].id, 's-9');
  assert.equal(result[0].title, '補助金X');
});

test('searchGrants propagates network error', async () => {
  queueFetch([{ throwError: new Error('network down') }]);
  await assert.rejects(() => searchGrants('token', { keyword: 'security' }), /network down/);
});

test('fetchGrantDetail falls back and maps v1 style payload keys', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/exp/v2/public/subsidies/id/abc')) {
      return mockResponse(410, { error: 'gone' });
    }
    return mockResponse(200, {
      data: {
        subsidy_id: 'abc',
        name: '補助金B',
        ministry: '省庁B',
        summary: '説明',
        conditions: '条件',
        rate: '1/2',
        inquiry: 'support@example.jp'
      }
    });
  };

  const detail = await fetchGrantDetail('token', 'abc');

  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/exp\/v2\/public\/subsidies\/id\/abc/);
  assert.match(calls[1], /\/exp\/v1\/public\/subsidies\/id\/abc/);
  assert.deepEqual(detail, {
    id: 'abc',
    title: '補助金B',
    organization: '省庁B',
    deadline: undefined,
    region: undefined,
    description: '説明',
    eligibility: '条件',
    subsidyRate: '1/2',
    contact: 'support@example.jp'
  });
});

test('fetchGrantDetail does not fallback on forbidden error', async () => {
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    return mockResponse(403, { error: 'forbidden' });
  };

  await assert.rejects(() => fetchGrantDetail('token', 'blocked'), /Detail failed on v2: 403/);
  assert.equal(callCount, 1);
});

test('fetchGrantDetail rejects payload with no detail object', async () => {
  queueFetch([{ status: 200, body: { items: [] } }]);
  await assert.rejects(() => fetchGrantDetail('token', 'x'), /Invalid v2 detail payload/);
});

test('fetchGrantDetail throws combined error when both versions fail', async () => {
  queueFetch([
    { status: 404, body: { error: 'v2 unsupported' } },
    { status: 502, body: { error: 'gateway' } }
  ]);

  await assert.rejects(
    () => fetchGrantDetail('token', 'x2'),
    /Detail failed on v2\(404\) and v1\(502\)/
  );
});

test('fetchGrantDetail handles invalid json response as missing payload', async () => {
  queueFetch([{ status: 200, body: null, jsonReject: true }]);
  await assert.rejects(() => fetchGrantDetail('token', 'x3'), /Invalid v2 detail payload/);
});

test('requestJson network errors are logged with request context', async () => {
  const errors = captureConsoleJson('error');
  queueFetch([{ throwError: new Error('network down hard') }]);

  await assert.rejects(() => searchGrants('token', { keyword: 'network' }), /network down hard/);

  const errorLine = errors.find((line) => line.message === 'jgrants request failed');
  assert.ok(errorLine);
  assert.equal(errorLine.meta.operation, 'search');
  assert.equal(errorLine.meta.apiVersion, 'v1');
  assert.equal(typeof errorLine.meta.requestId, 'string');
  assert.equal(typeof errorLine.meta.durationMs, 'number');
  assert.equal(errorLine.meta.error, 'network down hard');
});

test('searchGrants keeps provided requestId in completion logs', async () => {
  const infos = captureConsoleJson('log');
  queueFetch([
    {
      status: 200,
      body: { items: [{ subsidy_id: 'g1', name: '補助金', organization_name: '機関' }] }
    }
  ]);

  await searchGrants('token', { keyword: 'trace' }, { requestId: 'ui-trace-123' });

  const completeInfo = infos.find((line) => line.message === 'jgrants search completed');
  assert.ok(completeInfo);
  assert.equal(completeInfo.meta.requestId, 'ui-trace-123');
});

test('listRegions extracts unique tokens from grant regions', async () => {
  queueFetch([
    {
      status: 200,
      body: {
        items: [
          { subsidy_id: 'g1', name: 'A', ministry: 'Org', prefecture: '東京都/大阪府' },
          { subsidy_id: 'g2', name: 'B', ministry: 'Org', target_region: '全国' },
          { subsidy_id: 'g3', name: 'C', ministry: 'Org', prefecture: '東京都' }
        ]
      }
    }
  ]);

  const regions = await listRegions('token');
  assert.deepEqual(regions, ['全国', '大阪府', '東京都']);
});
