import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPendingCartAction,
  getActivePendingCartAction,
  getCartAgentMemoryContext,
  persistCartAgentInteraction,
  resolvePendingCartAction,
  summarizeCartAgentMemory,
  upsertCartAgentMemory,
} from '../dist/services/agents/cart-agent-state.service.js';

test('cart agent state persists private interaction and near memory', async () => {
  const calls = [];
  const client = fakeStateClient({ calls });
  const result = sampleAgentResult();

  await persistCartAgentInteraction(client, {
    userId: 'user-1',
    cartId: 'cart-1',
    requestId: 'req-1',
    leadGoal: 'Them san pham A vao gio',
    result,
  });
  await upsertCartAgentMemory(client, {
    userId: 'user-1',
    cartId: 'cart-1',
    tier: 'near',
    key: 'cart:cart-1:latest',
    value: { facts: result.facts },
    summary: 'Cart v2: one item.',
    eventCount: 1,
  });

  const interaction = calls.find((call) => call.type === 'cartAgentInteraction.create');
  assert.equal(interaction.data.userId, 'user-1');
  assert.equal(interaction.data.normalizedGoal, 'them san pham a vao gio');
  assert.equal(interaction.data.status, 'completed');
  assert.equal(interaction.data.facts.length, 1);

  const memory = calls.find((call) => call.type === 'cartAgentMemory.upsert');
  assert.equal(memory.args.where.userId_tier_key.key, 'cart:cart-1:latest');
  assert.equal(memory.args.create.summary, 'Cart v2: one item.');
  assert.equal(memory.args.create.tokenEstimate > 0, true);
});

test('cart agent state handles pending action lifecycle', async () => {
  const calls = [];
  const pending = [];
  const client = fakeStateClient({ calls, pending });
  const expiresAt = new Date(Date.now() + 60_000);

  const created = await createPendingCartAction(client, {
    userId: 'user-1',
    cartId: 'cart-1',
    requestId: 'req-pending',
    operations: [{ type: 'clear' }],
    reason: 'clear cart requires confirmation',
    confirmationText: 'Xac nhan xoa gio hang?',
    expiresAt,
  });

  assert.equal(created.status, 'pending');
  const active = await getActivePendingCartAction(client, 'user-1', 'cart-1', new Date());
  assert.equal(active?.id, created.id);

  const resolved = await resolvePendingCartAction(client, created.id, 'cancelled');
  assert.equal(resolved, true);
  const activeAfterResolve = await getActivePendingCartAction(client, 'user-1', 'cart-1', new Date());
  assert.equal(activeAfterResolve, null);
});

test('cart agent state summarizes mid and far memory from interactions and events', async () => {
  const calls = [];
  const client = fakeStateClient({
    calls,
    interactions: [
      { status: 'completed', createdAt: new Date() },
      { status: 'needs_confirmation', createdAt: new Date() },
    ],
    events: [
      { type: 'add', createdAt: new Date() },
      { type: 'clear', createdAt: new Date() },
      { type: 'add', createdAt: new Date() },
    ],
  });

  const result = await summarizeCartAgentMemory(client, { userId: 'user-1', cartId: 'cart-1', now: new Date('2026-05-22T00:00:00.000Z') });

  assert.equal(result.interactionCount, 2);
  assert.equal(result.eventCount, 3);
  assert.match(result.midSummary, /2 interactions, 3 cart events/);
  assert.match(result.farSummary, /add:2/);
  const memoryUpserts = calls.filter((call) => call.type === 'cartAgentMemory.upsert');
  assert.equal(memoryUpserts.length, 2);
  assert.equal(memoryUpserts.some((call) => call.args.create.tier === 'mid'), true);
  assert.equal(memoryUpserts.some((call) => call.args.create.tier === 'far'), true);
});

test('cart agent state loads near mid and far memory context', async () => {
  const client = fakeStateClient({
    memoryRows: [
      { tier: 'near', summary: 'Near cart fact.' },
      { tier: 'mid', summary: 'Mid cart summary.' },
      { tier: 'far', summary: 'Far behavior signal.' },
    ],
  });

  const context = await getCartAgentMemoryContext(client, 'user-1', 'cart-1');

  assert.deepEqual(context.near, ['Near cart fact.']);
  assert.equal(context.midSummary, 'Mid cart summary.');
  assert.deepEqual(context.farSignals, ['Far behavior signal.']);
});

function sampleAgentResult() {
  return {
    status: 'completed',
    cart: { id: 'cart-1', version: 2, status: 'active', items: [], subtotal: 0, grandTotal: 0 },
    facts: [{ type: 'cart_total', message: 'Cart total is 0 VND.', grandTotal: 0, evidence: ['cart.version=2'] }],
    issues: [],
    operations: [{ tool: 'cart.add', status: 'completed', productIds: ['prod-1'], afterQuantity: 1, cartVersionAfter: 2 }],
    privatePlan: [{ step: 'execute', tool: 'cart.write.add_item', status: 'completed', summary: 'Add item.' }],
    memory: { near: [], midSummary: 'Cart v2: one item.', farSignals: [] },
    handoff: {
      agentMessage: 'Added product prod-1.',
      userSafeMessage: 'Added product prod-1.',
      leadInstruction: 'Enough grounded cart facts are available for the final user answer.',
      allowedClaims: ['Added product prod-1.'],
      forbiddenClaims: [],
    },
  };
}

function fakeStateClient({ calls = [], pending = [], interactions = [], events = [], memoryRows = [] } = {}) {
  return {
    cartAgentInteraction: {
      async create(args) {
        calls.push({ type: 'cartAgentInteraction.create', data: args.data });
        interactions.push(args.data);
        return args.data;
      },
      async findMany(args) {
        calls.push({ type: 'cartAgentInteraction.findMany', args });
        return interactions.slice(0, args.take);
      },
    },
    cartAgentMemory: {
      async upsert(args) {
        calls.push({ type: 'cartAgentMemory.upsert', args });
        memoryRows.unshift(args.create);
        return args.create;
      },
      async findMany(args) {
        calls.push({ type: 'cartAgentMemory.findMany', args });
        return memoryRows.slice(0, args.take);
      },
    },
    pendingCartAction: {
      async create(args) {
        const row = { id: `pending-${pending.length + 1}`, createdAt: new Date(), ...args.data };
        pending.push(row);
        calls.push({ type: 'pendingCartAction.create', data: args.data });
        return row;
      },
      async findFirst(args) {
        calls.push({ type: 'pendingCartAction.findFirst', args });
        return pending
          .filter((row) => row.userId === args.where.userId)
          .filter((row) => !args.where.cartId || row.cartId === args.where.cartId)
          .filter((row) => row.status === args.where.status)
          .filter((row) => row.expiresAt > args.where.expiresAt.gt)
          .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
      },
      async updateMany(args) {
        let count = 0;
        for (const row of pending) {
          if (row.id === args.where.id && row.status === args.where.status) {
            row.status = args.data.status;
            count += 1;
          }
        }
        calls.push({ type: 'pendingCartAction.updateMany', args });
        return { count };
      },
    },
    cartEvent: {
      async findMany(args) {
        calls.push({ type: 'cartEvent.findMany', args });
        return events.slice(0, args.take);
      },
    },
  };
}
