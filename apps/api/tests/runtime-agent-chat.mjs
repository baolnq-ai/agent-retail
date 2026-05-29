import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3501;
const baseUrl = `http://127.0.0.1:${port}`;

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

test('agent chat uses real LLM, hard catalog search, DB catalog, and cart context', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);
    const response = await postJson(`${baseUrl}/api/v1/chat`, {
      cartId: `agent-runtime-${Date.now()}`,
      message: 'Tôi cần máy lọc không khí cho phòng ngủ 25m2 dưới 4 triệu, có đổi trả không?',
    });

    assert.equal(typeof response.messageId, 'string');
    assert.equal(typeof response.model, 'string');
    assert.notEqual(response.model, 'safe-fallback');
    assert.equal(response.diagnostics.embeddingDimensions, 0);
    assert.equal(response.diagnostics.contextDocuments > 0, true);

    const textBlock = response.blocks.find((block) => block.type === 'text');
    assert.equal(typeof textBlock.content, 'string');
    assert.equal(textBlock.content.length > 20, true);
    assert.equal(/prod_[a-z0-9_]+/i.test(textBlock.content), false);

    const productBlock = response.blocks.find((block) => block.type === 'product_list');
    assert.equal(productBlock.items.some((product) => product.id === 'prod_air_clean_p35'), true);

    const policyBlock = response.blocks.find((block) => block.type === 'policy_answer');
    assert.equal(policyBlock.items.some((item) => item.id === 'policy_returns_7_days'), true);

    const budgetResponse = await postJson(`${baseUrl}/api/v1/chat`, {
      cartId: `agent-budget-${Date.now()}`,
      message: 'Tư vấn 1 sản phẩm dưới 2tr',
    });
    const budgetProductBlock = budgetResponse.blocks.find((block) => block.type === 'product_list');
    assert.equal(budgetProductBlock.items.length, 1);
    assert.equal(budgetProductBlock.items.every((product) => product.price <= 2_000_000), true);

    const suffix = Date.now().toString(36);
    const user = await postJsonWithCookie(`${baseUrl}/api/v1/auth/register`, { name: `agent_cart_${suffix}`, password: `StrongPass_${suffix}` });
    await postJsonWithCookie(`${baseUrl}/api/v1/cart/current/items`, { productId: budgetProductBlock.items[0].id, quantity: 1 }, user.cookie);

    const clearResponse = await postJsonWithCookie(`${baseUrl}/api/v1/chat`, { message: 'xoá hết sản phẩm trong giỏ' }, user.cookie);
    const cartBlock = clearResponse.body.blocks.find((block) => block.type === 'cart_summary');
    assert.equal(cartBlock.cart.items.length, 0);
    assert.equal(cartBlock.cart.grandTotal, 0);
    const clearTextBlock = clearResponse.body.blocks.find((block) => block.type === 'text');
    assert.match(clearTextBlock.content, /Đã xoá toàn bộ/);

    const currentCart = await getJson(`${baseUrl}/api/v1/cart/current`, user.cookie);
    assert.equal(currentCart.items.length, 0);

    const guestClearResponse = await postJson(`${baseUrl}/api/v1/chat`, { message: 'xoá hết sản phẩm trong giỏ' });
    const guestTextBlock = guestClearResponse.blocks.find((block) => block.type === 'text');
    assert.match(guestTextBlock.content, /cần đăng nhập/);
  } finally {
    child.kill('SIGTERM');
  }
});

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

async function getJson(url, cookie = '') {
  const response = await fetch(url, { headers: cookie ? { cookie } : {} });
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
