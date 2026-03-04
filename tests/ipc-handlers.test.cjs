const test = require('node:test');
const assert = require('node:assert/strict');

const { registerIpcHandlers } = require('../dist-electron/main/ipc-handlers.js');

function createRegistrar() {
  const handlers = new Map();
  return {
    handlers,
    registrar: {
      handle(channel, listener) {
        handlers.set(channel, listener);
      }
    }
  };
}

function createDeps(overrides = {}) {
  return {
    searchGrants: async () => [],
    fetchGrantDetail: async () => ({ id: 'x', title: '', organization: '' }),
    listFavorites: async () => [],
    saveFavorite: async () => undefined,
    removeFavorite: async () => undefined,
    exportCsv: async () => ({ path: '/tmp/file.csv' }),
    getToken: async () => 'stored-token',
    setToken: async () => undefined,
    clearToken: async () => undefined,
    ...overrides
  };
}

test('registerIpcHandlers registers all expected channels', () => {
  const { handlers, registrar } = createRegistrar();
  registerIpcHandlers(registrar, createDeps());

  assert.deepEqual([...handlers.keys()].sort(), [
    'favorites:list',
    'favorites:remove',
    'favorites:save',
    'grants:detail',
    'grants:exportCsv',
    'grants:search',
    'token:clear',
    'token:get',
    'token:set'
  ]);
});

test('grants:search validates and forwards token/query', async () => {
  const { handlers, registrar } = createRegistrar();
  const calls = [];
  registerIpcHandlers(registrar, createDeps({
    searchGrants: async (token, query, trace) => {
      calls.push({ token, query, trace });
      return [{ id: 'g1', title: '補助金', organization: '機関' }];
    }
  }));

  const ok = await handlers.get('grants:search')({}, 'token', { keyword: 'DX' }, { requestId: 'req-1' });
  assert.equal(ok.length, 1);
  assert.deepEqual(calls, [{ token: 'token', query: { keyword: 'DX' }, trace: { requestId: 'req-1' } }]);

  assert.throws(() => handlers.get('grants:search')({}, '', { keyword: 'DX' }));
  assert.throws(() => handlers.get('grants:search')({}, 'token', { keyword: 'DX' }, { requestId: '' }));
});

test('favorites handlers validate payload and call dependencies', async () => {
  const { handlers, registrar } = createRegistrar();
  const saved = [];
  const removed = [];

  registerIpcHandlers(registrar, createDeps({
    saveFavorite: async (favorite) => saved.push(favorite),
    removeFavorite: async (id) => removed.push(id)
  }));

  const saveRes = await handlers.get('favorites:save')({}, {
    id: 'g1',
    title: 'A',
    organization: 'Org',
    savedAt: 'now'
  });
  const removeRes = await handlers.get('favorites:remove')({}, 'g1');

  assert.deepEqual(saveRes, { ok: true });
  assert.deepEqual(removeRes, { ok: true });
  assert.equal(saved.length, 1);
  assert.deepEqual(removed, ['g1']);

  await assert.rejects(() => handlers.get('favorites:save')({}, { id: '', title: 'bad', organization: '', savedAt: '' }));
});

test('grants:exportCsv validates grants and returns path', async () => {
  const { handlers, registrar } = createRegistrar();
  let exportedCount = 0;
  registerIpcHandlers(registrar, createDeps({
    exportCsv: async (grants) => {
      exportedCount = grants.length;
      return { path: '/tmp/export.csv' };
    }
  }));

  const res = await handlers.get('grants:exportCsv')({}, [
    { id: 'g1', title: 'A', organization: 'Org' }
  ]);
  assert.deepEqual(res, { path: '/tmp/export.csv' });
  assert.equal(exportedCount, 1);

  await assert.rejects(() => handlers.get('grants:exportCsv')({}, []));
});

test('token handlers call dependencies', async () => {
  const { handlers, registrar } = createRegistrar();
  let stored = '';
  let cleared = false;
  registerIpcHandlers(registrar, createDeps({
    getToken: async () => 'abc',
    setToken: async (token) => {
      stored = token;
    },
    clearToken: async () => {
      cleared = true;
    }
  }));

  assert.equal(await handlers.get('token:get')(), 'abc');
  assert.deepEqual(await handlers.get('token:set')({}, 'new-token'), { ok: true });
  assert.deepEqual(await handlers.get('token:clear')(), { ok: true });
  assert.equal(stored, 'new-token');
  assert.equal(cleared, true);

  await assert.rejects(() => handlers.get('token:set')({}, ''));
});
