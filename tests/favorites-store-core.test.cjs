const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createFavoritesStore } = require('../dist-electron/main/favorites-store-core.js');

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jgrants-store-'));
  const storePath = path.join(dir, 'favorites.json');
  return { dir, storePath, store: createFavoritesStore(storePath) };
}

test('ensureStore creates empty favorites file', async () => {
  const { dir, storePath, store } = await makeStore();
  await store.ensureStore();
  const raw = await fs.readFile(storePath, 'utf-8');
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed, { favorites: [] });
  await fs.rm(dir, { recursive: true, force: true });
});

test('saveFavorite persists and de-duplicates by id', async () => {
  const { dir, store } = await makeStore();
  await store.ensureStore();

  await store.saveFavorite({ id: 'g1', title: 'A', organization: 'Org', savedAt: '2026-01-01T00:00:00.000Z' });
  await store.saveFavorite({ id: 'g2', title: 'B', organization: 'Org', savedAt: '2026-01-02T00:00:00.000Z' });
  await store.saveFavorite({ id: 'g1', title: 'A-new', organization: 'Org2', savedAt: '2026-01-03T00:00:00.000Z' });

  const favorites = await store.listFavorites();
  assert.equal(favorites.length, 2);
  assert.equal(favorites[0].id, 'g1');
  assert.equal(favorites[0].title, 'A-new');
  assert.equal(favorites[1].id, 'g2');

  await fs.rm(dir, { recursive: true, force: true });
});

test('removeFavorite removes matching id only', async () => {
  const { dir, store } = await makeStore();
  await store.ensureStore();
  await store.saveFavorite({ id: 'g1', title: 'A', organization: 'Org', savedAt: '2026-01-01T00:00:00.000Z' });
  await store.saveFavorite({ id: 'g2', title: 'B', organization: 'Org', savedAt: '2026-01-02T00:00:00.000Z' });

  await store.removeFavorite('g1');

  const favorites = await store.listFavorites();
  assert.deepEqual(favorites.map((x) => x.id), ['g2']);

  await fs.rm(dir, { recursive: true, force: true });
});

test('listFavorites returns empty array when json is malformed', async () => {
  const { dir, storePath, store } = await makeStore();
  await fs.writeFile(storePath, '{bad-json', 'utf-8');

  const favorites = await store.listFavorites();
  assert.deepEqual(favorites, []);

  await fs.rm(dir, { recursive: true, force: true });
});
