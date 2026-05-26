import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { CartSqlRagAgentService } from '../dist/services/agents/cart-sql-rag-agent.service.js';
import { CartAgentMutationWriterService } from '../dist/services/agents/cart-agent-mutation-writer.service.js';
import { CartAgentStateService } from '../dist/services/agents/cart-agent-state.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);

const suffix = randomUUID().slice(0, 8);
const userId = `runtime-cart-pending-user-${suffix}`;
const cartId = `runtime-cart-pending-cart-${suffix}`;
const productId = `runtime-cart-pending-product-${suffix}`;

try {
  await prisma.$connect();
  await seed();

  const stateService = new CartAgentStateService({ client: prisma });
  const mutationWriter = new CartAgentMutationWriterService({ client: prisma });
  const cartAgent = new CartSqlRagAgentService(
    failIfCalledManager(),
    { appendHistory: async () => undefined },
    mutationWriter,
    stateService,
  );

  const cartBefore = cartSnapshot(1, [{ productId, quantity: 2, unitPrice: 200000, lineTotal: 400000 }], 400000);
  const pendingResult = await cartAgent.runGoal({
    message: 'xoa het gio hang',
    userId,
    cart: cartBefore,
    analysis: analysis({ intent: 'cart_action', cartOperation: 'clear' }),
    products: [],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(pendingResult.agentResult.status, 'needs_confirmation');
  const pending = await prisma.pendingCartAction.findFirst({ where: { userId, cartId, status: 'pending' } });
  assert.equal(typeof pending?.id, 'string');

  const confirmResult = await cartAgent.runGoal({
    message: 'dung xoa di',
    userId,
    cart: cartBefore,
    analysis: analysis({ intent: 'confirm_pending' }),
    products: [],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(confirmResult.agentResult.status, 'completed');
  assert.equal(confirmResult.agentResult.cart.items.length, 0);
  assert.equal(confirmResult.clearedPendingPlan, true);

  const cartRow = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: true } });
  assert.equal(cartRow?.version, 2);
  assert.equal(cartRow?.subtotal, 0);
  assert.equal(cartRow?.items.length, 0);

  const confirmed = await prisma.pendingCartAction.findUnique({ where: { id: pending.id } });
  assert.equal(confirmed?.status, 'confirmed');
  const clearEventCount = await prisma.cartEvent.count({ where: { cartId, type: 'clear' } });
  assert.equal(clearEventCount, 1);
  const interactionCount = await prisma.cartAgentInteraction.count({ where: { userId, cartId } });
  assert.equal(interactionCount >= 2, true);

  console.log('runtime cart agent pending flow: pass');
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
      title: 'Runtime Pending Product',
      brand: 'Runtime',
      category: 'Test',
      price: 200000,
      currency: 'VND',
      inventory: 10,
      attributes: {},
      description: 'Runtime test product for Cart Agent pending flow.',
    },
  });
  await prisma.cart.create({
    data: {
      id: cartId,
      userId,
      version: 1,
      status: 'active',
      subtotal: 400000,
      grandTotal: 400000,
      items: {
        create: {
          productId,
          quantity: 2,
          unitPrice: 200000,
          lineTotal: 400000,
        },
      },
    },
  });
}

async function cleanup() {
  await prisma.cartEvent.deleteMany({ where: { cartId } });
  await prisma.pendingCartAction.deleteMany({ where: { cartId } });
  await prisma.cartAgentInteraction.deleteMany({ where: { userId } });
  await prisma.cartAgentMemory.deleteMany({ where: { userId } });
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.deleteMany({ where: { id: cartId } });
  await prisma.idempotencyKey.deleteMany({ where: { scope: 'cart-agent:cart.write.clear', key: { startsWith: 'pending-confirm:' } } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

function failIfCalledManager() {
  return {
    run: async () => {
      throw new Error('Legacy cart manager should not be called in DB pending runtime flow.');
    },
  };
}

function analysis(overrides) {
  return {
    intent: 'cart_status',
    retrievalMode: 'none',
    shouldShowProducts: false,
    references: { resolvedProductIds: [] },
    constraints: {},
    confidence: 0.95,
    ...overrides,
  };
}

function cartSnapshot(version, items, total) {
  return { id: cartId, version, status: 'active', items, subtotal: total, grandTotal: total };
}

function emptyMemory() {
  return { recentTurns: [], preferences: [], recentRecommendationIds: [] };
}
