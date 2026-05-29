import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 3830 + Math.floor(Math.random() * 200);
const baseUrl = `http://127.0.0.1:${port}`;
const reportUrl = new URL('../../../logs/planning/agent-pipeline/chat-soak-100-report.json', import.meta.url);

const env = {
  ...process.env,
  API_PORT: String(port),
  DATABASE_URL: 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public',
  CHAT_MODEL_BASE_URL: process.env.CHAT_MODEL_BASE_URL ?? 'https://replace-with-your-vllm-gateway.example.invalid',
  CHAT_MODEL_ID: process.env.CHAT_MODEL_ID ?? 'google/gemma-4-E4B-it',
  EMBED_RERANK_BASE_URL: process.env.EMBED_RERANK_BASE_URL ?? 'https://replace-with-your-embed-rerank-gateway.example.invalid',
};

const PRODUCT_A = 'prod_air_clean_p35';
const PRODUCT_B = 'prod_fresh_home_mini_20';
const PRODUCT_C = 'prod_kitchen_air_fryer_family';

test('agent chat passes a 100-turn realistic user soak with grounded pipeline checks', async () => {
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
      name: `soak100_${suffix}`,
      password: `StrongPass_${suffix}`,
    });

    const cases = buildCases();
    for (let index = 0; index < cases.length; index += 1) {
      const testCase = cases[index];
      const startedAt = Date.now();
      let response;
      try {
        response = await postJson(`${baseUrl}/api/v1/chat`, { message: testCase.message }, user.cookie);
        const durationMs = Date.now() - startedAt;
        evaluateChatResponse(response, testCase, index + 1);
        results.push(toReportRow(testCase, response, durationMs, 'passed'));
      } catch (error) {
        results.push({
          index: index + 1,
          name: testCase.name,
          message: testCase.message,
          kind: testCase.kind,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          snapshot: error?.snapshot ?? (response ? buildFailureSnapshot(response) : undefined),
        });
      }
      await writeSoakReport(cases, results, true);
      console.log(`chat soak 100 progress ${results.length}/${cases.length}: ${testCase.name} ${results.at(-1)?.status}`);
    }

    const passed = results.filter((result) => result.status === 'passed').length;
    await writeSoakReport(cases, results, false);
    assert.equal(passed, cases.length, `${passed}/${cases.length} chat soak cases passed. See ${reportUrl.pathname}`);
  } finally {
    child.kill('SIGTERM');
  }
}, { timeout: 1_800_000 });

