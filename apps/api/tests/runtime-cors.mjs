import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3601;
const baseUrl = `http://127.0.0.1:${port}`;
const origin = 'http://127.0.0.1:7000';

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

test('api allows browser frontend CORS requests from web port', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);
    const preflight = await fetch(`${baseUrl}/api/v1/chat`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /POST/);

    const products = await fetch(`${baseUrl}/api/v1/products`, { headers: { origin } });
    assert.equal(products.status, 200);
    assert.equal(products.headers.get('access-control-allow-origin'), origin);
  } finally {
    child.kill('SIGTERM');
  }
});

async function waitForHealth(url) {
  const deadline = Date.now() + 15000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError ?? new Error('API did not become ready');
}
