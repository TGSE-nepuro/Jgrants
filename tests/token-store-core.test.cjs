const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createTokenStore } = require('../dist-electron/main/token-store-core.js');

function createCrypto(available = true) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (text) => Buffer.from(`enc:${text}`, 'utf-8'),
    decryptString: (buffer) => buffer.toString('utf-8').replace(/^enc:/, '')
  };
}

async function setupStore(crypto = createCrypto()) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jgrants-token-'));
  const file = path.join(dir, 'token.enc');
  const store = createTokenStore(file, crypto);
  return { dir, file, store };
}

test('setToken and getToken roundtrip encrypted content', async () => {
  const { dir, file, store } = await setupStore();

  await store.setToken('secret-token');
  const raw = await fs.readFile(file, 'utf-8');
  assert.notEqual(raw, 'secret-token');
  assert.equal(await store.getToken(), 'secret-token');

  await fs.rm(dir, { recursive: true, force: true });
});

test('getToken returns empty when file does not exist', async () => {
  const { dir, store } = await setupStore();
  assert.equal(await store.getToken(), '');
  await fs.rm(dir, { recursive: true, force: true });
});

test('clearToken removes persisted token file', async () => {
  const { dir, file, store } = await setupStore();
  await store.setToken('to-be-cleared');
  await store.clearToken();
  await assert.rejects(() => fs.readFile(file, 'utf-8'));
  await fs.rm(dir, { recursive: true, force: true });
});

test('setToken throws when encryption is unavailable', async () => {
  const { dir, store } = await setupStore(createCrypto(false));
  await assert.rejects(() => store.setToken('x'), /OS encryption is not available/);
  await fs.rm(dir, { recursive: true, force: true });
});