function buildCases() {
  const opening = [
    product('recommend-01', 'Phong ngu 25m2 hoi bui, goi y 2 may loc khong khi duoi 4 trieu nhe'),
    product('recommend-02', 'Nha co em be, minh can san pham nao chay em va de ve sinh?'),
    product('detail-01', `Cho minh xem nhanh thong tin ${PRODUCT_A}, co hop phong ngu khong?`),
    cart('cart-01', `Them ${PRODUCT_A} vao gio giup minh`),
    cart('cart-02', 'Gio hang luc nay co dung may loc khong khi vua them khong, tong bao nhieu?'),
    product('compare-01', `So sanh ${PRODUCT_A} voi ${PRODUCT_B}, noi ngan gon de minh chon`),
    product('followup-product-01', 'Cai re hon trong 2 cai do co du yeu cho phong nho khong?'),
    policy('policy-01', 'Neu mua ve ma loi do nha san xuat thi doi tra the nao?'),
    cart('cart-03', `Tang ${PRODUCT_A} len 2 cai trong gio hang`),
    cart('cart-04', 'Tinh lai tong tien gio hang hien tai cho minh'),
  ];

  const mixed = [
    product('search-01', 'Tim noi chien khong dau dung tich lon cho gia dinh 4 nguoi'),
    product('search-02', 'May hut bui nao hop nha co thu cung va long toc nhieu?'),
    product('search-03', 'Co camera thong minh nao lap nhanh ma gia khong qua cao khong?'),
    product('search-04', 'Tu van thiet bi nha thong minh gia mem cho can ho moi thue'),
    product('search-05', 'Minh can quat hoac may lam mat cho phong 20m2, uu tien tiet kiem dien'),
    product('search-06', 'San pham cham soc ca nhan nao gon nhe mang di du lich?'),
    product('search-07', 'Goi y qua tang gia dung duoi 1 trieu nhin lich su mot chut'),
    product('search-08', 'May loc khong khi nao em nhat luc ngu?'),
    product('search-09', 'San pham ve sinh nha cua nao dang gia tot?'),
    product('search-10', 'Thiet bi nha bep nao bao hanh tot va de dung?'),
    policy('policy-02', 'Don da giao roi thi minh co doi san pham khac duoc nua khong?'),
    policy('policy-03', 'Hoan tien thuong mat bao lau moi ve tai khoan?'),
    policy('policy-04', 'RetailHome co mien phi giao hang trong truong hop nao?'),
    policy('policy-05', 'Minh muon khieu nai don hang bi giao thieu phu kien'),
    policy('policy-06', 'Bao hanh tinh tu ngay mua hay ngay nhan hang?'),
    smalltalk('scope-01', 'Ban lam duoc nhung viec gi trong cua hang nay?'),
    product('fallback-01', 'May pha espresso NASA Quantum Z9 co ban khong, neu khong thi goi y cai gan nhat'),
    product('fallback-02', 'Toi tim robot lau kinh bay tu dong, shop co khong? Neu khong co thi san pham ve sinh nao gan nhat?'),
    product('recommend-03', 'Cho toi 3 san pham dang mua nhat duoi 2 trieu, dung cho can ho nho'),
    product('followup-product-02', 'Trong may cai do, cai nao tiet kiem dien nhat?'),
    cart('cart-05', 'Them san pham vua phu hop nhat vao gio neu tim duoc'),
    cart('cart-06', 'Kiem tra gio hang dang co nhung gi'),
    cart('cart-07', `Giam so luong ${PRODUCT_A} xuong 1 neu dang co 2 cai`),
    cart('cart-08', `Them ${PRODUCT_B} vao gio hang nua`),
    cart('cart-09', `Xoa ${PRODUCT_A} khoi gio hang, de lai cac mon khac`),
    cart('cart-10', 'Sau khi xoa, gio hang con mon nao va tong tien bao nhieu?'),
    product('recommend-04', 'Goi y them mon di kem voi gio hang hien tai de nha sach hon'),
    policy('policy-07', 'Neu san pham bi vo khi van chuyen thi xu ly voi ai?'),
    product('search-11', 'Minh can may loc khong khi duoi 2 trieu, neu khong co thi gan muc do cung duoc'),
    product('search-12', 'Noi chien khong dau nao it mui dau va de rua?'),
  ];

  const realisticBank = [
    product('bank-01', 'Nha minh 60m2, muon mua do lam sach khong khi va hut bui, uu tien de dung cho bo me'),
    product('bank-02', 'Can do nha bep nhanh gon cho nguoi moi song mot minh, tam 2-3 trieu'),
    product('bank-03', 'Shop co san pham nao hop phong tre em, it on va an toan khong?'),
    product('bank-04', 'May lam mat nao khong qua to, de ke goc phong ngu?'),
    product('bank-05', 'Minh thich hang tiet kiem dien, co mon nao dang nen mua khong?'),
    product('bank-06', 'Co thiet bi nao giup nha bot am mui sau khi nau an khong?'),
    product('bank-07', 'Gia duoi 1 trieu thi co mon gia dung nao dung hang ngay khong?'),
    product('bank-08', 'Neu mua cho nguoi lon tuoi thi nen chon san pham nao thao tac don gian?'),
    product('bank-09', 'Can 2 lua chon ve sinh nha cua, mot re mot tot hon de so sanh'),
    product('bank-10', 'San pham nao trong muc 3 trieu co cam giac dang tien nhat?'),
    product('bank-11', 'Minh co phong bep nho, can mon nao khong chiem dien tich'),
    product('bank-12', 'Tim giup minh do cham soc ca nhan co the tang sinh nhat'),
    product('bank-13', 'May loc khong khi P35 con hang khong va gia bao nhieu?'),
    product('bank-14', 'Fresh Home Mini 20 khac gi voi may loc khong khi lon hon?'),
    product('bank-15', `Noi ro uu nhuoc diem cua ${PRODUCT_C}`),
    product('bank-16', 'Dung cho nha co meo thi robot hut bui nao on?'),
    product('bank-17', 'Co san pham nao vua lam mat vua khong qua on khong?'),
    product('bank-18', 'Tu van nhanh cho minh mot combo phong ngu sach va de ngu hon'),
    product('bank-19', 'Minh muon mua mot mon truoc, nen uu tien cai nao?'),
    product('bank-20', 'Co lua chon nao re hon san pham vua noi khong?'),
    policy('bank-21', 'Neu hang giao den khong dung mau hoac model thi shop xu ly sao?'),
    policy('bank-22', 'Can giay to gi de bao hanh san pham?'),
    policy('bank-23', 'Chinh sach ho tro nguoi dung cua RetailHome gom nhung kenh nao?'),
    policy('bank-24', 'Thong tin doanh nghiep cua shop co trong he thong khong?'),
    policy('bank-25', 'Neu minh huy don truoc khi giao thi co mat phi khong?'),
    smalltalk('bank-26', 'Tra loi ngan gon thoi nha, dung lan man'),
    smalltalk('bank-27', 'Noi lai bang giong tu van ban hang de hieu hon'),
    smalltalk('bank-28', 'Dung hien code hay may dong noi bo trong cau tra loi nha'),
    product('bank-29', 'Luc nay ban co de xuat san pham nao phu hop phong ngu khong?'),
    product('bank-30', 'Cai vua nhac den co nen mua chung voi mon nao khac?'),
    cart('bank-31', `Them ${PRODUCT_C} vao gio de minh can nhac`),
    cart('bank-32', 'Xem gio hang va noi mon nao dang dat nhat'),
    cart('bank-33', `Neu ${PRODUCT_B} dang trong gio thi tang len 2 cai`),
    cart('bank-34', 'Tong tien sau khi tang so luong la bao nhieu?'),
    cart('bank-35', 'Xoa het may loc khong khi trong gio, neu co'),
    cart('bank-36', 'Gio hang con bao nhieu san pham sau khi xoa?'),
    cart('bank-37', `Them lai ${PRODUCT_A} vao gio`),
    cart('bank-38', 'Mon vua them co nam trong gio chua?'),
    cart('bank-39', 'Cho minh xem tong ket gio hang hien tai'),
    product('bank-40', 'Tu gio hang hien tai, goi y them phu kien hoac san pham phu hop'),
    product('bank-41', 'Khong can qua dat, loc lai san pham duoi 2 trieu'),
    product('bank-42', 'Neu uu tien ben va bao hanh thi nen chon gi?'),
    product('bank-43', 'Toi can san pham de don nha truoc Tet, de su dung nhanh'),
    product('bank-44', 'May hut bui DustAway One co khac HomeSweep Mop Max 2 nhieu khong?'),
    product('bank-45', 'De xuat 2 san pham cho nha chung cu co ban cong nho'),
    product('bank-46', 'San pham nao trong khung goi y hop gia dinh co tre nho nhat?'),
    product('bank-47', 'Neu minh chi mua 1 mon trong hom nay thi nen chon cai nao va vi sao?'),
    product('bank-48', 'Cho them lua chon khac cung nhom nhung gia mem hon'),
    policy('bank-49', 'Mua online thi nhan hoa don hay xac nhan don nhu the nao?'),
    smalltalk('bank-50', 'Tom tat lai nhung gi ban da lam cho minh tu dau cuoc chat'),
    product('bank-51', 'Goi y cuoi cung 3 mon dang hop voi nhu cau cua minh nhat'),
    cart('bank-52', 'Neu gio hang dang co mon nao khong hop nhu cau thi noi minh biet'),
    product('bank-53', 'Tim san pham dung cho phong lam viec nho, can yen tinh'),
    product('bank-54', 'Mon nao co gia tot nhung van du dung hang ngay?'),
    product('bank-55', 'Goi y san pham gan voi thoi quen minh vua noi trong chat nay'),
    product('bank-56', 'Neu khong con hang thi hay noi ro va dua lua chon thay the gan nhat'),
    smalltalk('bank-57', 'Cau hoi ngoai le: thoi tiet hom nay the nao? Hay neu khong ho tro thi noi dung pham vi'),
    policy('bank-58', 'Neu can lien he ho tro khach hang thi minh nen lam gi?'),
    product('bank-59', 'San pham vua de xuat co phu hop lam qua tang tan gia khong?'),
    cart('bank-60', 'Chot lai gio hang hien tai va tong tien de minh quyet dinh'),
  ];

  const shuffledBank = shuffle(realisticBank, 20260522);
  return [...opening, ...mixed, ...shuffledBank].slice(0, 100);
}

