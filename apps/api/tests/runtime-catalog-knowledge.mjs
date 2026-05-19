import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3301;
const baseUrl = `http://127.0.0.1:${port}`;

test('catalog and knowledge APIs respond to real HTTP requests', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, API_PORT: String(port), DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(`${baseUrl}/health`);

    const products = await getJson(`${baseUrl}/api/v1/products`);
    assert.equal(products.items.length >= 100, true);
    assert.equal(products.items.some((product) => product.id === 'prod_chefmax_af55'), true);

    const search = await getJson(`${baseUrl}/api/v1/search/products?q=${encodeURIComponent('máy lọc không khí phòng 25m2 dưới 4 triệu')}`);
    assert.equal(search.items[0].id, 'prod_air_clean_p35');
    assert.equal(search.items[0].inventory, 42);

    const product = await getJson(`${baseUrl}/api/v1/products/prod_air_clean_p35`);
    assert.equal(product.title, 'Máy lọc không khí AiroClean P35');

    const policy = await getJson(`${baseUrl}/api/v1/knowledge/search?q=${encodeURIComponent('đổi trả 7 ngày')}`);
    assert.equal(policy.items[0].id, 'policy_returns_7_days');
    assert.equal(policy.items[0].trustLevel, 'official');
  } finally {
    child.kill('SIGTERM');
  }
});

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  assert.equal(response.status, 200, text);
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
