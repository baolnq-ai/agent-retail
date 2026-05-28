import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3201;
const baseUrl = `http://127.0.0.1:${port}`;

test('model gateway performs real runtime requests through the running API', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      API_PORT: String(port),
      DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
      CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
      CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
      EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);

    const health = await getJson(`${baseUrl}/model-gateway/health`);
    assert.deepEqual(health, { chat: 'ok', embedding: 'ok' });

    const suffix = Date.now().toString(36);
    const user = await postJsonWithCookie(`${baseUrl}/api/v1/auth/register`, { name: `gateway_ping_${suffix}`, password: `StrongPass_${suffix}` });
    const ping = await postJson(`${baseUrl}/api/v1/model-settings/ping`, {
      chatModelBaseUrl: 'https://replace-with-your-vllm-gateway.example.invalid',
      chatModelId: 'google/gemma-4-E4B-it',
      embedRerankBaseUrl: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
    }, user.cookie);
    assert.equal(ping.ok, true);
    for (const key of ['chatModels', 'chatCompletions', 'embedding', 'rerank']) {
      assert.equal(ping.checks[key].ok, true, JSON.stringify(ping.checks[key]));
      assert.equal(typeof ping.checks[key].endpoint, 'string');
    }

    const chat = await postJson(`${baseUrl}/model-gateway/chat`, { message: 'Tráº£ lá»i Ä‘Ãºng má»™t tá»«: á»•n' });
    assert.equal(typeof chat.content, 'string');
    assert.ok(chat.content.length > 0);
    assert.equal(typeof chat.model, 'string');

    const embeddings = await postJson(`${baseUrl}/model-gateway/embed`, {
      texts: ['mÃ¡y lá»c khÃ´ng khÃ­ cho phÃ²ng 25m2', 'chÃ­nh sÃ¡ch Ä‘á»•i tráº£'],
    });
    assert.equal(Array.isArray(embeddings), true);
    assert.equal(embeddings.length, 2);
    assert.equal(typeof embeddings[0][0], 'number');

    const reranked = await postJson(`${baseUrl}/model-gateway/rerank`, {
      query: 'mÃ¡y lá»c khÃ´ng khÃ­ cho phÃ²ng 25m2 dÆ°á»›i 4 triá»‡u',
      documents: [
        'MÃ¡y lá»c khÃ´ng khÃ­ phÃ¹ há»£p phÃ²ng 20-30m2, giÃ¡ 3.5 triá»‡u',
        'Ná»“i chiÃªn khÃ´ng dáº§u dung tÃ­ch 5L',
        'ChÃ­nh sÃ¡ch Ä‘á»•i tráº£ trong 7 ngÃ y',
      ],
    });
    assert.equal(Array.isArray(reranked), true);
    assert.equal(reranked[0].index, 0);
    assert.equal(typeof reranked[0].score, 'number');
  } finally {
    child.kill('SIGTERM');
  }
});

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.json();
}

async function postJson(url, body, cookie = '') {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, 201, text);
  return JSON.parse(text);
}

async function postJsonWithCookie(url, body, cookie = '') {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, 201, text);
  return {
    cookie: response.headers.get('set-cookie') ?? cookie,
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
