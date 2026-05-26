import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PipelineExecutorService } from '../dist/services/pipeline-executor.service.js';

function basePlan(steps) {
  return {
    requestId: 'req-exec-1',
    userId: 'user-1',
    plan: {
      planId: 'plan-exec-1',
      taskId: 'task-exec-1',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Resolve a product then add it to cart',
      refs: [],
      steps,
      finalConstraints: ['Only claim cart write after tool result'],
    },
  };
}

test('pipeline executor service runs steps in dependency order', async () => {
  const service = new PipelineExecutorService();
  const calls = [];
  const result = await service.execute(basePlan([
    {
      id: 'search',
      agent: 'search-agent',
      action: 'hard search',
      toolName: 'catalog.search_hard',
      executionMode: 'deterministic_tool',
      inputRefs: [],
      outputRefs: ['product_ref_1'],
      dependsOn: [],
      successCriteria: ['candidate found'],
      contextBudgetTokens: 512,
    },
    {
      id: 'cart-add',
      agent: 'cart-agent',
      action: 'add product',
      toolName: 'cart.add_item',
      executionMode: 'deterministic_tool',
      inputRefs: ['product_ref_1'],
      outputRefs: ['cart_ref_1'],
      dependsOn: ['search'],
      successCriteria: ['cart contains item'],
      contextBudgetTokens: 512,
      idempotencyKey: 'cart-add-task-exec-1',
    },
  ]), {
    handlers: {
      'catalog.search_hard': ({ step }) => {
        calls.push(step.id);
        return { status: 'completed', outputRefs: ['product_ref_1'] };
      },
      'cart.add_item': ({ step }) => {
        calls.push(step.id);
        return { status: 'completed', outputRefs: ['cart_ref_1'] };
      },
    },
  });

  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, ['search', 'cart-add']);
  assert.deepEqual(result.outputRefs, ['product_ref_1', 'cart_ref_1']);
});

test('pipeline executor service blocks missing handlers before claiming completion', async () => {
  const service = new PipelineExecutorService();
  const result = await service.execute(basePlan([
    {
      id: 'cart-add',
      agent: 'cart-agent',
      action: 'add product',
      toolName: 'cart.add_item',
      executionMode: 'deterministic_tool',
      inputRefs: ['product_ref_1'],
      outputRefs: ['cart_ref_1'],
      dependsOn: [],
      successCriteria: ['cart contains item'],
      contextBudgetTokens: 512,
      idempotencyKey: 'cart-add-task-exec-2',
    },
  ]));

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.issueCodes, ['missing_tool_handler:cart-add:cart.add_item']);
});

test('pipeline executor service retries read tools according to policy', async () => {
  const service = new PipelineExecutorService();
  let attempts = 0;
  const result = await service.execute(basePlan([
    {
      id: 'search',
      agent: 'search-agent',
      action: 'hard search',
      toolName: 'catalog.search_hard',
      executionMode: 'deterministic_tool',
      inputRefs: [],
      outputRefs: ['product_ref_1'],
      dependsOn: [],
      successCriteria: ['candidate found'],
      contextBudgetTokens: 512,
    },
  ]), {
    handlers: {
      'catalog.search_hard': ({ attempt }) => {
        attempts = attempt;
        if (attempt === 1) throw new Error('temporary_search_error');
        return { status: 'completed', outputRefs: ['product_ref_1'] };
      },
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(attempts, 2);
});

test('pipeline executor service blocks invalid write plans at validation gate', async () => {
  const service = new PipelineExecutorService();
  const result = await service.execute(basePlan([
    {
      id: 'cart-add',
      agent: 'cart-agent',
      action: 'add product',
      toolName: 'cart.add_item',
      executionMode: 'deterministic_tool',
      inputRefs: ['product_ref_1'],
      outputRefs: ['cart_ref_1'],
      dependsOn: [],
      successCriteria: ['cart contains item'],
      contextBudgetTokens: 512,
    },
  ]), {
    handlers: {
      'cart.add_item': () => ({ status: 'completed', outputRefs: ['cart_ref_1'] }),
    },
  });

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.stepResults, []);
  assert.deepEqual(result.issueCodes, ['missing_idempotency_key:cart-add:cart.add_item']);
});
