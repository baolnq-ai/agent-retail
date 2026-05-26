import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
const port = 43100 + Math.floor(Math.random() * 1000);

test('web runtime home page responds to a real HTTP request', async () => {
  const child = spawn(process.execPath, [nextCli, 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), API_BASE_URL: process.env.API_BASE_URL ?? 'http://127.0.0.1:7010' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let exited = false;
  child.once('exit', () => {
    exited = true;
  });

  try {
    await waitForHome(`http://127.0.0.1:${port}`, () => exited);
    const response = await fetch(`http://127.0.0.1:${port}`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /RetailHome/);
    assert.match(html, /Thiết bị gia dụng chọn lọc cho từng góc nhà/);
    assert.match(html, /Mua sắm ngay/);
    assert.match(html, /Sản phẩm/);
    assert.match(html, /Tài khoản/);
    assert.match(html, /Gợi ý nổi bật cho nhu cầu hằng ngày/);
    assert.match(html, /Chi tiết/);
    assert.match(html, /Trợ lý mua sắm/);
    assert.match(html, /commerce-header/);
    assert.match(html, /chat-launcher/);
    assert.doesNotMatch(html, /Giỏ hàng của bạn/);
  } finally {
    child.kill('SIGTERM');
  }
});

async function waitForHome(url, hasExited) {
  const deadline = Date.now() + 20000;
  let lastError;

  while (Date.now() < deadline) {
    if (hasExited()) {
      throw new Error('web app process exited before becoming ready');
    }

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
