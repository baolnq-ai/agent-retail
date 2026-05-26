import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const layoutSource = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const shellSource = await readFile(new URL('../src/app/app-shell.tsx', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const clientSource = await readFile(new URL('../src/app/retail-client.tsx', import.meta.url), 'utf8');
const productsPageSource = await readFile(new URL('../src/app/products/page.tsx', import.meta.url), 'utf8');
const productDetailSource = await readFile(new URL('../src/app/products/[id]/page.tsx', import.meta.url), 'utf8');
const cartPageSource = await readFile(new URL('../src/app/cart/page.tsx', import.meta.url), 'utf8');
const cartClientSource = await readFile(new URL('../src/app/cart/cart-client.tsx', import.meta.url), 'utf8');
const accountPageSource = await readFile(new URL('../src/app/account/page.tsx', import.meta.url), 'utf8');
const accountClientSource = await readFile(new URL('../src/app/account/account-client.tsx', import.meta.url), 'utf8');
const addToCartSource = await readFile(new URL('../src/app/add-to-cart-button.tsx', import.meta.url), 'utf8');
const agentSettingsSource = await readFile(new URL('../src/app/agent-settings/agent-settings-client.tsx', import.meta.url), 'utf8');
const testApiPageSource = await readFile(new URL('../src/app/test-api/page.tsx', import.meta.url), 'utf8');
const browserApiSource = await readFile(new URL('../src/app/browser-api-base-url.ts', import.meta.url), 'utf8');

test('frontend shell exposes commerce, account, chat, and API testing flows', () => {
  assert.match(layoutSource, /<AppShell>/);
  assert.match(shellSource, /RetailChatWidget/);
  assert.match(shellSource, /resolveBrowserApiBaseUrl/);
  assert.match(shellSource, /api\/v1\/auth\/me/);
  assert.match(shellSource, /api\/v1\/cart\/current/);
  assert.match(shellSource, /href="\/products"/);
  assert.match(shellSource, /href="\/cart"/);
  assert.match(shellSource, /href="\/account"/);
  assert.doesNotMatch(shellSource, /⌘|◒|◎/);
  assert.match(shellSource, /retail-cart-changed/);

  assert.doesNotMatch(pageSource, /RetailChatWidget/);
  assert.doesNotMatch(pageSource, /commerce-header/);
  assert.doesNotMatch(productsPageSource, /commerce-header/);
  assert.doesNotMatch(productDetailSource, /commerce-header/);
  assert.match(pageSource, /storefront-hero/);
  assert.match(pageSource, /Mua sắm ngay/);
  assert.match(pageSource, /productImageUrl/);
  assert.match(pageSource, /product-popover/);

  assert.match(clientSource, /Trợ lý mua sắm/);
  assert.match(clientSource, /chat-widget/);
  assert.match(clientSource, /chat-launcher/);
  assert.match(clientSource, /Dashboard/);
  assert.match(clientSource, /\/agent-dashboard/);
  assert.doesNotMatch(clientSource, /⌁|⌫/);
  assert.match(clientSource, /api\/v1\/chat\/stream/);
  assert.match(clientSource, /api\/v1\/cart\/current\/items/);
  assert.doesNotMatch(clientSource, /api\/v1\/cart\/\$\{cart\.id\}\/items/);
  assert.doesNotMatch(pageSource + clientSource + shellSource, /web-demo-cart/);

  assert.match(productsPageSource, /AddToCartButton/);
  assert.match(productDetailSource, /AddToCartButton/);
  assert.match(addToCartSource, /credentials: 'include'/);
  assert.match(addToCartSource, /resolveBrowserApiBaseUrl/);
  assert.match(addToCartSource, /retail-cart-changed/);
  assert.match(cartPageSource, /CartClient/);
  assert.match(cartClientSource, /resolveBrowserApiBaseUrl/);
  assert.match(cartClientSource, /Giỏ hàng theo tài khoản/);
  assert.match(cartClientSource, /api\/v1\/cart\/current\/items/);

  assert.match(accountPageSource, /AccountClient/);
  assert.match(accountClientSource, /cookie HttpOnly/);
  assert.match(accountClientSource, /pattern="\[a-z0-9_\]\{3,32\}"/);
  assert.match(accountClientSource, /linh_home/);
  assert.match(accountClientSource, /translateAuthError/);
  assert.match(accountClientSource, /verifiedSession/);
  assert.match(accountClientSource, /resolveBrowserApiBaseUrl/);
  assert.match(accountClientSource, /api\/v1\/auth\/me/);
  assert.match(accountClientSource, /Đăng xuất/);

  assert.match(testApiPageSource, /AgentSettingsClient/);
  assert.match(browserApiSource, /window\.location\.hostname/);
  assert.match(browserApiSource, /localApiHosts/);
  assert.match(agentSettingsSource, /api\/v1\/model-settings/);
  assert.match(agentSettingsSource, /api\/v1\/model-settings\/ping/);
  assert.match(agentSettingsSource, /GET \/v1\/models/);
  assert.match(agentSettingsSource, /POST \/v1\/chat\/completions/);
  assert.match(agentSettingsSource, /POST \/api\/v1\/embed/);
  assert.match(agentSettingsSource, /POST \/api\/v1\/rerank/);
});
