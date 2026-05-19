import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3101;

test('api runtime health endpoint responds to a real HTTP request', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, API_PORT: String(port), DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`http://127.0.0.1:${port}/health`);
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { 'x-correlation-id': 'runtime-request-1' },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-correlation-id'), 'runtime-request-1');
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'api');
    assert.equal(body.correlationId, 'runtime-request-1');
    assert.equal(body.dependencies.api, 'ok');
    assert.equal(body.dependencies.database, 'ok');
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
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

  throw lastError ?? new Error('health endpoint did not become ready');
}
