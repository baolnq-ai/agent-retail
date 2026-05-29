import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
const webPort = 45200 + Math.floor(Math.random() * 1000);
const apiPort = 3620;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

const env = {
  ...process.env,
  API_PORT: String(apiPort),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: process.env.CHAT_MODEL_BASE_URL ?? 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: process.env.CHAT_MODEL_ID ?? 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: process.env.EMBED_RERANK_BASE_URL ?? 'https://replace-with-your-embed-rerank-gateway.example.invalid',
  QDRANT_URL: process.env.QDRANT_URL ?? 'http://localhost:6333',
};

test('commerce web routes render against a real API server', async () => {
  const api = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('../../api', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const web = spawn(process.execPath, [nextCli, 'start', '-H', '127.0.0.1', '-p', String(webPort)], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(webPort),
      API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let apiExited = false;
  let webExited = false;
  api.once('exit', () => {
    apiExited = true;
  });
  web.once('exit', () => {
    webExited = true;
  });

  try {
    await waitFor(`${apiBaseUrl}/health`, () => apiExited, 'api');
    await waitFor(`${webBaseUrl}`, () => webExited, 'web');

    const productPayload = await getJson(`${apiBaseUrl}/api/v1/products`);
    assert.equal(productPayload.items.length > 0, true);
    const productId = productPayload.items[0].id;

    await assertRoute('/', [/RetailHome/, /Mua sắm ngay/, /Sản phẩm/]);
    await assertRoute('/products', [/Danh mục sản phẩm/, /Danh sách sản phẩm/, new RegExp(escapeRegex(productPayload.items[0].title.slice(0, 12)))]);
    await assertRoute(`/products/${productId}`, [/Chi tiết/, /Thêm vào giỏ|Đăng nhập để thêm giỏ/]);
    await assertRoute('/cart', [/cart-page-shell/, /Đang tải giỏ hàng|Giỏ hàng/, /initialProducts/]);
    await assertRoute('/account', [/account-auth-page/, /Đang kiểm tra phiên đăng nhập|Tài khoản/, /AccountClient/]);
    await assertRoute('/test-api', [/Model|API|Endpoint|Provider|Kiểm tra/]);
    await assertRoute('/agent-settings', [/Model|API|Endpoint|Provider|Kiểm tra/]);
    await assertRoute('/agent-dashboard?demoTrace=dense', [/agent-dashboard-shell|Agent Ops|Dashboard agent/]);
  } finally {
    web.kill('SIGTERM');
    api.kill('SIGTERM');
  }

  async function assertRoute(path, patterns) {
    const response = await fetch(`${webBaseUrl}${path}`);
    const html = await response.text();
    assert.equal(response.status, 200, `${path} status ${response.status}: ${html.slice(0, 200)}`);
    for (const pattern of patterns) assert.match(html, pattern, `${path} missing ${pattern}`);
  }
});

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  assert.equal(response.status, 200, text);
  return JSON.parse(text);
}

async function waitFor(url, hasExited, name) {
  const deadline = Date.now() + 25000;
  let lastError;
  while (Date.now() < deadline) {
    if (hasExited()) throw new Error(`${name} process exited before ready`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error(`${name} did not become ready`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
