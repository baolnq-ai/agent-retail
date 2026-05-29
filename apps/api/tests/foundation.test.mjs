import assert from 'node:assert/strict';
import test from 'node:test';

const { loadEnvironment } = await import('../dist/config/environment.js');
const { resolveCorrelationId } = await import('../dist/utils/correlation-id.js');

test('loadEnvironment validates API_PORT', () => {
  assert.equal(loadEnvironment(testEnvironment({ API_PORT: '3456' })).apiPort, 3456);
  assert.throws(() => loadEnvironment(testEnvironment({ API_PORT: 'invalid' })), /API_PORT/);
  assert.throws(() => loadEnvironment(testEnvironment({ API_PORT: '70000' })), /API_PORT/);
});

test('loadEnvironment uses project model defaults', () => {
  const environment = loadEnvironment(testEnvironment());
  assert.equal(environment.chatModelBaseUrl, 'https://replace-with-your-vllm-gateway.example.invalid');
  assert.equal(environment.chatModelId, 'google/gemma-4-E4B-it');
  assert.equal(environment.embedRerankBaseUrl, 'https://replace-with-your-embed-rerank-gateway.example.invalid');
  assert.equal(environment.redisUrl, 'redis://localhost:3139');
  assert.equal(environment.catalogCacheTtlSeconds, 120);
});

test('loadEnvironment validates catalog cache TTL', () => {
  assert.equal(loadEnvironment(testEnvironment({ CATALOG_CACHE_TTL_SECONDS: '30' })).catalogCacheTtlSeconds, 30);
  assert.throws(() => loadEnvironment(testEnvironment({ CATALOG_CACHE_TTL_SECONDS: '0' })), /CATALOG_CACHE_TTL_SECONDS/);
  assert.throws(() => loadEnvironment(testEnvironment({ CATALOG_CACHE_TTL_SECONDS: 'invalid' })), /CATALOG_CACHE_TTL_SECONDS/);
});

test('resolveCorrelationId keeps inbound id or generates a new id', () => {
  assert.equal(resolveCorrelationId('request-123'), 'request-123');
  assert.match(resolveCorrelationId(undefined), /^[0-9a-f-]{36}$/);
});

function testEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'test',
    CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
    CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
    EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
    ...overrides,
  };
}
