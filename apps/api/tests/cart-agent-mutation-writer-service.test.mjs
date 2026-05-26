import assert from 'node:assert/strict';
import test from 'node:test';
import {
  executeCartAgentMutationTransaction,
} from '../dist/services/agents/cart-agent-mutation-writer.service.js';

test('cart mutation writer atomically adds item, updates totals, event ledger and idempotency', async () => {
  const state = fakeCartState();
  const client = fakeMutationClient(state);

  const result = await executeCartAgentMutationTransaction(client, addRequest());

  assert.equal(result.status, 'completed');
  assert.equal(result.eventCreated, true);
  assert.equal(result.cartVersionBefore, 3);
  assert.equal(result.cartVersionAfter, 4);
  assert.equal(result.quantityBefore, 1);
  assert.equal(result.quantityAfter, 3);
  assert.equal(result.subtotalBefore, 1000);
  assert.equal(result.subtotalAfter, 3000);
  assert.equal(state.cart.version, 4);
  assert.equal(state.cart.subtotal, 3000);
  assert.equal(state.items[0].quantity, 3);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].quantityBefore, 1);
  assert.equal(state.events[0].quantityAfter, 3);
  assert.equal(state.idempotency.size, 1);
});

test('cart mutation writer replays idempotency without duplicate mutation or event', async () => {
  const state = fakeCartState();
  state.idempotency.set('cart-agent:cart.write.add_item::idem-add-1', { status: 'completed', replayed: true });
  const client = fakeMutationClient(state);

  const result = await executeCartAgentMutationTransaction(client, addRequest());

  assert.equal(result.status, 'replayed');
  assert.deepEqual(result.responseJson, { status: 'completed', replayed: true });
  assert.equal(state.cart.version, 3);
  assert.equal(state.items[0].quantity, 1);
  assert.equal(state.events.length, 0);
});

test('cart mutation writer rejects stale cart version before writing items', async () => {
  const state = fakeCartState();
  const client = fakeMutationClient(state);

  const result = await executeCartAgentMutationTransaction(client, {
    ...addRequest(),
    expectedCartVersion: 2,
  });

  assert.equal(result.status, 'conflict');
  assert.deepEqual(result.issueCodes, ['stale_cart_version']);
  assert.equal(state.cart.version, 3);
  assert.equal(state.items[0].quantity, 1);
  assert.equal(state.events.length, 0);
});

test('cart mutation writer clears cart with ledger evidence', async () => {
  const state = fakeCartState();
  const client = fakeMutationClient(state);

  const result = await executeCartAgentMutationTransaction(client, {
    toolName: 'cart.write.clear',
    requestId: 'req-clear-1',
    userId: 'user-1',
    cartId: 'cart-1',
    idempotencyKey: 'idem-clear-1',
    expectedCartVersion: 3,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.subtotalAfter, 0);
  assert.equal(state.items.length, 0);
  assert.equal(state.events[0].type, 'clear');
  assert.equal(state.events[0].cartVersionAfter, 4);
});

test('cart mutation writer covers set, increment, decrement and remove tools', async () => {
  const cases = [
    { toolName: 'cart.write.set_quantity', quantity: 4, expectedQuantity: 4, expectedSubtotal: 4000, eventType: 'set_quantity' },
    { toolName: 'cart.write.increment_item', quantity: 2, expectedQuantity: 3, expectedSubtotal: 3000, eventType: 'increment' },
    { toolName: 'cart.write.decrement_item', quantity: 1, expectedQuantity: 0, expectedSubtotal: 0, eventType: 'decrement' },
    { toolName: 'cart.write.remove_item', quantity: undefined, expectedQuantity: 0, expectedSubtotal: 0, eventType: 'remove' },
  ];

  for (const testCase of cases) {
    const state = fakeCartState();
    const client = fakeMutationClient(state);
    const result = await executeCartAgentMutationTransaction(client, {
      ...addRequest(),
      toolName: testCase.toolName,
      quantity: testCase.quantity,
      idempotencyKey: `idem-${testCase.toolName}`,
      requestId: `req-${testCase.toolName}`,
    });

    assert.equal(result.status, 'completed', testCase.toolName);
    assert.equal(result.quantityAfter, testCase.expectedQuantity, testCase.toolName);
    assert.equal(result.subtotalAfter, testCase.expectedSubtotal, testCase.toolName);
    assert.equal(state.cart.version, 4, testCase.toolName);
    assert.equal(state.events[0].type, testCase.eventType, testCase.toolName);
    const itemQuantity = state.items.find((item) => item.productId === 'prod-1')?.quantity ?? 0;
    assert.equal(itemQuantity, testCase.expectedQuantity, testCase.toolName);
  }
});

test('cart mutation writer rejects quantity above inventory without writing event', async () => {
  const state = fakeCartState();
  const client = fakeMutationClient(state);

  const result = await executeCartAgentMutationTransaction(client, {
    ...addRequest(),
    quantity: 10,
  });

  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.issueCodes, ['out_of_stock']);
  assert.equal(state.items[0].quantity, 1);
  assert.equal(state.events.length, 0);
  assert.equal(state.idempotency.size, 0);
});

