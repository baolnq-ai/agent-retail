import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cartAgentIdempotencyScope,
  persistCartAgentLedgerDraft,
} from '../dist/services/agents/cart-agent-ledger.service.js';

test('cart agent ledger persists event and idempotency response', async () => {
  const calls = [];
  const client = fakeLedgerClient({ calls });
  const responseJson = { cartId: 'cart-1', status: 'completed' };

  const result = await persistCartAgentLedgerDraft(client, {
    cartId: 'cart-1',
    userId: 'user-1',
    requestId: 'req-1',
    idempotencyKey: 'idem-1',
    type: 'add',
    productId: 'prod-1',
    quantityAfter: 2,
    cartVersionBefore: 4,
    actorType: 'agent',
    actorAgent: 'cart-agent',
    toolName: 'cart.write.add_item',
    sourceMessage: 'add prod-1',
  }, responseJson);

  assert.equal(result.status, 'created');
  assert.equal(result.eventCreated, true);
  assert.equal(result.idempotencyScope, 'cart-agent:cart.write.add_item');
  assert.equal(calls.some((call) => call.type === 'cartEvent.create' && call.data.productId === 'prod-1'), true);
  assert.equal(calls.some((call) => call.type === 'idempotencyKey.create' && call.data.responseJson === responseJson), true);
});

test('cart agent ledger replays existing idempotency response without duplicate event', async () => {
  const calls = [];
  const cached = { cartId: 'cart-1', status: 'completed' };
  const client = fakeLedgerClient({ calls, cached });

  const result = await persistCartAgentLedgerDraft(client, {
    cartId: 'cart-1',
    userId: 'user-1',
    requestId: 'req-2',
    idempotencyKey: 'idem-1',
    type: 'add',
    productId: 'prod-1',
    actorType: 'agent',
    actorAgent: 'cart-agent',
    toolName: 'cart.write.add_item',
  }, { status: 'new' });

  assert.equal(result.status, 'replayed');
  assert.equal(result.eventCreated, false);
  assert.deepEqual(result.responseJson, cached);
  assert.equal(calls.some((call) => call.type === 'cartEvent.create'), false);
});

test('cart agent ledger scope is namespaced per private tool', () => {
  assert.equal(cartAgentIdempotencyScope('cart.write.clear'), 'cart-agent:cart.write.clear');
});

function fakeLedgerClient({ calls, cached } = { calls: [] }) {
  return {
    idempotencyKey: {
      async findUnique(args) {
        calls.push({ type: 'idempotencyKey.findUnique', args });
        return cached ? { responseJson: cached } : null;
      },
      async create(args) {
        calls.push({ type: 'idempotencyKey.create', data: args.data });
        return args.data;
      },
    },
    cartEvent: {
      async create(args) {
        calls.push({ type: 'cartEvent.create', data: args.data });
        return args.data;
      },
    },
  };
}
