import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3512;
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

test('authenticated users get separate carts and persisted chat memory', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);
    const suffix = Date.now().toString(36);
    const userA = await postJson(`${baseUrl}/api/v1/auth/register`, { name: `memory_a_${suffix}`, password: `StrongPass_${suffix}` });
    const userB = await postJson(`${baseUrl}/api/v1/auth/register`, { name: `memory_b_${suffix}`, password: `StrongPass_${suffix}` });

    const unauthenticatedCart = await fetch(`${baseUrl}/api/v1/cart/current`);
    assert.equal(unauthenticatedCart.status, 401);

    const cartA = await postJson(`${baseUrl}/api/v1/cart/current/items`, { productId: 'prod_air_clean_p35', quantity: 1 }, userA.cookie);
    assert.equal(cartA.body.items.some((item) => item.productId === 'prod_air_clean_p35'), true);

    const removedCartA = await requestJson('DELETE', `${baseUrl}/api/v1/cart/current/items/prod_air_clean_p35`, undefined, userA.cookie);
    assert.equal(removedCartA.items.some((item) => item.productId === 'prod_air_clean_p35'), false);

    await postJson(`${baseUrl}/api/v1/cart/current/items`, { productId: 'prod_air_clean_p35', quantity: 1 }, userA.cookie);
    const clearedCartA = await requestJson('DELETE', `${baseUrl}/api/v1/cart/current/items`, undefined, userA.cookie);
    assert.equal(clearedCartA.items.length, 0);
    assert.equal(clearedCartA.grandTotal, 0);

    const cartB = await getJson(`${baseUrl}/api/v1/cart/current`, userB.cookie);
    assert.equal(cartB.items.some((item) => item.productId === 'prod_air_clean_p35'), false);

    const chat = await postJson(`${baseUrl}/api/v1/chat`, { message: 'TÆ° váº¥n 1 sáº£n pháº©m dÆ°á»›i 2tr' }, userA.cookie);
    assert.equal(typeof chat.body.messageId, 'string');

    const memoryRows = await countMemoryRows(userA.body.user.id);
    assert.equal(memoryRows.threadCount >= 1, true);
    assert.equal(memoryRows.messageCount >= 2, true);
    assert.equal(memoryRows.preferenceCount >= 1, true);
  } finally {
    child.kill('SIGTERM');
  }
});

async function countMemoryRows(userId) {
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  try {
    const [threadCount, messageCount, preferenceCount] = await Promise.all([
      prisma.chatThread.count({ where: { userId } }),
      prisma.chatMessage.count({ where: { thread: { userId } } }),
      prisma.userPreference.count({ where: { userId } }),
    ]);
    return { threadCount, messageCount, preferenceCount };
  } finally {
    await prisma.$disconnect();
  }
}

async function postJson(url, body, cookie = '') {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, 201, text);
  return {
    status: response.status,
    cookie: response.headers.get('set-cookie') ?? cookie,
    body: text ? JSON.parse(text) : {},
  };
}

async function getJson(url, cookie = '') {
  const response = await fetch(url, { headers: cookie ? { cookie } : {} });
  const text = await response.text();
  assert.equal(response.status, 200, text);
  return text ? JSON.parse(text) : {};
}

async function requestJson(method, url, body, cookie = '') {
  const response = await fetch(url, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json; charset=utf-8' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  assert.equal(response.status, 200, text);
  return text ? JSON.parse(text) : {};
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
