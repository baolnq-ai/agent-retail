import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { CatalogService } from '../dist/services/catalog.service.js';
import { CommerceService } from '../dist/services/commerce.service.js';
import { CartManagerAgentService } from '../dist/services/agents/cart-manager-agent.service.js';
import { CartSqlRagAgentService } from '../dist/services/agents/cart-sql-rag-agent.service.js';
import { CartAgentMutationWriterService } from '../dist/services/agents/cart-agent-mutation-writer.service.js';
import { CartAgentStateService } from '../dist/services/agents/cart-agent-state.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);
const runId = randomUUID().slice(0, 8);
const reportPath = new URL('../../../logs/planning/agent-pipeline/cart-agent-real-request-100-report.json', import.meta.url);

const GROUPS = [
  ['auth', 10],
  ['empty-read', 10],
  ['add', 20],
  ['set', 10],
  ['increment', 10],
  ['decrement', 10],
  ['remove', 10],
  ['clear-pending', 10],
  ['state-memory', 10],
];

const results = [];

try {
  await prisma.$connect();
  const agent = createAgent();
  let index = 1;
  for (const [group, count] of GROUPS) {
    for (let offset = 0; offset < count; offset += 1) {
      const id = `CART-EVAL-${String(index).padStart(3, '0')}`;
      const startedAt = Date.now();
      try {
        await runCase(agent, { id, group, offset });
        results.push({ id, group, status: 'passed', durationMs: Date.now() - startedAt });
      } catch (error) {
        results.push({ id, group, status: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
      }
      index += 1;
    }
  }

  const passed = results.filter((result) => result.status === 'passed').length;
  const report = {
    runId,
    runDate: new Date().toISOString(),
    command: 'corepack pnpm --filter @retail-agent/api test:runtime:cart-agent:100',
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
  mkdirSync(new URL('../../../logs/planning/agent-pipeline/', import.meta.url), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  assert.equal(results.length, 100);
  assert.equal(passed, 100, JSON.stringify(results.filter((result) => result.status === 'failed'), null, 2));
  console.log(`runtime cart agent real request 100: pass ${passed}/100`);
} finally {
  await cleanupRun().catch(() => undefined);
  await prisma.$disconnect();
}

async function runCase(agent, testCase) {
  if (testCase.group === 'auth') return runAuthCase(agent, testCase);
  if (testCase.group === 'empty-read') return runEmptyReadCase(agent, testCase);
  if (testCase.group === 'add') return runAddCase(agent, testCase);
  if (testCase.group === 'set') return runSetCase(agent, testCase);
  if (testCase.group === 'increment') return runIncrementCase(agent, testCase);
  if (testCase.group === 'decrement') return runDecrementCase(agent, testCase);
  if (testCase.group === 'remove') return runRemoveCase(agent, testCase);
  if (testCase.group === 'clear-pending') return runClearPendingCase(agent, testCase);
  return runStateMemoryCase(agent, testCase);
}

async function runAuthCase(agent, testCase) {
  const fixture = await seedFixture(testCase, { withUser: false, withItem: false });
  const result = await agent.runGoal({
    message: 'them san pham vao gio',
    cart: emptyCart(fixture.cartId),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'add', resolvedProductIds: [fixture.productId] }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  assert.equal(result.agentResult.status, 'needs_auth');
  assert.equal(await prisma.cartEvent.count({ where: { cartId: fixture.cartId } }), 0);
}

async function runEmptyReadCase(agent, testCase) {
  const fixture = await seedFixture(testCase, { withItem: false });
  const result = await agent.runGoal({
    message: 'gio hang co gi va tong bao nhieu',
    userId: fixture.userId,
    cart: emptyCart(fixture.cartId),
    analysis: analysis({ intent: 'cart_status' }),
    products: [fixture.product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });
  assert.equal(result.agentResult.status, 'completed');
  assert.equal(result.agentResult.cart.grandTotal, 0);
  assert.equal(result.agentResult.facts.some((fact) => fact.type === 'cart_empty'), true);
}

async function runAddCase(agent, testCase) {
  const quantity = (testCase.offset % 3) + 1;
  const fixture = await seedFixture(testCase, { withItem: false });
  const result = await agent.runGoal({
    message: `them ${quantity} san pham vao gio`,
    userId: fixture.userId,
    cart: emptyCart(fixture.cartId),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'add', resolvedProductIds: [fixture.productId], quantity }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  await assertCompletedItemCase(result, fixture, quantity, quantity * fixture.product.price);
}

async function runSetCase(agent, testCase) {
  const targetQuantity = (testCase.offset % 4) + 1;
  const fixture = await seedFixture(testCase, { withItem: true, quantity: 1 });
  const result = await agent.runGoal({
    message: `dat so luong ${targetQuantity}`,
    userId: fixture.userId,
    cart: cartWithItem(fixture, 1),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'set_quantity', resolvedProductIds: [fixture.productId], quantity: targetQuantity }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  await assertCompletedItemCase(result, fixture, targetQuantity, targetQuantity * fixture.product.price);
}

async function runIncrementCase(agent, testCase) {
  const delta = (testCase.offset % 2) + 1;
  const fixture = await seedFixture(testCase, { withItem: true, quantity: 2 });
  const expectedQuantity = 2 + delta;
  const result = await agent.runGoal({
    message: `tang ${delta}`,
    userId: fixture.userId,
    cart: cartWithItem(fixture, 2),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'increment_quantity', resolvedProductIds: [fixture.productId], delta }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  await assertCompletedItemCase(result, fixture, expectedQuantity, expectedQuantity * fixture.product.price);
}

async function runDecrementCase(agent, testCase) {
  const delta = (testCase.offset % 2) + 1;
  const fixture = await seedFixture(testCase, { withItem: true, quantity: 3 });
  const expectedQuantity = 3 - delta;
  const result = await agent.runGoal({
    message: `giam ${delta}`,
    userId: fixture.userId,
    cart: cartWithItem(fixture, 3),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'decrement_quantity', resolvedProductIds: [fixture.productId], delta }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  await assertCompletedItemCase(result, fixture, expectedQuantity, expectedQuantity * fixture.product.price);
}

async function runRemoveCase(agent, testCase) {
  const fixture = await seedFixture(testCase, { withItem: true, quantity: 2 });
  const result = await agent.runGoal({
    message: 'xoa san pham khoi gio',
    userId: fixture.userId,
    cart: cartWithItem(fixture, 2),
    analysis: analysis({ intent: 'cart_action', cartOperation: 'remove', resolvedProductIds: [fixture.productId] }),
    products: [fixture.product],
    selectedProducts: [fixture.product],
    memoryContext: emptyMemory(),
  });
  await assertCompletedItemCase(result, fixture, 0, 0);
}

async function runClearPendingCase(agent, testCase) {
  const fixture = await seedFixture(testCase, { withItem: true, quantity: 2 });
  const cart = cartWithItem(fixture, 2);
  const pending = await agent.runGoal({
    message: 'xoa het gio',
    userId: fixture.userId,
    cart,
    analysis: analysis({ intent: 'cart_action', cartOperation: 'clear' }),
    products: [fixture.product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });
  assert.equal(pending.agentResult.status, 'needs_confirmation');
  assert.equal(await prisma.pendingCartAction.count({ where: { cartId: fixture.cartId, status: 'pending' } }), 1);

  const confirmed = await agent.runGoal({
    message: 'dung xoa',
    userId: fixture.userId,
    cart,
    analysis: analysis({ intent: 'confirm_pending' }),
    products: [fixture.product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });
  assert.equal(confirmed.agentResult.status, 'completed');
  assert.equal(confirmed.agentResult.cart.items.length, 0);
  assert.equal(await prisma.pendingCartAction.count({ where: { cartId: fixture.cartId, status: 'confirmed' } }), 1);
}

async function runStateMemoryCase(agent, testCase) {
  const fixture = await seedFixture(testCase, { withItem: false });
  const result = await agent.runGoal({
    message: 'kiem tra gio hang va luu bo nho',
    userId: fixture.userId,
    cart: emptyCart(fixture.cartId),
    analysis: analysis({ intent: 'cart_status' }),
    products: [fixture.product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });
  assert.equal(result.agentResult.status, 'completed');

  const stateService = new CartAgentStateService({ client: prisma });
  await stateService.summarizeMemory(fixture.userId, fixture.cartId);
  assert.equal(await prisma.cartAgentInteraction.count({ where: { userId: fixture.userId, cartId: fixture.cartId } }) >= 1, true);
  assert.equal(await prisma.cartAgentMemory.count({ where: { userId: fixture.userId, tier: { in: ['near', 'mid', 'far'] } } }) >= 3, true);
}

async function assertCompletedItemCase(result, fixture, expectedQuantity, expectedTotal) {
  assert.equal(result.agentResult.status, 'completed');
  const item = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: fixture.cartId, productId: fixture.productId } } });
  assert.equal(item?.quantity ?? 0, expectedQuantity);
  const cart = await prisma.cart.findUnique({ where: { id: fixture.cartId } });
  assert.equal(cart?.grandTotal, expectedTotal);
  assert.equal(await prisma.cartEvent.count({ where: { cartId: fixture.cartId } }), 1);
  assert.equal(await prisma.cartAgentInteraction.count({ where: { userId: fixture.userId, cartId: fixture.cartId } }) >= 1, true);
}

async function seedFixture(testCase, options = {}) {
  const suffix = `${runId}-${testCase.id.toLowerCase()}`;
  const userId = `cart-eval-user-${suffix}`;
  const cartId = `cart-eval-cart-${suffix}`;
  const productId = `cart-eval-product-${suffix}`;
  const product = {
    id: productId,
    title: `Cart Eval Product ${testCase.id}`,
    brand: 'Runtime',
    category: 'Test',
    price: 1000 + testCase.offset,
    currency: 'VND',
    inventory: 20,
    attributes: {},
    description: 'Cart Agent real request evaluation product.',
  };

  if (options.withUser !== false) {
    await prisma.user.create({ data: { id: userId, name: userId, passwordHash: 'runtime-test-password-hash' } });
  }
  await prisma.product.create({
    data: {
      id: product.id,
      title: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
      currency: product.currency,
      inventory: product.inventory,
      attributes: product.attributes,
      description: product.description,
    },
  });
  await prisma.cart.create({
    data: {
      id: cartId,
      userId: options.withUser === false ? undefined : userId,
      version: 1,
      status: 'active',
      subtotal: options.withItem ? (options.quantity ?? 1) * product.price : 0,
      grandTotal: options.withItem ? (options.quantity ?? 1) * product.price : 0,
      ...(options.withItem
        ? { items: { create: { productId, quantity: options.quantity ?? 1, unitPrice: product.price, lineTotal: (options.quantity ?? 1) * product.price } } }
        : {}),
    },
  });
  return { userId, cartId, productId, product };
}

async function cleanupRun() {
  await prisma.cartEvent.deleteMany({ where: { cartId: { contains: runId } } });
  await prisma.pendingCartAction.deleteMany({ where: { cartId: { contains: runId } } });
  await prisma.cartAgentInteraction.deleteMany({ where: { userId: { contains: runId } } });
  await prisma.cartAgentMemory.deleteMany({ where: { userId: { contains: runId } } });
  await prisma.cartItem.deleteMany({ where: { cartId: { contains: runId } } });
  await prisma.cart.deleteMany({ where: { id: { contains: runId } } });
  await prisma.idempotencyKey.deleteMany({ where: { key: { contains: runId } } });
  await prisma.product.deleteMany({ where: { id: { contains: runId } } });
  await prisma.user.deleteMany({ where: { id: { contains: runId } } });
}

function createAgent() {
  const prismaService = { client: prisma };
  const catalogService = new CatalogService(prismaService);
  const commerceService = new CommerceService(catalogService, prismaService);
  const manager = new CartManagerAgentService(commerceService, {
    savePendingCartPlan: async () => undefined,
    clearPendingCartPlan: async () => undefined,
  });
  return new CartSqlRagAgentService(
    manager,
    { appendHistory: async () => undefined },
    new CartAgentMutationWriterService(prismaService),
    new CartAgentStateService(prismaService),
  );
}

function analysis(overrides = {}) {
  const { quantity, delta, ...rest } = overrides;
  return {
    intent: 'cart_status',
    retrievalMode: 'none',
    shouldShowProducts: false,
    quantity: quantity || delta ? {
      targetQuantity: quantity,
      delta,
      mentionedQuantity: quantity ?? delta,
      implicitOne: false,
    } : undefined,
    references: { resolvedProductIds: overrides.resolvedProductIds ?? [] },
    constraints: {},
    confidence: 0.95,
    ...rest,
  };
}

function emptyCart(cartId) {
  return { id: cartId, version: 1, status: 'active', items: [], subtotal: 0, grandTotal: 0 };
}

function cartWithItem(fixture, quantity) {
  return {
    id: fixture.cartId,
    version: 1,
    status: 'active',
    items: [{ productId: fixture.productId, quantity, unitPrice: fixture.product.price, lineTotal: quantity * fixture.product.price }],
    subtotal: quantity * fixture.product.price,
    grandTotal: quantity * fixture.product.price,
  };
}

function emptyMemory() {
  return { recentTurns: [], preferences: [], recentRecommendationIds: [] };
}
