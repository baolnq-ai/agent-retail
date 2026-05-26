import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PipelineExecutorService } from '../dist/services/pipeline-executor.service.js';
import { PipelineTraceBridgeService } from '../dist/services/pipeline-trace-bridge.service.js';

function request() {
  return {
    requestId: 'req-trace-1',
    userId: 'user-1',
    plan: {
      planId: 'plan-trace-1',
      taskId: 'task-trace-1',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Search then add',
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
          idempotencyKey: 'cart-add-task-trace-1',
        },
      ],
      finalConstraints: [],
    },
  };
}

test('pipeline trace bridge creates call and return playback events for canvas', async () => {
  const executor = new PipelineExecutorService();
  const traceBridge = new PipelineTraceBridgeService();
  const runtimeRequest = request();
  const result = await executor.execute(runtimeRequest, {
    handlers: {
      'catalog.search_hard': () => ({ status: 'completed', outputRefs: ['product_ref_1'] }),
      'cart.add_item': () => ({ status: 'completed', outputRefs: ['cart_ref_1'] }),
    },
  });
  const bridge = traceBridge.build(runtimeRequest, result);

  for (const id of ['pipeline-executor', 'task-context', 'lead-agent', 'search-agent', 'cart-agent', 'tool-catalog-search-hard', 'tool-cart-add-item', 'postgres-db']) {
    assert.equal(bridge.nodes.some((node) => node.id === id), true, `${id} should be present`);
  }
  assert.deepEqual(bridge.playbackEvents.slice(0, 8).map((event) => `${event.order}:${event.from}->${event.to}:${event.direction}`), [
    '1:pipeline-executor->task-context:write',
    '2:task-context->lead-agent:data',
    '11:lead-agent->search-agent:call',
    '12:task-context->search-agent:data',
    '13:search-agent->tool-catalog-search-hard:call',
    '14:tool-catalog-search-hard->postgres-db:data',
    '15:postgres-db->tool-catalog-search-hard:return',
    '16:tool-catalog-search-hard->search-agent:return',
  ]);
  assert.equal(bridge.playbackEvents.some((event) => event.from === 'search-agent' && event.to === 'task-context' && event.direction === 'write'), true);
  assert.equal(bridge.playbackEvents.some((event) => event.from === 'task-context' && event.to === 'lead-agent' && event.direction === 'return'), true);
});

test('pipeline trace bridge maps failed runtime status to dashboard error status', async () => {
  const executor = new PipelineExecutorService();
  const traceBridge = new PipelineTraceBridgeService();
  const runtimeRequest = request();
  const result = await executor.execute(runtimeRequest, {
    handlers: {
      'catalog.search_hard': () => {
        throw new Error('search_down');
      },
      'cart.add_item': () => ({ status: 'completed', outputRefs: ['cart_ref_1'] }),
    },
  });
  const bridge = traceBridge.build(runtimeRequest, result);
  const searchNode = bridge.nodes.find((node) => node.id === 'search-agent');
  const cartNode = bridge.nodes.find((node) => node.id === 'cart-agent');

  assert.equal(result.status, 'blocked');
  assert.equal(searchNode?.status, 'error');
  assert.equal(cartNode?.status, 'blocked');
  assert.equal(bridge.graphEdges.some((edge) => edge.status === 'error'), true);
});

test('pipeline trace bridge exposes infrastructure nodes for rag security and support tools', async () => {
  const executor = new PipelineExecutorService();
  const traceBridge = new PipelineTraceBridgeService();
  const runtimeRequest = {
    requestId: 'req-trace-2',
    userId: 'user-1',
    plan: {
      planId: 'plan-trace-2',
      taskId: 'task-trace-2',
      leadProfileId: 'balanced',
      status: 'planned',
      goal: 'Answer a policy/support question safely',
      refs: [],
      steps: [
        {
          id: 'rag',
          agent: 'rag-agent',
          action: 'search policy',
          toolName: 'rag.search_policy',
          executionMode: 'deterministic_tool',
          inputRefs: [],
          outputRefs: ['rag_ref_1'],
          dependsOn: [],
          successCriteria: ['policy found'],
          contextBudgetTokens: 512,
        },
        {
          id: 'support',
          agent: 'customer-support-agent',
          action: 'triage case',
          toolName: 'support.handle_case',
          executionMode: 'deterministic_tool',
          inputRefs: ['rag_ref_1'],
          outputRefs: ['support_ref_1'],
          dependsOn: ['rag'],
          successCriteria: ['support answer ready'],
          contextBudgetTokens: 512,
        },
        {
          id: 'security',
          agent: 'security-agent',
          action: 'review output',
          toolName: 'security.review_output',
          executionMode: 'deterministic_tool',
          inputRefs: ['support_ref_1'],
          outputRefs: ['security_ref_1'],
          dependsOn: ['support'],
          successCriteria: ['output allowed'],
          contextBudgetTokens: 512,
        },
      ],
      finalConstraints: [],
    },
  };
  const result = await executor.execute(runtimeRequest, {
    handlers: {
      'rag.search_policy': () => ({ status: 'completed', outputRefs: ['rag_ref_1'] }),
      'support.handle_case': () => ({ status: 'completed', outputRefs: ['support_ref_1'] }),
      'security.review_output': () => ({ status: 'completed', outputRefs: ['security_ref_1'] }),
    },
  });
  const bridge = traceBridge.build(runtimeRequest, result);

  for (const id of ['rag-agent', 'customer-support-agent', 'security-agent', 'qdrant-db', 'postgres-db', 'llm-service']) {
    assert.equal(bridge.nodes.some((node) => node.id === id), true, `${id} should be present`);
  }
  assert.equal(bridge.playbackEvents.some((event) => event.from === 'tool-rag-search-policy' && event.to === 'qdrant-db'), true);
  assert.equal(bridge.playbackEvents.some((event) => event.from === 'tool-security-review-output' && event.to === 'llm-service'), true);
});
