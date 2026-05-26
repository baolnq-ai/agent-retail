import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
const port = 44100 + Math.floor(Math.random() * 1000);

test('agent dashboard route responds in a production server', async () => {
  const child = spawn(process.execPath, [nextCli, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:7010' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let exited = false;
  child.once('exit', () => {
    exited = true;
  });

  try {
    await waitForRoute(`http://127.0.0.1:${port}/agent-dashboard`, () => exited);
    const response = await fetch(`http://127.0.0.1:${port}/agent-dashboard`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Dashboard agent|Agent Ops|agent-dashboard-shell/);
  } finally {
    child.kill('SIGTERM');
  }
});

async function waitForRoute(url, hasExited) {
  const deadline = Date.now() + 20000;
  let lastError;

  while (Date.now() < deadline) {
    if (hasExited()) throw new Error('web app process exited before becoming ready');

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error('web app did not become ready');
}
