import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { StorageMemoryAgentService } from '../dist/services/agents/storage-memory-agent.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);

const suffix = randomUUID().slice(0, 8);
const userId = `runtime-storage-memory-user-${suffix}`;
const requestId = `runtime-storage-memory-req-${suffix}`;
const productId = `runtime-storage-memory-product-${suffix}`;

try {
  await prisma.$connect();
  await seed();

  const service = new StorageMemoryAgentService({ client: prisma });
  const turn = await service.writeTurn({
    userId,
    requestId,
    role: 'user',
    content: 'toi vua xem may loc khong khi, email test@example.com',
    metadata: { productIds: [productId] },
  });
  assert.equal(turn.status, 'completed');

  const agentIndex = await service.writeAgentResult({
    userId,
    sourceAgent: 'recommendation-agent',
    sourceTable: 'RecommendationRun',
    sourceId: `${requestId}-rec`,
    summary: `Recommended ${productId} for living room.`,
    tags: ['recommendation', 'air'],
    productIds: [productId],
    confidence: 0.9,
  });
  assert.equal(agentIndex.status, 'completed');

  const preference = await service.updatePreference({
    userId,
    key: 'recent_recommendations',
    value: [productId],
    confidence: 0.86,
    sourceRefs: [{ table: 'MemoryAgentIndex', id: agentIndex.id, agent: 'recommendation-agent' }],
  });
  assert.equal(preference.status, 'completed');

  await service.writeBehaviorSignal({
    userId,
    productId,
    category: 'May loc khong khi',
    brand: 'AiroClean',
    type: 'recommend_click',
    weight: 1,
    sourceAgent: 'recommendation-agent',
  });

  const context = await service.getContext({
    userId,
    message: 'san pham vua de xuat luc nay la gi',
    tokenBudget: 1200,
  });
  assert.equal(context.need, 'near_mid_far');
  assert.equal(context.references.lastRecommendationIds.includes(productId), true);
  assert.equal(context.evidence.length > 0, true);
  assert.equal(context.brief.includes(productId), true);

  const summary = await service.summarizeNearToMid({ userId, requestId });
  assert.equal(summary.status, 'completed');
  const mid = await prisma.memoryItem.findFirst({ where: { userId, tier: 'mid' } });
  assert.equal(typeof mid?.summary, 'string');

  const far = await service.summarizeMidToFar({ userId });
  assert.equal(far.status, 'completed');
  const farItem = await prisma.memoryItem.findFirst({ where: { userId, tier: 'far', key: 'profile:stable-summary' } });
  assert.equal(typeof farItem?.summary, 'string');

  const exported = await service.exportUserMemory(userId);
  assert.equal(exported.userId, userId);
  assert.equal(exported.items.length >= 1, true);

  const storedTurn = await prisma.memoryTurn.findFirst({ where: { userId, requestId } });
  assert.match(storedTurn?.content ?? '', /\[redacted-email\]/);

  console.log('runtime storage memory agent: pass');
} finally {
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
}

async function seed() {
  await prisma.user.create({
    data: {
      id: userId,
      name: userId,
      passwordHash: 'runtime-test-password-hash',
    },
  });
  await prisma.product.create({
    data: {
      id: productId,
      title: 'Runtime Memory Air Purifier',
      brand: 'Runtime',
      category: 'May loc khong khi',
      price: 1000000,
      currency: 'VND',
      inventory: 3,
      attributes: {},
      description: 'Runtime storage memory product.',
    },
  });
}

async function cleanup() {
  await prisma.memoryAgentIndex.deleteMany({ where: { userId } });
  await prisma.memoryBehaviorSignal.deleteMany({ where: { userId } });
  await prisma.memoryPreference.deleteMany({ where: { userId } });
  await prisma.memorySummary.deleteMany({ where: { userId } });
  await prisma.memoryItem.deleteMany({ where: { userId } });
  await prisma.memoryEvent.deleteMany({ where: { userId } });
  await prisma.memoryTurn.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
