const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { _electron: electron } = require('playwright');

const projectRoot = path.resolve(__dirname, '..', '..');

let app;

test.afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

test('electron app launches and renders primary sections', async () => {
  app = await electron.launch({
    executablePath: require('electron'),
    args: [projectRoot]
  });

  let page = await app.firstWindow();
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const windows = app.windows();
    const target = windows.find((candidate) => {
      const url = candidate.url();
      return url.includes('index.html') || url.includes('file://');
    });
    if (target) {
      page = target;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  const title = await page.title();
  assert.equal(title, 'JGrants Desktop');

  await page.waitForFunction(() => {
    return (
      typeof window !== 'undefined' &&
      typeof window.jgrantsApi === 'object' &&
      typeof window.jgrantsApi.search === 'function'
    );
  }, { timeout: 30000 });
});
