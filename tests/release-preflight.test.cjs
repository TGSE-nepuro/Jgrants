const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

async function loadModule() {
  const modulePath = pathToFileURL(path.resolve(__dirname, '..', 'scripts', 'release-preflight.mjs')).href;
  return import(modulePath);
}

test('preflight passes with valid semver tag and full signing env', async () => {
  const { validateReleaseContext } = await loadModule();
  const result = validateReleaseContext({
    GITHUB_REF: 'refs/tags/v0.1.0',
    RELEASE_SIGNING_REQUIRED: 'true',
    PACKAGE_VERSION_OVERRIDE: '0.1.0',
    CSC_LINK: 'x',
    CSC_KEY_PASSWORD: 'x',
    APPLE_ID: 'x',
    APPLE_APP_SPECIFIC_PASSWORD: 'x',
    APPLE_TEAM_ID: 'x'
  });

  assert.deepEqual(result.errors, []);
});

test('preflight fails when signing required but secrets are missing', async () => {
  const { validateReleaseContext } = await loadModule();
  const result = validateReleaseContext({
    GITHUB_REF: 'refs/tags/v0.1.0',
    PACKAGE_VERSION_OVERRIDE: '0.1.0',
    RELEASE_SIGNING_REQUIRED: 'true',
    CSC_LINK: 'x'
  });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Signing is required/);
});

test('preflight fails on invalid tag format', async () => {
  const { validateReleaseContext } = await loadModule();
  const result = validateReleaseContext({
    GITHUB_REF: 'refs/tags/release-1',
    RELEASE_SIGNING_REQUIRED: 'false'
  });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Tag format is invalid/);
});

test('preflight fails when tag and package version mismatch', async () => {
  const { validateReleaseContext } = await loadModule();
  const result = validateReleaseContext({
    GITHUB_REF: 'refs/tags/v0.2.0',
    RELEASE_SIGNING_REQUIRED: 'false',
    PACKAGE_VERSION_OVERRIDE: '0.1.0'
  });

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Tag\/version mismatch/);
});
