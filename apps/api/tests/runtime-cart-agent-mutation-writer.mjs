import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '../dist/utils/prisma-client.js';
import { CartAgentMutationWriterService } from '../dist/services/agents/cart-agent-mutation-writer.service.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public';
const prisma = createPrismaClient(databaseUrl);

const suffix = randomUUID().slice(0, 8);
const userId = `runtime-cart-agent-user-${suffix}`;
const cartId = `runtime-cart-agent-cart-${suffix}`;
const productId = `runtime-cart-agent-product-${suffix}`;
const addKey = `runtime-add-${suffix}`;
const setKey = `runtime-set-${suffix}`;
const incrementKey = `runtime-increment-${suffix}`;
const decrementKey = `runtime-decrement-${suffix}`;
const removeKey = `runtime-remove-${suffix}`;
const clearKey = `runtime-clear-${suffix}`;
const concurrentKeyA = `runtime-concurrent-a-${suffix}`;
const concurrentKeyB = `runtime-concurrent-b-${suffix}`;
const staleKey = `runtime-stale-${suffix}`;
const idempotencyKeys = [addKey, setKey, incrementKey, decrementKey, removeKey, clearKey, concurrentKeyA, concurrentKeyB, staleKey];

try {
  await prisma.$connect();
  await seed();

  const writer = new CartAgentMutationWriterService({ client: prisma });
  const first = await writer.execute({
    toolName: 'cart.write.add_item',
    requestId: `req-add-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 2,
    idempotencyKey: addKey,
    expectedCartVersion: 1,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime add product',
  });

  assert.equal(first.status, 'completed');
  assert.equal(first.cart?.version, 2);
  assert.equal(first.cart?.grandTotal, 246000);
  assert.equal(first.verification?.passed, true);

  const eventCountAfterFirst = await prisma.cartEvent.count({ where: { cartId, idempotencyKey: addKey } });
  assert.equal(eventCountAfterFirst, 1);

  const replay = await writer.execute({
    toolName: 'cart.write.add_item',
    requestId: `req-add-replay-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 2,
    idempotencyKey: addKey,
    expectedCartVersion: 2,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime replay product',
  });

  assert.equal(replay.status, 'replayed');
  const itemAfterReplay = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  assert.equal(itemAfterReplay?.quantity, 2);
  const eventCountAfterReplay = await prisma.cartEvent.count({ where: { cartId, idempotencyKey: addKey } });
  assert.equal(eventCountAfterReplay, 1);

  await expectWrite(writer, {
    toolName: 'cart.write.set_quantity',
    requestId: `req-set-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 4,
    idempotencyKey: setKey,
    expectedCartVersion: 2,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime set product',
  }, { quantity: 4, version: 3, total: 492000 });

  await expectWrite(writer, {
    toolName: 'cart.write.increment_item',
    requestId: `req-increment-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 1,
    idempotencyKey: incrementKey,
    expectedCartVersion: 3,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime increment product',
  }, { quantity: 5, version: 4, total: 615000 });

  await expectWrite(writer, {
    toolName: 'cart.write.decrement_item',
    requestId: `req-decrement-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 2,
    idempotencyKey: decrementKey,
    expectedCartVersion: 4,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime decrement product',
  }, { quantity: 3, version: 5, total: 369000 });

  await expectWrite(writer, {
    toolName: 'cart.write.remove_item',
    requestId: `req-remove-${suffix}`,
    userId,
    cartId,
    productId,
    idempotencyKey: removeKey,
    expectedCartVersion: 5,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime remove product',
  }, { quantity: 0, version: 6, total: 0 });

  await expectWrite(writer, {
    toolName: 'cart.write.clear',
    requestId: `req-clear-${suffix}`,
    userId,
    cartId,
    idempotencyKey: clearKey,
    expectedCartVersion: 6,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime clear cart',
  }, { quantity: 0, version: 7, total: 0 });

  const concurrentRequests = [concurrentKeyA, concurrentKeyB].map((idempotencyKey, index) => writer.execute({
    toolName: 'cart.write.add_item',
    requestId: `req-concurrent-${index}-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 1,
    idempotencyKey,
    expectedCartVersion: 7,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime concurrent add',
  }));
  const concurrentResults = await Promise.all(concurrentRequests);
  assert.equal(concurrentResults.filter((result) => result.status === 'completed').length, 1);
  assert.equal(concurrentResults.filter((result) => result.status === 'conflict').length, 1);
  const itemAfterConcurrent = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  assert.equal(itemAfterConcurrent?.quantity, 1);
  const concurrentEventCount = await prisma.cartEvent.count({ where: { cartId, idempotencyKey: { in: [concurrentKeyA, concurrentKeyB] } } });
  assert.equal(concurrentEventCount, 1);

  const stale = await writer.execute({
    toolName: 'cart.write.add_item',
    requestId: `req-stale-${suffix}`,
    userId,
    cartId,
    productId,
    quantity: 1,
    idempotencyKey: staleKey,
    expectedCartVersion: 7,
    actorAgent: 'cart-agent-runtime-test',
    sourceMessage: 'runtime stale product',
  });

  assert.equal(stale.status, 'conflict');
  assert.deepEqual(stale.issueCodes, ['stale_cart_version']);
  const staleEventCount = await prisma.cartEvent.count({ where: { cartId, idempotencyKey: staleKey } });
  assert.equal(staleEventCount, 0);

  console.log('runtime cart agent mutation writer: pass');
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
      title: 'Runtime Cart Agent Product',
      brand: 'Runtime',
      category: 'Test',
      price: 123000,
      currency: 'VND',
      inventory: 10,
      attributes: {},
      description: 'Runtime test product for Cart Agent mutation writer.',
    },
  });
  await prisma.cart.create({ data: { id: cartId, userId, version: 1, status: 'active' } });
}

async function cleanup() {
  await prisma.cartEvent.deleteMany({ where: { cartId } });
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.deleteMany({ where: { id: cartId } });
  await prisma.idempotencyKey.deleteMany({
    where: {
      scope: {
        in: [
          'cart-agent:cart.write.add_item',
          'cart-agent:cart.write.set_quantity',
          'cart-agent:cart.write.increment_item',
          'cart-agent:cart.write.decrement_item',
          'cart-agent:cart.write.remove_item',
          'cart-agent:cart.write.clear',
        ],
      },
      key: { in: idempotencyKeys },
    },
  });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function expectWrite(writer, request, expected) {
  const result = await writer.execute(request);
  assert.equal(result.status, 'completed', request.toolName);
  assert.equal(result.cart?.version, expected.version, request.toolName);
  assert.equal(result.cart?.grandTotal, expected.total, request.toolName);
  assert.equal(result.verification?.passed, true, request.toolName);

  const item = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  assert.equal(item?.quantity ?? 0, expected.quantity, request.toolName);
  const eventCount = await prisma.cartEvent.count({ where: { cartId, idempotencyKey: request.idempotencyKey } });
  assert.equal(eventCount, 1, request.toolName);
}
