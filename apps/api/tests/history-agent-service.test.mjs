import assert from 'node:assert/strict';
import test from 'node:test';
import { HistoryAgentService } from '../dist/services/agents/history-agent.service.js';

test('history agent resolves previous recommendation with evidence and sales/search hints', async () => {
  const service = new HistoryAgentService(fakeStorage(memoryContext({
    recommendationIds: ['prod-air'],
    productIds: ['prod-air'],
    indexes: [{ sourceAgent: 'recommendation-agent', sourceId: 'rec-1', summary: 'Recommended prod-air.', productIds: ['prod-air'] }],
  })));

  const result = await service.resolve({ userId: 'user-1', requestId: 'req-1', message: 'san pham vua de xuat co nen mua khong' });

  assert.equal(result.status, 'resolved');
  assert.equal(result.ambiguity.type, 'previous_recommendation');
  assert.deepEqual(result.handoff.mustMentionProductIds, ['prod-air']);
  assert.equal(result.resolvedReferences[0].evidence[0].source, 'recommendation-agent');
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'search'), true);
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'sales'), true);
});

test('history agent resolves ordinal to the matching previous product', async () => {
  const service = new HistoryAgentService(fakeStorage(memoryContext({
    recommendationIds: ['prod-1', 'prod-2', 'prod-3'],
    productIds: ['prod-1', 'prod-2', 'prod-3'],
    indexes: [
      { sourceAgent: 'recommendation-agent', sourceId: 'rec-1', summary: 'Three products.', productIds: ['prod-1', 'prod-2', 'prod-3'] },
    ],
  })));

  const result = await service.resolve({ userId: 'user-1', requestId: 'req-2', message: 'cai thu hai re hon khong' });

  assert.equal(result.status, 'resolved');
  assert.equal(result.ambiguity.type, 'ordinal');
  assert.equal(result.resolvedReferences[0].productId, 'prod-2');
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'recommendation'), true);
});

test('history agent returns ambiguous for pronoun with multiple recent products', async () => {
  const service = new HistoryAgentService(fakeStorage(memoryContext({
    productIds: ['prod-1', 'prod-2'],
    indexes: [{ sourceAgent: 'search-agent', sourceId: 'search-1', summary: 'Two products.', productIds: ['prod-1', 'prod-2'] }],
  })));

  const result = await service.resolve({ userId: 'user-1', requestId: 'req-3', message: 'cai do them vao gio di' });

  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(result.handoff.mustMentionProductIds, []);
  assert.equal(result.nextAgentHints[0].agent, 'lead');
});

test('history agent resolves all referenced products when user says them het', async () => {
  const service = new HistoryAgentService(fakeStorage(memoryContext({
    productIds: ['prod-1', 'prod-2'],
    recommendationIds: ['prod-1', 'prod-2'],
    indexes: [{ sourceAgent: 'recommendation-agent', sourceId: 'rec-1', summary: 'Two products.', productIds: ['prod-1', 'prod-2'] }],
  })));

  const result = await service.resolve({ userId: 'user-1', requestId: 'req-4', message: 'them het cac cai do vao gio' });

  assert.equal(result.status, 'resolved');
  assert.deepEqual(result.handoff.mustMentionProductIds, ['prod-1', 'prod-2']);
  assert.equal(result.nextAgentHints.some((hint) => hint.agent === 'cart'), true);
});

test('history rail consistency rejects unexpected product ids', () => {
  const service = new HistoryAgentService(fakeStorage(memoryContext({ productIds: ['prod-1'] })));
  const result = service.validateRailConsistency({
    history: {
      status: 'resolved',
      ambiguity: { type: 'previous_recommendation', confidence: 0.9 },
      resolvedReferences: [],
      missingInfo: [],
      nextAgentHints: [],
      handoff: {
        agentMessage: '',
        leadInstruction: '',
        allowedClaims: [],
        forbiddenClaims: [],
        mustMentionProductIds: ['prod-1'],
        mustNotMentionProductIds: [],
      },
    },
    textProductIds: ['prod-1', 'prod-evil'],
    railProductIds: ['prod-1'],
  });

  assert.equal(result.pass, false);
  assert.deepEqual(result.unexpectedProductIds, ['prod-evil']);
});

function fakeStorage(context) {
  return {
    async getContext() {
      return context;
    },
  };
}

function memoryContext({ productIds = [], recommendationIds = [], cartIds = [], indexes = [] }) {
  return {
    need: 'near_mid_far',
    brief: productIds.length ? `Recent product refs: ${productIds.join(', ')}` : 'No refs',
    near: [],
    midSummaries: [],
    farProfile: [],
    preferences: [],
    behaviorSignals: [],
    agentIndexes: indexes.map((item) => ({
      sourceTable: 'MemoryAgentIndex',
      cartId: undefined,
      confidence: 0.9,
      tags: [],
      createdAt: '2026-05-22T00:00:00.000Z',
      ...item,
    })),
    evidence: indexes.map((item) => `MemoryAgentIndex:${item.sourceId}`),
    references: {
      lastProductIds: productIds,
      lastRecommendationIds: recommendationIds,
      lastCartProductIds: cartIds,
    },
    tokenEstimate: 100,
    truncated: false,
    confidence: indexes.length ? 0.82 : 0.2,
  };
}
