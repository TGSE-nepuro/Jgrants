const test = require('node:test');
const assert = require('node:assert/strict');

const { maskForLog, buildLogEntry } = require('../dist-electron/main/logger-core.js');

test('maskForLog redacts sensitive keys recursively', () => {
  const masked = maskForLog({
    token: 'abc123',
    nested: {
      authorization: 'Bearer xyz.token',
      profile: {
        apiKey: 'key-001',
        email: 'user@example.com'
      }
    }
  });

  assert.equal(masked.token, '[REDACTED]');
  assert.equal(masked.nested.authorization, '[REDACTED]');
  assert.equal(masked.nested.profile.apiKey, '[REDACTED]');
  assert.equal(masked.nested.profile.email, '[REDACTED_EMAIL]');
});

test('maskForLog redacts bearer tokens and emails inside free text', () => {
  const masked = maskForLog({
    message: 'Authorization: Bearer superSecretToken and contact admin@test.co.jp'
  });

  assert.equal(
    masked.message,
    'Authorization: Bearer [REDACTED] and contact [REDACTED_EMAIL]'
  );
});

test('buildLogEntry produces json string with masked meta', () => {
  const line = buildLogEntry('warn', 'fallback', {
    token: 'raw-token',
    note: 'email user@sample.com'
  });

  const parsed = JSON.parse(line);
  assert.equal(parsed.level, 'warn');
  assert.equal(parsed.message, 'fallback');
  assert.equal(parsed.meta.token, '[REDACTED]');
  assert.equal(parsed.meta.note, 'email [REDACTED_EMAIL]');
  assert.ok(parsed.timestamp);
});
