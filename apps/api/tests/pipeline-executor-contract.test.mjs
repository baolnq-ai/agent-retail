import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createExecutorPlaybackEvents,
  validateExecutorRequestBoundary,
} from '../dist/models/pipeline-executor.models.js';

const tools = [
  {
    name: 'cart.add_item',
    ownerAgent: 'cart-agent',
    sideEffect: 'write',
    requiresAuth: true,
    requiresIdempotencyKey: true,
    timeoutMs: 5000,
    retryPolicy: 'idempotent_retry',
  },
  {
    name: 'catalog.search_hard',
    ownerAgent: 'search-agent',
    sideEffect: 'none',
    requiresAuth: false,
    requiresIdempotencyKey: false,
    timeoutMs: 3000,
    retryPolicy: 'read_retry',
  },
];

test('executor boundary accepts compact refs and idempotent write tools', () => {
  const result = validateExecutorRequestBoundary({
    requestId: 'req-1',
    userId: 'user-1',
    plan: {
      planId: 'plan-1',
      taskId: 'task-1',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Add confirmed product to cart',
      refs: [{
        refId: 'product_ref_1',
        kind: 'product',
        label: 'HO mop compact ref',
        ids: ['prod_ho_mop_2'],
        confidence: 0.96,
        metadataHandle: 'meta_task_1_product_prod_ho_mop_2',
      }],
      steps: [{
        id: 'step-cart-add',
        agent: 'cart-agent',
        action: 'add resolved product',
        toolName: 'cart.add_item',
        executionMode: 'deterministic_tool',
        inputRefs: ['product_ref_1'],
        outputRefs: ['cart_ref_1'],
        dependsOn: [],
        successCriteria: ['cart item exists'],
        contextBudgetTokens: 512,
        idempotencyKey: 'cart-add-task-1-prod-ho-mop-2',
      }],
      finalConstraints: ['Only claim success after tool result'],
    },
  }, tools);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issueCodes, []);
});

test('executor boundary rejects write tools without idempotency', () => {
  const result = validateExecutorRequestBoundary({
    requestId: 'req-2',
    plan: {
      planId: 'plan-2',
      taskId: 'task-2',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Add product to cart',
      refs: [],
      steps: [{
        id: 'step-cart-add',
        agent: 'cart-agent',
        action: 'add product',
        toolName: 'cart.add_item',
        executionMode: 'deterministic_tool',
        inputRefs: [],
        outputRefs: ['cart_ref_1'],
        dependsOn: [],
        successCriteria: ['cart item exists'],
        contextBudgetTokens: 512,
      }],
      finalConstraints: [],
    },
  }, tools);

  assert.equal(result.ok, false);
  assert.deepEqual(result.issueCodes, ['missing_idempotency_key:step-cart-add:cart.add_item']);
});

test('executor boundary creates playback events from real plan steps', () => {
  const events = createExecutorPlaybackEvents({
    planId: 'plan-3',
    taskId: 'task-3',
    leadProfileId: 'balanced',
    status: 'planned',
    goal: 'Search then add',
    refs: [],
    steps: [
      {
        id: 'search',
        agent: 'search-agent',
        action: 'resolve product',
        toolName: 'catalog.search_hard',
        executionMode: 'deterministic_tool',
        inputRefs: [],
        outputRefs: ['product_ref_1'],
        dependsOn: [],
        successCriteria: ['candidate found'],
        contextBudgetTokens: 512,
      },
      {
        id: 'add',
        agent: 'cart-agent',
        action: 'add resolved product',
        toolName: 'cart.add_item',
        executionMode: 'deterministic_tool',
        inputRefs: ['product_ref_1'],
        outputRefs: ['cart_ref_1'],
        dependsOn: ['search'],
        successCriteria: ['cart item exists'],
        contextBudgetTokens: 512,
        idempotencyKey: 'cart-add-task-3',
      },
    ],
    finalConstraints: [],
  });

  assert.deepEqual(events.map((event) => `${event.from}->${event.to}:${event.label}`), [
    'pipeline-executor->search-agent:catalog.search_hard',
    'search-agent->cart-agent:cart.add_item',
  ]);
});
