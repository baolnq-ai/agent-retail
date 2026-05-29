import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { SearchAgentService } from '../dist/services/agents/search-agent.service.js';
import { ModelGatewayService } from '../dist/services/model-gateway.service.js';
import { ModelSettingsService } from '../dist/services/model-settings.service.js';
import { QdrantService } from '../dist/services/qdrant.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);
const suffix = randomUUID().slice(0, 8);
const userId = `runtime-search-user-${suffix}`;
const productIds = {
  airExact: `runtime-search-air-p35-${suffix}`,
  airMini: `runtime-search-air-mini-${suffix}`,
  kitchen: `runtime-search-kitchen-${suffix}`,
  clean: `runtime-search-clean-${suffix}`,
  outOfStock: `runtime-search-out-${suffix}`,
};
const reportPath = new URL('../../../logs/planning/agent-pipeline/search-agent-real-request-100-report.json', import.meta.url);
const search = new SearchAgentService({ client: prisma }, new ModelGatewayService(new ModelSettingsService()), new QdrantService());
const results = [];

try {
  await prisma.$connect();
  await seed();
  for (let index = 1; index <= 100; index += 1) {
    await runCase(index, async () => {
      if (index <= 20) return exactCase(index);
      if (index <= 40) return filterCase(index);
      if (index <= 60) return lexicalCase(index);
      if (index <= 80) return broadLexicalCase(index);
      if (index <= 90) return noResultCase(index);
      return historyCase(index);
    });
  }
  const passed = results.filter((item) => item.status === 'passed').length;
  const failed = results.length - passed;
  const report = { generatedAt: new Date().toISOString(), suite: 'search-agent-real-request-100', total: results.length, passed, failed, results };
  await mkdir(new URL('.', reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  assert.equal(failed, 0, `${failed}/100 search real-request cases failed`);
  console.log(`runtime search agent 100-case: pass ${passed}/100`);
} finally {
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
}

async function exactCase(index) {
  const result = await search.runGoal({ requestId: req(index), userId, query: 'AiroClean P35 Runtime' });
  assert.equal(result.status, 'completed');
  assert.equal(result.matchType, 'exact');
  assert.equal(result.candidates[0].productId, productIds.airExact);
}

async function filterCase(index) {
  const result = await search.runGoal({
    requestId: req(index),
    userId,
    query: 'may loc khong khi',
    filters: { category: 'Dien gia dung', budgetMax: 2000000, requireInStock: true },
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.usedLanes.includes('filter'), true);
  assert.equal(result.candidates.every((item) => item.productId !== productIds.outOfStock), true);
  assert.equal(result.candidates[0].productId, productIds.airMini);
}

async function lexicalCase(index) {
  const result = await search.runGoal({ requestId: req(index), userId, query: 'noi chien khong dau runtime' });
  assert.equal(result.status, 'completed');
  assert.equal(result.usedLanes.includes('lexical'), true);
  assert.equal(result.candidates[0].productId, productIds.kitchen);
}

async function broadLexicalCase(index) {
  const result = await search.runGoal({ requestId: req(index), userId, query: `may lam sach bui phong ngu z${index}99`, fallbackPolicy: 'broad_lexical_if_low_recall' });
  assert.equal(result.status, 'completed');
  assert.equal(result.matchType, 'strong_lexical');
  assert.equal(result.usedLanes.includes('embedding'), false);
  assert.equal(result.usedLanes.includes('lexical'), true);
  assert.equal(result.candidates.some((item) => item.productId === productIds.airMini), true);
}

async function noResultCase(index) {
  const result = await search.runGoal({ requestId: req(index), userId, query: 'zzzz qqqq xxxx', fallbackPolicy: 'hard_only' });
  assert.equal(result.status, 'no_results');
  assert.equal(result.matchType, 'none');
  assert.equal(result.usedLanes.includes('embedding'), false);
}

async function historyCase(index) {
  const result = await search.runGoal({ requestId: req(index), userId, query: 'AiroClean P35 Runtime' });
  assert.equal(result.status, 'completed');
  const memory = await search.getMemoryContext(userId);
  assert.equal(memory.near.some((item) => item.includes(productIds.airExact)), true);
  const interaction = await prisma.searchAgentInteraction.findFirst({ where: { userId, requestId: req(index) } });
  assert.equal(interaction?.selectedProductIds[0], productIds.airExact);
}

async function runCase(index, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    results.push({ id: `SA-RR-${String(index).padStart(3, '0')}`, status: 'passed', durationMs: Date.now() - startedAt });
  } catch (error) {
    results.push({
      id: `SA-RR-${String(index).padStart(3, '0')}`,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function seed() {
  await prisma.user.create({ data: { id: userId, name: userId, passwordHash: 'runtime-test-password-hash' } });
  const products = [
    [productIds.airExact, 'AiroClean P35 Runtime', 'AiroClean', 'Dien gia dung', 3490000, 5, { roomSize: '25-35m2', filter: 'HEPA H13' }, 'may loc khong khi phong lon loc bui PM2.5 runtime'],
    [productIds.airMini, 'FreshHome Mini Runtime', 'FreshHome', 'Dien gia dung', 1990000, 4, { roomSize: '15-22m2', filter: 'HEPA H12' }, 'may loc khong khi nho gon phong ngu runtime'],
    [productIds.kitchen, 'ChefMax AF Runtime', 'ChefMax', 'Thiet bi nha bep', 2290000, 5, { capacity: '5.5L' }, 'noi chien khong dau runtime'],
    [productIds.clean, 'HomeSweep Mop Runtime', 'HomeSweep', 'Ve sinh nha cua', 2230000, 5, { usage: 'san go va gach' }, 'lau nha va ve sinh bui runtime'],
    [productIds.outOfStock, 'AiroClean Out Runtime', 'AiroClean', 'Dien gia dung', 1500000, 0, { roomSize: '10-15m2' }, 'may loc khong khi het hang runtime'],
  ];
  for (const [id, title, brand, category, price, inventory, attributes, description] of products) {
    await prisma.product.create({ data: { id, title, brand, category, price, inventory, attributes, description, currency: 'VND' } });
  }
}

async function cleanup() {
  await prisma.searchAgentMemory.deleteMany({ where: { userId } });
  await prisma.searchAgentInteraction.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { id: { in: Object.values(productIds) } } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

function req(index) {
  return `runtime-search-req-${suffix}-${index}`;
}
