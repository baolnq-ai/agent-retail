import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3511;
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

test('auth registers, logs in, reads session, and logs out with httpOnly cookie', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);
    const suffix = Date.now().toString(36);
    const name = `user_${suffix}`;
    const password = `StrongPass_${suffix}`;

    const registered = await postJson(`${baseUrl}/api/v1/auth/register`, { name, password });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.name, name);
    assert.match(registered.cookie, /retail_session=/);
    assert.match(registered.cookie, /HttpOnly/);

    const me = await getJson(`${baseUrl}/api/v1/auth/me`, registered.cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, name);

    const duplicate = await postJson(`${baseUrl}/api/v1/auth/register`, { name, password });
    assert.equal(duplicate.status, 409);

    const badLogin = await postJson(`${baseUrl}/api/v1/auth/login`, { name, password: 'wrong-password' });
    assert.equal(badLogin.status, 401);

    const login = await postJson(`${baseUrl}/api/v1/auth/login`, { name, password });
    assert.equal(login.status, 201);
    assert.match(login.cookie, /retail_session=/);

    const logout = await postJson(`${baseUrl}/api/v1/auth/logout`, {}, login.cookie);
    assert.equal(logout.status, 201);
    assert.match(logout.cookie, /Max-Age=0/);

    const afterLogout = await getJson(`${baseUrl}/api/v1/auth/me`, login.cookie);
    assert.equal(afterLogout.status, 401);
  } finally {
    child.kill('SIGTERM');
  }
});

async function postJson(url, body, cookie) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    cookie: response.headers.get('set-cookie') ?? '',
    body: text ? JSON.parse(text) : {},
  };
}

async function getJson(url, cookie) {
  const response = await fetch(url, { headers: cookie ? { cookie } : {} });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  };
}

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
