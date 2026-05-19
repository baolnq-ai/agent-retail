import assert from 'node:assert/strict';
import test from 'node:test';

const { healthResponseSchema } = await import('../dist/index.js');

test('health response schema accepts valid runtime payload', () => {
  const parsed = healthResponseSchema.parse({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });

  assert.equal(parsed.status, 'ok');
});