function addRequest() {
  return {
    toolName: 'cart.write.add_item',
    requestId: 'req-add-1',
    userId: 'user-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    quantity: 2,
    idempotencyKey: 'idem-add-1',
    expectedCartVersion: 3,
    actorAgent: 'cart-agent',
    sourceMessage: 'add prod-1',
  };
}

function fakeCartState() {
  return {
    cart: { id: 'cart-1', userId: 'user-1', version: 3, status: 'active', subtotal: 1000, grandTotal: 1000 },
    products: new Map([['prod-1', { id: 'prod-1', price: 1000, inventory: 5 }]]),
    items: [{ cartId: 'cart-1', productId: 'prod-1', quantity: 1, unitPrice: 1000, lineTotal: 1000 }],
    events: [],
    idempotency: new Map(),
  };
}

function fakeMutationClient(state) {
  return {
    idempotencyKey: {
      async findUnique(args) {
        return getIdempotency(state, args.where.scope_key.scope, args.where.scope_key.key);
      },
      async create(args) {
        state.idempotency.set(`${args.data.scope}::${args.data.key}`, args.data.responseJson);
        return args.data;
      },
    },
    cartEvent: {
      async create(args) {
        state.events.push(args.data);
        return args.data;
      },
    },
    cart: {
      async findUnique(args) {
        return args.where.id === state.cart.id ? { ...state.cart } : null;
      },
      async updateMany(args) {
        if (args.where.id !== state.cart.id || args.where.version !== state.cart.version || args.where.userId !== state.cart.userId) {
          return { count: 0 };
        }
        state.cart = {
          ...state.cart,
          subtotal: args.data.subtotal,
          grandTotal: args.data.grandTotal,
          version: state.cart.version + (args.data.version?.increment ?? 0),
        };
        return { count: 1 };
      },
    },
    product: {
      async findUnique(args) {
        return state.products.get(args.where.id) ?? null;
      },
    },
    cartItem: {
      async findUnique(args) {
        const key = args.where.cartId_productId;
        return cloneItem(state.items.find((item) => item.cartId === key.cartId && item.productId === key.productId));
      },
      async findMany(args) {
        return state.items.filter((item) => item.cartId === args.where.cartId).map(cloneItem);
      },
      async upsert(args) {
        const key = args.where.cartId_productId;
        const existingIndex = state.items.findIndex((item) => item.cartId === key.cartId && item.productId === key.productId);
        const next = existingIndex >= 0 ? { ...state.items[existingIndex], ...args.update } : { ...args.create };
        if (existingIndex >= 0) state.items[existingIndex] = next;
        else state.items.push(next);
        return cloneItem(next);
      },
      async deleteMany(args) {
        const before = state.items.length;
        state.items = state.items.filter((item) => {
          if (item.cartId !== args.where.cartId) return true;
          if (args.where.productId && item.productId !== args.where.productId) return true;
          return false;
        });
        return { count: before - state.items.length };
      },
    },
  };
}

function getIdempotency(state, scope, key) {
  const responseJson = state.idempotency.get(`${scope}::${key}`);
  return responseJson ? { responseJson } : null;
}

function cloneItem(item) {
  return item ? { ...item } : null;
}
