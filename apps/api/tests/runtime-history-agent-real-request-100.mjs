import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { StorageMemoryAgentService } from '../dist/services/agents/storage-memory-agent.service.js';
import { HistoryAgentService } from '../dist/services/agents/history-agent.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);
const suffix = randomUUID().slice(0, 8);
const productIds = Array.from({ length: 5 }, (_, index) => `runtime-history-product-${suffix}-${index + 1}`);
const userIds = [];
const reportPath = new URL('../../../logs/planning/agent-pipeline/history-agent-real-request-100-report.json', import.meta.url);
const storage = new StorageMemoryAgentService({ client: prisma });
const history = new HistoryAgentService(storage);
const results = [];

try {
  await prisma.$connect();
  await seedProducts();
  for (let index = 1; index <= 100; index += 1) {
    await runCase(index, async () => {
      const userId = await seedUser(index);
      if (index <= 10) return previousRecommendationCase(index, userId);
      if (index <= 20) return ordinalCase(index, userId);
      if (index <= 30) return singlePronounCase(index, userId);
      if (index <= 40) return allLastRecommendationsCase(index, userId);
      if (index <= 50) return cartReferenceCase(index, userId);
      if (index <= 60) return previousSearchCase(index, userId);
      if (index <= 70) return alternativeHintCase(index, userId);
      if (index <= 80) return notFoundCase(index, userId);
      if (index <= 90) return ambiguousPronounCase(index, userId);
      return railConsistencyCase(index, userId);
    });
  }

  const passed = results.filter((item) => item.status === 'passed').length;
  const failed = results.length - passed;
  const report = {
    generatedAt: new Date().toISOString(),
    suite: 'history-agent-real-request-100',
    total: results.length,
    passed,
    failed,
    results,
  };
  await mkdir(new URL('.', reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  assert.equal(failed, 0, `${failed}/100 history real-request cases failed`);
  console.log(`runtime history agent 100-case: pass ${passed}/100`);
} finally {
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
}

async function previousRecommendationCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'recommendation-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'san pham vua de xuat co nen mua khong' });
  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, [productId]);
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'search'), true);
}

async function ordinalCase(index, userId) {
  await writeAgentIndex(index, userId, 'recommendation-agent', productIds.slice(0, 3));
  const result = await history.resolve({ userId, requestId: req(index), message: 'cai thu hai re hon khong' });
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolvedReferences[0].productId, productIds[1]);
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'recommendation'), true);
}

async function singlePronounCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'search-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'cai do chi tiet the nao' });
  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, [productId]);
}

async function allLastRecommendationsCase(index, userId) {
  const ids = [pickProduct(index), pickProduct(index + 1)];
  await writeAgentIndex(index, userId, 'recommendation-agent', ids);
  const result = await history.resolve({ userId, requestId: req(index), message: 'them het cac cai do vao gio' });
  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, ids);
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'cart'), true);
}

async function cartReferenceCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'cart-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'cai do trong gio hang luc nay la gi' });
  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, [productId]);
  assert.equal(result.resolvedReferences[0].sourceAgent, 'cart');
}

async function previousSearchCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'search-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'san pham vua tim luc nay la gi' });
  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, [productId]);
}

async function alternativeHintCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'recommendation-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'cai do re hon hoac giong vay khong' });
  assert.equal(result.status, 'resolved');
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'recommendation'), true);
}

async function notFoundCase(index, userId) {
  const result = await history.resolve({ userId, requestId: req(index), message: 'san pham vua de xuat la gi' });
  assert.equal(result.status, 'not_found');
  assert.equal(result.handoff.mustMentionProductIds.length, 0);
}

async function ambiguousPronounCase(index, userId) {
  const ids = [pickProduct(index), pickProduct(index + 1)];
  await writeAgentIndex(index, userId, 'search-agent', ids);
  const result = await history.resolve({ userId, requestId: req(index), message: 'cai do them vao gio di' });
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.nextAgentHints[0].agent, 'lead');
}

async function railConsistencyCase(index, userId) {
  const productId = pickProduct(index);
  await writeAgentIndex(index, userId, 'recommendation-agent', [productId]);
  const result = await history.resolve({ userId, requestId: req(index), message: 'san pham vua de xuat la gi' });
  const pass = history.validateRailConsistency({ history: result, textProductIds: [productId], railProductIds: [productId] });
  const fail = history.validateRailConsistency({ history: result, textProductIds: [productId, 'unexpected-product'], railProductIds: [productId] });
  assert.equal(pass.pass, true);
  assert.equal(fail.pass, false);
}

async function runCase(index, fn) {
  const startedAt = Date.now();
  try {
    await fn();
    results.push({ id: `HA-RR-${String(index).padStart(3, '0')}`, status: 'passed', durationMs: Date.now() - startedAt });
  } catch (error) {
    results.push({
      id: `HA-RR-${String(index).padStart(3, '0')}`,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function writeAgentIndex(index, userId, sourceAgent, ids) {
  await storage.writeAgentResult({
    userId,
    sourceAgent,
    sourceTable: `${sourceAgent}-table`,
    sourceId: `${req(index)}-${sourceAgent}`,
    summary: `${sourceAgent} selected ${ids.join(', ')}.`,
    tags: [sourceAgent],
    productIds: ids,
    cartId: sourceAgent === 'cart-agent' ? `cart-${suffix}-${index}` : undefined,
    confidence: 0.9,
  });
}

async function seedProducts() {
  for (const productId of productIds) {
    await prisma.product.create({
      data: {
        id: productId,
        title: `Runtime History Product ${productId}`,
        brand: 'Runtime',
        category: 'May loc khong khi',
        price: 1000000,
        currency: 'VND',
        inventory: 5,
        attributes: {},
        description: 'Runtime history 100-case product.',
      },
    });
  }
}

async function seedUser(index) {
  const userId = `runtime-history-user-${suffix}-${index}`;
  userIds.push(userId);
  await prisma.user.create({ data: { id: userId, name: userId, passwordHash: 'runtime-test-password-hash' } });
  return userId;
}

async function cleanup() {
  await prisma.memoryAgentIndex.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memoryBehaviorSignal.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memoryPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memorySummary.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memoryItem.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memoryEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.memoryTurn.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

function req(index) {
  return `runtime-history-req-${suffix}-${index}`;
}

function pickProduct(index) {
  return productIds[index % productIds.length];
}