function product(name, message) {
  return { name, message, kind: 'product', expectedAgents: ['lead-agent', 'search-agent', 'sales-agent'] };
}

function policy(name, message) {
  return { name, message, kind: 'policy', expectedAgents: ['lead-agent', 'rag-agent', 'sales-agent'] };
}

function cart(name, message) {
  return { name, message, kind: 'cart', expectedAgents: ['lead-agent', 'cart-agent', 'sales-agent'] };
}

function smalltalk(name, message) {
  return { name, message, kind: 'smalltalk', expectedAgents: ['lead-agent', 'sales-agent'] };
}

function evaluateChatResponse(response, testCase, index) {
  assert.equal(typeof response.messageId, 'string', `case ${index} messageId`);
  assert.equal(typeof response.model, 'string', `case ${index} model`);
  assert.notEqual(response.model, 'deterministic-fallback', `case ${index} must not use deterministic fallback`);
  assert.notEqual(response.model, 'safe-fallback', `case ${index} must not use safe fallback`);
  assert.equal(Array.isArray(response.blocks), true, `case ${index} blocks`);

  const text = findBlock(response, 'text')?.content ?? '';
  assert.equal(text.length > 12, true, `case ${index} text too short`);
  assertNoInternalLeak(text, index);

  const productList = findBlock(response, 'product_list')?.items ?? [];
  const policyList = findBlock(response, 'policy_answer')?.items ?? [];
  const cartSummary = findBlock(response, 'cart_summary')?.cart;

  if (testCase.kind === 'product') {
    assert.equal(productList.length > 0, true, `case ${index} expected product rail`);
    assertNoProductContradiction(text, index);
  }
  if (testCase.kind === 'policy') {
    assert.equal(policyList.length > 0, true, `case ${index} expected policy/RAG answer`);
  }
  if (testCase.kind === 'cart') {
    assert.equal(Boolean(cartSummary), true, `case ${index} expected cart summary`);
    assert.match(normalizeText(text), /gio hang|san pham|tong|them|xoa|cap nhat|trong/, `case ${index} cart response should mention cart state/action`);
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
    kind: testCase.kind,
    status,
    durationMs,
    model: response.model,
    textLength: text.length,
    textPreview: text.slice(0, 240),
    productIds: productList.map((product) => product.id),
    policyIds: policyList.map((item) => item.id),
    cartItemCount: cart?.items?.length ?? 0,
    cartGrandTotal: cart?.grandTotal ?? 0,
    agents: response.trace?.agents ?? [],
    playbackEventCount: response.trace?.playbackEvents?.length ?? 0,
    errorCount: response.trace?.errors?.length ?? 0,
    traceErrors: response.trace?.errors?.slice(0, 5) ?? [],
  };
}

