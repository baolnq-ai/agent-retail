import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { CartAgentStateService } from '../dist/services/agents/cart-agent-state.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);

const suffix = randomUUID().slice(0, 8);
const userId = `runtime-cart-state-user-${suffix}`;
const cartId = `runtime-cart-state-cart-${suffix}`;
const requestId = `runtime-cart-state-req-${suffix}`;

try {
  await prisma.$connect();
  await seed();

  const service = new CartAgentStateService({ client: prisma });
  await service.writeInteraction({
    userId,
    cartId,
    requestId,
    leadGoal: 'Kiem tra gio hang hien tai',
    result: sampleAgentResult(),
  });
  await service.upsertMemory({
    userId,
    cartId,
    tier: 'near',
    key: `cart:${cartId}:latest`,
    value: { lastStatus: 'completed', productIds: [] },
    summary: 'Runtime near cart memory.',
    eventCount: 1,
  });

  const interaction = await prisma.cartAgentInteraction.findFirst({ where: { userId, cartId, requestId } });
  assert.equal(interaction?.status, 'completed');
  assert.equal(interaction?.normalizedGoal, 'kiem tra gio hang hien tai');

  const memory = await prisma.cartAgentMemory.findUnique({
    where: { userId_tier_key: { userId, tier: 'near', key: `cart:${cartId}:latest` } },
  });
  assert.equal(memory?.summary, 'Runtime near cart memory.');
  assert.equal(memory?.eventCount, 1);

  const summary = await service.summarizeMemory(userId, cartId);
  assert.equal(summary.interactionCount, 1);
  assert.match(summary.midSummary, /1 interactions/);
  const midMemory = await prisma.cartAgentMemory.findUnique({
    where: { userId_tier_key: { userId, tier: 'mid', key: `cart:${cartId}:mid-summary` } },
  });
  const farMemory = await prisma.cartAgentMemory.findUnique({
    where: { userId_tier_key: { userId, tier: 'far', key: `user:${userId}:cart-behavior` } },
  });
  assert.equal(typeof midMemory?.summary, 'string');
  assert.equal(typeof farMemory?.summary, 'string');

  const pending = await service.createPendingAction({
    userId,
    cartId,
    requestId: `${requestId}-pending`,
    operations: [{ type: 'clear' }],
    reason: 'runtime clear needs confirmation',
    confirmationText: 'Xac nhan xoa gio hang?',
    expiresAt: new Date(Date.now() + 60_000),
  });
  const active = await service.getActivePendingAction(userId, cartId);
  assert.equal(active?.id, pending.id);
  assert.equal(await service.resolvePendingAction(pending.id, 'cancelled'), true);
  assert.equal(await service.getActivePendingAction(userId, cartId), null);

  console.log('runtime cart agent state: pass');
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
  await prisma.cart.create({ data: { id: cartId, userId, version: 1, status: 'active' } });
}

async function cleanup() {
  await prisma.pendingCartAction.deleteMany({ where: { cartId } });
  await prisma.cartAgentInteraction.deleteMany({ where: { userId } });
  await prisma.cartAgentMemory.deleteMany({ where: { userId } });
  await prisma.cart.deleteMany({ where: { id: cartId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

function sampleAgentResult() {
  return {
    status: 'completed',
    cart: { id: cartId, version: 1, status: 'active', items: [], subtotal: 0, grandTotal: 0 },
    facts: [{ type: 'cart_total', message: 'Cart total is 0 VND.', grandTotal: 0, evidence: ['cart.version=1'] }],
    issues: [],
    operations: [],
    privatePlan: [{ step: 'load_current_cart', tool: 'cart.sql.get_active_cart', status: 'completed', summary: 'Loaded cart.' }],
    memory: { near: [], midSummary: 'Cart v1: empty.', farSignals: [] },
    handoff: {
      agentMessage: 'Cart is empty.',
      userSafeMessage: 'Cart is empty.',
      leadInstruction: 'Enough grounded cart facts are available for the final user answer.',
      allowedClaims: ['Cart is empty.'],
      forbiddenClaims: [],
    },
  };
}
