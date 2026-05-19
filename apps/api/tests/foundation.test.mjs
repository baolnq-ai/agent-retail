import assert from 'node:assert/strict';
import test from 'node:test';

const { loadEnvironment } = await import('../dist/config/environment.js');
const { resolveCorrelationId } = await import('../dist/utils/correlation-id.js');

test('loadEnvironment validates API_PORT', () => {
  assert.equal(loadEnvironment({ API_PORT: '3456', NODE_ENV: 'test' }).apiPort, 3456);
  assert.throws(() => loadEnvironment({ API_PORT: 'invalid' }), /API_PORT/);
  assert.throws(() => loadEnvironment({ API_PORT: '70000' }), /API_PORT/);
});

test('resolveCorrelationId keeps inbound id or generates a new id', () => {
  assert.equal(resolveCorrelationId('request-123'), 'request-123');
  assert.match(resolveCorrelationId(undefined), /^[0-9a-f-]{36}$/);
});
