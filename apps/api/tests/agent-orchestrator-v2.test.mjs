import assert from 'node:assert/strict';
import { test } from 'node:test';

const { AgentOrchestratorService } = await import('../dist/services/agent-orchestrator.service.js');

const service = new AgentOrchestratorService();
const baseParams = {
  memory: { recentTurns: [], preferences: [], recentRecommendationIds: [], rollingSummary: undefined, pendingCartPlan: undefined },
  cart: { id: 'cart-1', userId: 'user-1', status: 'active', version: 1, items: [], subtotal: 0, currency: 'VND', createdAt: '', updatedAt: '' },
  candidates: [],
};

test('orchestrator emits pipeline v2 agents for product recommendation', () => {
  const plan = service.plan({ ...baseParams, message: 'goi y 2 san pham duoi 4 trieu' });
  assert.deepEqual(plan.pipelineAgents, ['lead-agent', 'storage-memory-agent', 'search-agent', 'recommendation-agent', 'security-agent', 'sales-agent']);
});

test('orchestrator emits cart agent without product display agents for cart status', () => {
  const plan = service.plan({ ...baseParams, message: 'cho xem gio hang' });
  assert.deepEqual(plan.pipelineAgents, ['lead-agent', 'storage-memory-agent', 'cart-agent', 'security-agent', 'sales-agent']);
  assert.equal(plan.shouldUseCart, true);
  assert.equal(plan.shouldShowProducts, false);
});

test('orchestrator adds history agent for vague follow-up references', () => {
  const plan = service.plan({ ...baseParams, message: 'add san pham do vao cart' });
  assert.ok(plan.pipelineAgents.includes('history-agent'));
  assert.ok(plan.pipelineAgents.includes('cart-agent'));
});
