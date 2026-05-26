import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLedgerDraft,
  prepareCartAgentPrivateToolExecution,
  validateCartAgentPrivateToolRequest,
} from '../dist/services/agents/cart-agent-private-tool.executor.js';

test('cart private tool executor rejects unknown raw SQL and unsafe writes', () => {
  assert.deepEqual(validateCartAgentPrivateToolRequest({
    toolName: 'cart.sql.raw',
    requestId: 'req-raw',
    userId: 'user-1',
    cartId: 'cart-1',
  }), ['tool_not_allowed:cart.sql.raw']);

  const result = prepareCartAgentPrivateToolExecution({
    toolName: 'cart.write.add_item',
    requestId: 'req-add',
    userId: 'user-1',
    cartId: 'cart-1',
    productId: 'prod-1',
    quantity: 1,
  });

  assert.equal(result.status, 'rejected');
  assert.deepEqual(result.issueCodes, [
    'missing_idempotency_key:cart.write.add_item',
    'missing_expected_cart_version:cart.write.add_item',
  ]);
});

test('cart private tool executor prepares idempotent version-guarded ledger draft', () => {
  const result = prepareCartAgentPrivateToolExecution({
    toolName: 'cart.write.add_item',
    requestId: 'req-add-ok',
    userId: 'user-1',
    cartId: 'cart-1',
    idempotencyKey: 'cart-add-req-add-ok-prod-1',
    expectedCartVersion: 3,
    productId: 'prod-1',
    quantity: 2,
    actorAgent: 'cart-agent',
    sourceMessage: 'thêm sản phẩm prod-1 vào giỏ',
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.issueCodes.length, 0);
  assert.equal(result.ledgerDraft?.type, 'add');
  assert.equal(result.ledgerDraft?.cartVersionBefore, 3);
  assert.equal(result.ledgerDraft?.idempotencyKey, 'cart-add-req-add-ok-prod-1');
  assert.equal(result.ledgerDraft?.actorType, 'agent');
});

test('cart private tool executor redacts oversized source message in ledger draft', () => {
  const draft = buildLedgerDraft({
    toolName: 'cart.write.clear',
    requestId: 'req-clear',
    userId: 'user-1',
    cartId: 'cart-1',
    idempotencyKey: 'clear-key',
    expectedCartVersion: 10,
    sourceMessage: 'x'.repeat(900),
  });

  assert.equal(draft.type, 'clear');
  assert.equal(draft.sourceMessage.length, 500);
});
