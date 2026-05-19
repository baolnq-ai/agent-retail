import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3401;
const baseUrl = `http://127.0.0.1:${port}`;
const cartId = `runtime-cart-${Date.now()}`;
const orderKey = `order-key-${Date.now()}`;
const paymentKey = `payment-key-${Date.now()}`;

test('cart order payment runtime flow works with idempotency', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, API_PORT: String(port), DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);

    const cart = await postJson(`${baseUrl}/api/v1/cart/${cartId}/items`, { productId: 'prod_air_clean_p35', quantity: 1 });
    assert.equal(cart.items.length, 1);
    assert.equal(cart.grandTotal, 3490000);

    const orderOne = await postJson(`${baseUrl}/api/v1/orders`, { cartId }, { 'idempotency-key': orderKey });
    const orderTwo = await postJson(`${baseUrl}/api/v1/orders`, { cartId }, { 'idempotency-key': orderKey });
    assert.equal(orderOne.id, orderTwo.id);
    assert.equal(orderOne.status, 'pending_confirmation');

    const confirmedOrder = await postJson(`${baseUrl}/api/v1/orders/${orderOne.id}/confirm`, {});
    assert.equal(confirmedOrder.status, 'confirmed');

    const paymentOne = await postJson(`${baseUrl}/api/v1/payments/intents`, { orderId: orderOne.id }, { 'idempotency-key': paymentKey });
    const paymentTwo = await postJson(`${baseUrl}/api/v1/payments/intents`, { orderId: orderOne.id }, { 'idempotency-key': paymentKey });
    assert.equal(paymentOne.id, paymentTwo.id);
    assert.equal(paymentOne.provider, 'mock');
    assert.equal(paymentOne.amount, 3490000);
  } finally {
    child.kill('SIGTERM');
  }
});

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
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
