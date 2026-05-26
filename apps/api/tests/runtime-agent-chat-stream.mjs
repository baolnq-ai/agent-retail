import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3507;
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

test('agent chat stream emits status, token, and final events', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);
    const response = await fetch(`${baseUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        cartId: `agent-stream-${Date.now()}`,
        message: 'So sánh máy lọc không khí phòng 25m2 dưới 4 triệu và chính sách đổi trả.',
      }),
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/x-ndjson/);

    const events = await readNdjson(response);
    assert.equal(events.some((event) => event.type === 'status'), true);
    assert.equal(events.some((event) => event.type === 'token' && event.content.length > 0), true);
    const finalEvent = events.find((event) => event.type === 'final');
    assert.equal(Boolean(finalEvent), true);
    assert.notEqual(finalEvent.response.model, 'safe-fallback');
    const textBlock = finalEvent.response.blocks.find((block) => block.type === 'text');
    assert.equal(/prod_[a-z0-9_]+/i.test(textBlock.content), false);
    const productBlock = finalEvent.response.blocks.find((block) => block.type === 'product_list');
    assert.equal(productBlock.items.length > 0, true);
  } finally {
    child.kill('SIGTERM');
  }
});

async function readNdjson(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) events.push(JSON.parse(line));
    }
  }
  if (buffer.trim()) events.push(JSON.parse(buffer));

  return events;
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
