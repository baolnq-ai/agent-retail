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
      CHAT_MODEL_BASE_URL: process.env.CHAT_MODEL_BASE_URL ?? 'https://replace-with-your-vllm-gateway.example.invalid',
      CHAT_MODEL_ID: process.env.CHAT_MODEL_ID ?? 'google/gemma-4-E4B-it',
      EMBED_RERANK_BASE_URL: process.env.EMBED_RERANK_BASE_URL ?? 'https://replace-with-your-embed-rerank-gateway.example.invalid',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);

    const health = await getJson(`${baseUrl}/model-gateway/health`);
    assert.deepEqual(health, { chat: 'ok', embedding: 'ok' });

    const chat = await postJson(`${baseUrl}/model-gateway/chat`, { message: 'Trả lời đúng một từ: ổn' });
    assert.equal(typeof chat.content, 'string');
    assert.ok(chat.content.length > 0);
    assert.equal(typeof chat.model, 'string');

    const embeddings = await postJson(`${baseUrl}/model-gateway/embed`, {
      texts: ['máy lọc không khí cho phòng 25m2', 'chính sách đổi trả'],
    });
    assert.equal(Array.isArray(embeddings), true);
    assert.equal(embeddings.length, 2);
    assert.equal(typeof embeddings[0][0], 'number');

    const reranked = await postJson(`${baseUrl}/model-gateway/rerank`, {
      query: 'máy lọc không khí cho phòng 25m2 dưới 4 triệu',
      documents: [
        'Máy lọc không khí phù hợp phòng 20-30m2, giá 3.5 triệu',
        'Nồi chiên không dầu dung tích 5L',
        'Chính sách đổi trả trong 7 ngày',
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, 201, text);
  return JSON.parse(text);
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
