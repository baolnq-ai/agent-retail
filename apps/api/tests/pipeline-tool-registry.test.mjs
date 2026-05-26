import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PIPELINE_SERVER_TOOLS,
  assertPipelineToolPolicy,
  getPipelineTool,
} from '../dist/services/pipeline-tool.registry.js';
import { validateExecutorRequestBoundary } from '../dist/models/pipeline-executor.models.js';

test('pipeline tool registry defines unique production tool policies', () => {
  assert.equal(PIPELINE_SERVER_TOOLS.length, 22);
  assert.equal(new Set(PIPELINE_SERVER_TOOLS.map((tool) => tool.name)).size, 22);
  assert.deepEqual(assertPipelineToolPolicy(), []);
});

test('pipeline tool registry marks user-data writes as auth and idempotency protected', () => {
  for (const tool of PIPELINE_SERVER_TOOLS.filter((definition) => definition.sideEffect === 'write' && !definition.name.startsWith('trace.'))) {
    assert.equal(tool.requiresAuth, true, `${tool.name} must require auth`);
    assert.equal(tool.requiresIdempotencyKey, true, `${tool.name} must require idempotency`);
    assert.equal(tool.retryPolicy, 'idempotent_retry', `${tool.name} must use idempotent retry`);
  }

  assert.equal(getPipelineTool('cart.add_item')?.ownerAgent, 'cart-agent');
  assert.equal(getPipelineTool('catalog.search_semantic')?.sideEffect, 'none');
  assert.equal(getPipelineTool('cart.sql.raw'), undefined);
});

test('pipeline executor validates plans against shared tool registry', () => {
  const result = validateExecutorRequestBoundary({
    requestId: 'req-registry-1',
    userId: 'user-1',
    plan: {
      planId: 'plan-registry-1',
      taskId: 'task-registry-1',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Search exact product then add to cart',
      refs: [],
      steps: [
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
          idempotencyKey: 'cart-add-task-registry-1',
        },
      ],
      finalConstraints: ['Only claim success after cart.add_item result'],
    },
  }, PIPELINE_SERVER_TOOLS);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issueCodes, []);
});