function buildFailureSnapshot(response) {
  const text = findBlock(response, 'text')?.content ?? '';
  const productList = findBlock(response, 'product_list')?.items ?? [];
  const policyList = findBlock(response, 'policy_answer')?.items ?? [];
  const cart = findBlock(response, 'cart_summary')?.cart;
  return {
    model: response.model,
    textPreview: text.slice(0, 500),
    productIds: productList.map((product) => product.id),
    policyIds: policyList.map((item) => item.id),
    cartItemCount: cart?.items?.length ?? 0,
    cartGrandTotal: cart?.grandTotal ?? 0,
    agents: response.trace?.agents ?? [],
    traceErrors: response.trace?.errors?.slice(0, 5) ?? [],
  };
}

function findBlock(response, type) {
  return response.blocks.find((block) => block.type === type);
}

function normalizeText(value) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

async function postJson(url, body, cookie = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (response.status !== 201) {
      const error = new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      error.snapshot = { status: response.status, bodyText: text.slice(0, 1200) };
      throw error;
    }
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

function shuffle(values, seed) {
  const next = [...values];
  const random = mulberry32(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

async function writeSoakReport(cases, results, inProgress) {
  await mkdir(new URL('.', reportUrl), { recursive: true });
  const passed = results.filter((result) => result.status === 'passed').length;
  await writeFile(reportUrl, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    suite: 'agent-chat-soak-100',
    total: cases.length,
    completed: results.length,
    passed,
    failed: results.length - passed,
    inProgress,
    results,
  }, null, 2)}\n`, 'utf8');
}
