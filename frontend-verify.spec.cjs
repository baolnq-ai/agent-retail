const { test, chromium } = require('@playwright/test');

test('frontend runtime verification', async () => {
  const baseUrl = 'http://127.0.0.1:7000';
  const shotsDir = 'C:/Users/Admin/AppData/Local/Temp/claude/frontend-shots';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  async function shot(name) { await page.screenshot({ path: `${shotsDir}/${name}.png`, fullPage: true }); }
  async function goto(path) { await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); }

  await goto('/account');
  await shot('01-account-initial');
  const accountHero = await page.locator('.account-auth-copy').boundingBox();
  const accountBenefits = await page.locator('.account-benefits').boundingBox();

  const user = `test${Date.now()}`;
  await page.getByLabel('Tên đăng nhập').fill(user);
  await page.getByLabel('Mật khẩu').fill('password123');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await page.waitForTimeout(1500);
  await shot('02-account-authenticated');
  const accountText = await page.locator('body').innerText();

  await goto('/agent-settings');
  await shot('03-agent-settings');
  const settingsText = await page.locator('body').innerText();

  await goto('/agent-dashboard');
  await shot('04-agent-dashboard-empty');
  const dashboardText = await page.locator('body').innerText();

  await goto('/');
  await page.getByRole('button', { name: /Trợ lý mua sắm/ }).click();
  await page.getByLabel('Nhập câu hỏi cho trợ lý').fill('Gợi ý máy lọc không khí dưới 5 triệu');
  await page.getByRole('button', { name: 'Gửi' }).click();
  await page.waitForTimeout(12000);
  await shot('05-chat-after-message');
  const chatText = await page.locator('.chat-widget').innerText().catch(() => 'NO_CHAT_WIDGET');

  await goto('/agent-dashboard');
  await shot('06-agent-dashboard-after-chat');
  const dashboardAfterChatText = await page.locator('body').innerText();

  await browser.close();
  console.log(JSON.stringify({ accountHero, accountBenefits, accountText: accountText.slice(0, 1000), settingsHasCorrectModel: settingsText.includes('google/gemma-4-E4B-it'), settingsHasPlaceholder: settingsText.includes('replace-with-your-chat-model-id'), dashboardText: dashboardText.slice(0, 1000), dashboardAfterChatText: dashboardAfterChatText.slice(0, 1000), chatText: chatText.slice(0, 1600), consoleErrors, screenshots: [`${shotsDir}/01-account-initial.png`, `${shotsDir}/02-account-authenticated.png`, `${shotsDir}/03-agent-settings.png`, `${shotsDir}/04-agent-dashboard-empty.png`, `${shotsDir}/05-chat-after-message.png`, `${shotsDir}/06-agent-dashboard-after-chat.png`] }, null, 2));
});
