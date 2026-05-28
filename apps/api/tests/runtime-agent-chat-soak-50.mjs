import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3630 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const reportUrl = new URL('../../../logs/planning/agent-pipeline/chat-soak-50-report.json', import.meta.url);

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: process.env.CHAT_MODEL_BASE_URL ?? 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: process.env.CHAT_MODEL_ID ?? 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: process.env.EMBED_RERANK_BASE_URL ?? 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

const PRODUCT_ID = 'prod_air_clean_p35';
const SECOND_PRODUCT_ID = 'prod_fresh_home_mini_20';

test('agent chat passes a 50-turn real request soak with pipeline output checks', async () => {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let apiExited = false;
  child.once('exit', () => {
    apiExited = true;
  });

  const results = [];
  try {
    await waitForHealth(`${baseUrl}/health`, () => apiExited);
    const suffix = Date.now().toString(36);
    const user = await postJsonWithCookie(`${baseUrl}/api/v1/auth/register`, {
      name: `soak_${suffix}`,
      password: `StrongPass_${suffix}`,
    });

    const cases = buildCases();
    for (let index = 0; index < cases.length; index += 1) {
      const testCase = cases[index];
      const startedAt = Date.now();
      try {
        const body = await postJson(`${baseUrl}/api/v1/chat`, { message: testCase.message }, user.cookie);
        const durationMs = Date.now() - startedAt;
        evaluateChatResponse(body, testCase, index + 1);
        results.push(toReportRow(testCase, body, durationMs, 'passed'));
      } catch (error) {
        results.push({ index: index + 1, name: testCase.name, message: testCase.message, status: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
      await writeReport({
        generatedAt: new Date().toISOString(),
        suite: 'agent-chat-soak-50',
        total: cases.length,
        completed: results.length,
        passed: results.filter((result) => result.status === 'passed').length,
        failed: results.filter((result) => result.status === 'failed').length,
        inProgress: results.length < cases.length,
        results,
      });
      console.log(`chat soak progress ${results.length}/${cases.length}: ${testCase.name} ${results.at(-1)?.status}`);
    }

    const passed = results.filter((result) => result.status === 'passed').length;
    await writeReport({ generatedAt: new Date().toISOString(), suite: 'agent-chat-soak-50', total: cases.length, completed: results.length, passed, failed: cases.length - passed, inProgress: false, results });
    assert.equal(passed, cases.length, `${passed}/${cases.length} chat soak cases passed. See ${reportUrl.pathname}`);
  } finally {
    child.kill('SIGTERM');
  }
}, { timeout: 600_000 });

function buildCases() {
  const recommendMessages = [
    'Tu van 2 may loc khong khi phong ngu 25m2 duoi 4 trieu',
    'Goi y san pham nha bep duoi 3 trieu de nau nhanh',
    'Tim robot hut bui hoac do ve sinh nha cua tam 3 trieu',
    'Can do cham soc ca nhan nho gon duoi 1 trieu',
    'De xuat thiet bi nha thong minh co gia mem',
    'Goi y quat hoac may lam mat phong 20m2',
    'Cho toi 3 san pham dang mua nhat duoi 2 trieu',
    'Tim san pham tiet kiem dien cho can ho nho',
    'Toi can qua tang gia dung duoi 1 trieu',
    'Goi y san pham ban chay va de dung',
  ];
  const productMessages = [
    `Thong tin chi tiet ${PRODUCT_ID}`,
    `So sanh ${PRODUCT_ID} voi ${SECOND_PRODUCT_ID}`,
    `San pham ${PRODUCT_ID} co hop phong ngu khong`,
    'May loc khong khi nao em nhat cho phong ngu',
    'Noi chien khong dau nao dung tich lon',
    'May hut bui nao hop nha co thu cung',
    'Camera thong minh nao de lap dat',
    'Ban co may loc khong khi duoi 2 trieu khong',
    'San pham ve sinh nha cua nao gia tot',
    'Thiet bi nha bep nao bao hanh tot',
  ];
  const policyMessages = [
    'Chinh sach doi tra nhu the nao',
    'Neu san pham loi nha san xuat thi xu ly sao',
    'Don da giao co sua doi san pham duoc khong',
    'Thoi gian hoan tien bao lau',
    'Co mien phi giao hang khong',
    'Toi can ho tro khieu nai ve don hang',
    'Hang bi loi thi lien he bo phan nao',
    'Bao hanh san pham tinh nhu the nao',
    'Chinh sach ho tro nguoi dung cua shop la gi',
    'Toi muon biet thong tin doanh nghiep va chinh sach mua hang',
  ];
  const cartMessages = [
    'Xem gio hang hien tai',
    `Them ${PRODUCT_ID} vao gio hang`,
    'Gio hang co san pham vua them khong va tong tien bao nhieu',
    `Tang so luong ${PRODUCT_ID} len 2`,
    'Tong tien gio hang hien tai la bao nhieu',
    `Giam so luong ${PRODUCT_ID} xuong 1`,
    `Xoa ${PRODUCT_ID} khoi gio hang`,
    'Kiem tra gio hang sau khi xoa',
    `Them ${SECOND_PRODUCT_ID} vao gio hang`,
    'Xem gio hang va de xuat them san pham phu hop',
  ];
  const followUpMessages = [
    'San pham vua de xuat luc nay la gi',
    'Cai do co nen mua khong',
    'Cho toi san pham gan giong nhung re hon',
    'Cai thu hai trong goi y co uu diem gi',
    'Them san pham do vao gio neu hop ly',
    'May pha espresso NASA Quantum Z9 co ban khong',
    'Neu khong dung san pham do thi co lua chon gan nhat nao',
    'Toi muon nhan tu van ngan gon, dung trong 3 cau',
    'Ban vua lam duoc gi trong pipeline nay',
    'Tong ket lai cac lua chon dang phu hop nhat',
  ];

  return [
    ...recommendMessages.map((message, index) => ({ name: `recommend-${index + 1}`, message, kind: 'product', expectedAgents: ['lead-agent', 'search-agent', 'recommendation-agent', 'sales-agent'] })),
    ...productMessages.map((message, index) => ({ name: `product-${index + 1}`, message, kind: 'product', expectedAgents: ['lead-agent', 'search-agent', 'sales-agent'] })),
    ...policyMessages.map((message, index) => ({ name: `policy-${index + 1}`, message, kind: 'policy', expectedAgents: ['lead-agent', 'rag-agent', 'sales-agent'] })),
    ...cartMessages.map((message, index) => ({ name: `cart-${index + 1}`, message, kind: 'cart', expectedAgents: ['lead-agent', 'cart-agent', 'sales-agent'] })),
    ...followUpMessages.map((message, index) => ({ name: `followup-${index + 1}`, message, kind: index === 5 ? 'fallback' : 'product', expectedAgents: ['lead-agent', 'storage-memory-agent', 'sales-agent'] })),
  ];
}

function evaluateChatResponse(response, testCase, index) {
  assert.equal(typeof response.messageId, 'string', `case ${index} messageId`);
  assert.equal(typeof response.model, 'string', `case ${index} model`);
  assert.notEqual(response.model, 'safe-fallback', `case ${index} should not use safe fallback`);
  assert.equal(Array.isArray(response.blocks), true, `case ${index} blocks`);

  const text = findBlock(response, 'text')?.content ?? '';
  assert.equal(text.length > 12, true, `case ${index} text too short`);
  assertNoInternalLeak(text, index);

  const productList = findBlock(response, 'product_list')?.items ?? [];
  const policyList = findBlock(response, 'policy_answer')?.items ?? [];
  const cart = findBlock(response, 'cart_summary')?.cart;

  if (testCase.kind === 'product') {
    assert.equal(productList.length > 0, true, `case ${index} expected product rail`);
    assertNoProductContradiction(text, index);
  }
  if (testCase.kind === 'policy') {
    assert.equal(policyList.length > 0 || productList.length === 0, true, `case ${index} policy should use policy or avoid unrelated products`);
  }
  if (testCase.kind === 'cart') {
    assert.equal(Boolean(cart), true, `case ${index} expected cart summary`);
  }
  if (testCase.kind === 'fallback' && productList.length > 0) {
    assert.match(normalizeText(text), /khong.*chinh xac|chua.*chinh xac|gan.*nhat|tuong tu|lien quan/, `case ${index} semantic fallback must be worded as fallback`);
  }

  assertTrace(response.trace, testCase, index);
}

function assertNoInternalLeak(text, index) {
  assert.equal(/```|Recommendation-agent handoff|shouldShowProducts|presentationIntent|mustMentionProductIds|sourceAgent|stack trace|TypeError|PrismaClient|prod_[a-z0-9_]+/i.test(text), false, `case ${index} leaked internal/code text: ${text}`);
}

function assertNoProductContradiction(text, index) {
  const normalized = normalizeText(text);
  assert.equal(/khong co san pham phu hop de hien thi|chua co san pham phu hop de hien thi|chon lai san pham trong khung goi y|khong the tra loi chac chan theo du lieu hien co/.test(normalized), false, `case ${index} product rail contradiction: ${text}`);
}

function assertTrace(trace, testCase, index) {
  assert.equal(Boolean(trace), true, `case ${index} trace missing`);
  assert.equal(Array.isArray(trace.agents), true, `case ${index} trace agents`);
  assert.equal(Array.isArray(trace.nodes), true, `case ${index} trace nodes`);
  assert.equal(Array.isArray(trace.graphEdges), true, `case ${index} trace graphEdges`);
  assert.equal(Array.isArray(trace.playbackEvents), true, `case ${index} trace playbackEvents`);
  assert.equal(trace.nodes.length > 0, true, `case ${index} trace nodes empty`);
  assert.equal(trace.graphEdges.length > 0, true, `case ${index} trace graph edges empty`);
  assert.equal(trace.playbackEvents.length > 0, true, `case ${index} trace playback empty`);
  for (const agent of testCase.expectedAgents) {
    assert.equal(trace.agents.includes(agent), true, `case ${index} missing expected agent ${agent}`);
  }
}

function toReportRow(testCase, response, durationMs, status) {
  const productList = findBlock(response, 'product_list')?.items ?? [];
  const policyList = findBlock(response, 'policy_answer')?.items ?? [];
  const cart = findBlock(response, 'cart_summary')?.cart;
  const text = findBlock(response, 'text')?.content ?? '';
  return {
    name: testCase.name,
    message: testCase.message,
    status,
    durationMs,
    model: response.model,
    textLength: text.length,
    productIds: productList.map((product) => product.id),
    policyIds: policyList.map((item) => item.id),
    cartItemCount: cart?.items?.length ?? 0,
    agents: response.trace?.agents ?? [],
    playbackEventCount: response.trace?.playbackEvents?.length ?? 0,
    errorCount: response.trace?.errors?.length ?? 0,
  };
}

function findBlock(response, type) {
  return response.blocks.find((block) => block.type === type);
}

function normalizeText(value) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Ä‘/g, 'd');
}

async function postJson(url, body, cookie = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  try {
    const text = await response.text();
    assert.equal(response.status, 201, text);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
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

async function waitForHealth(url, hasExited) {
  const deadline = Date.now() + 20_000;
  let lastError;

  while (Date.now() < deadline) {
    if (hasExited()) throw new Error('API process exited before ready');
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

async function writeReport(report) {
  await mkdir(new URL('.', reportUrl), { recursive: true });
  await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
