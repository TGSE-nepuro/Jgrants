const test = require('node:test');
const assert = require('node:assert/strict');

const { searchGrants, fetchGrantDetail } = require('../dist-electron/main/jgrants-client.js');

const originalFetch = global.fetch;

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
});

test('searchGrants falls back from v2 to v1 when v2 is unsupported', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v2/subsidies')) {
      return mockResponse(404, { error: 'not found' });
    }
    return mockResponse(200, {
      items: [{ subsidy_id: 's-1', name: '補助金A', organization_name: '機関A', close_date: '2026-12-31' }]
    });
  };

  const result = await searchGrants('token', { keyword: 'IT' });

  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/v2\/subsidies/);
  assert.match(calls[1], /\/v1\/subsidies/);
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

  await assert.rejects(() => searchGrants('bad-token', { keyword: 'DX' }), /Search failed on v2: 401/);
  assert.equal(callCount, 1);
});

test('searchGrants throws combined error when v2 and v1 both fail', async () => {
  queueFetch([
    { status: 404, body: { error: 'v2 unsupported' } },
    { status: 500, body: { error: 'v1 failed' } }
  ]);

  await assert.rejects(
    () => searchGrants('token', { keyword: 'AI' }),
    /Search failed on v2\(404\) and v1\(500\)/
  );
});

test('searchGrants returns empty list for malformed success payload', async () => {
  queueFetch([{ status: 200, body: { message: 'ok but no items key' } }]);
  const result = await searchGrants('token', { keyword: 'cloud' });
  assert.deepEqual(result, []);
});

test('searchGrants propagates network error', async () => {
  queueFetch([{ throwError: new Error('network down') }]);
  await assert.rejects(() => searchGrants('token', { keyword: 'security' }), /network down/);
});

test('fetchGrantDetail falls back and maps v1 style payload keys', async () => {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v2/subsidies/abc')) {
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
  assert.match(calls[0], /\/v2\/subsidies\/abc/);
  assert.match(calls[1], /\/v1\/subsidies\/abc/);
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

test('fetchGrantDetail throws when payload has no detail object', async () => {
  queueFetch([{ status: 200, body: { items: [] } }]);
  await assert.rejects(() => fetchGrantDetail('token', 'x'), /Missing detail payload on v2/);
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
  await assert.rejects(() => fetchGrantDetail('token', 'x3'), /Missing detail payload on v2/);
});
