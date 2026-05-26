import assert from 'node:assert/strict';
import test from 'node:test';
import { StorageMemoryAgentService, estimateMemoryTokens } from '../dist/services/agents/storage-memory-agent.service.js';

test('storage memory writes redacted turns and near evidence', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  const result = await service.writeTurn({
    userId: 'user-1',
    requestId: 'req-1',
    role: 'user',
    content: 'Email a@shop.vn phone 0901234567 token=abc123',
    metadata: { authorization: 'Bearer secret', productIds: ['prod-1'] },
  });

  assert.equal(result.status, 'completed');
  assert.match(client.rows.memoryTurn[0].content, /\[redacted-email\]/);
  assert.match(client.rows.memoryTurn[0].content, /\[redacted-phone\]/);
  assert.equal(client.rows.memoryTurn[0].metadata.authorization, '[redacted]');
  assert.equal(client.rows.memoryItem[0].tier, 'near');
  assert.deepEqual(client.rows.memoryItem[0].sourceRefs, [{ table: 'MemoryTurn', id: result.id }]);
});

test('storage memory context returns evidence, product refs, and bounded brief', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  await service.writeAgentResult({
    userId: 'user-1',
    sourceAgent: 'recommendation-agent',
    sourceTable: 'RecommendationRun',
    sourceId: 'rec-1',
    summary: 'Recommended air purifier and mop.',
    tags: ['recommend'],
    productIds: ['prod-air', 'prod-mop'],
    confidence: 0.9,
  });
  await service.writeAgentResult({
    userId: 'user-1',
    sourceAgent: 'cart-agent',
    sourceTable: 'CartAgentInteraction',
    sourceId: 'cart-run-1',
    summary: 'Added prod-air to cart.',
    tags: ['cart'],
    productIds: ['prod-air'],
    cartId: 'cart-1',
    confidence: 0.88,
  });
  await service.updatePreference({
    userId: 'user-1',
    key: 'recent_recommendations',
    value: ['prod-air', 'prod-mop'],
    confidence: 0.86,
    sourceRefs: [{ table: 'MemoryAgentIndex', id: 'rec-1', agent: 'recommendation-agent' }],
  });
  await service.writeBehaviorSignal({
    userId: 'user-1',
    productId: 'prod-air',
    category: 'air',
    type: 'view',
    weight: 1,
    sourceAgent: 'recommendation-agent',
  });

  const context = await service.getContext({
    userId: 'user-1',
    message: 'san pham vua de xuat luc nay la gi',
    tokenBudget: 900,
  });

  assert.equal(context.need, 'near_mid_far');
  assert.deepEqual(context.references.lastRecommendationIds, ['prod-air', 'prod-mop']);
  assert.deepEqual(context.references.lastCartProductIds, ['prod-air']);
  assert.equal(context.agentIndexes.length, 2);
  assert.equal(context.preferences[0].key, 'recent_recommendations');
  assert.equal(context.behaviorSignals[0].productId, 'prod-air');
  assert.ok(context.evidence.some((item) => item.startsWith('MemoryAgentIndex:')));
  assert.match(context.brief, /Recent product refs/);
  assert.equal(context.tokenEstimate <= 900, true);
});

test('storage memory summarizes near memory into mid memory with refs', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  await service.writeTurn({ userId: 'user-1', requestId: 'req-1', role: 'user', content: 'toi can may loc phong khach' });
  await service.writeEvent({
    userId: 'user-1',
    requestId: 'req-1',
    sourceAgent: 'search-agent',
    type: 'search_result',
    payload: { productIds: ['prod-air'] },
    confidence: 0.8,
  });

  const result = await service.summarizeNearToMid({ userId: 'user-1', requestId: 'req-1' });

  assert.equal(result.status, 'completed');
  assert.ok(client.rows.memorySummary.length >= 1);
  assert.ok(client.rows.memoryItem.some((row) => row.tier === 'mid' && row.key === 'session:req-1:summary'));
  assert.ok(result.evidence.every((item) => item.startsWith('MemoryItem:')));
});

test('storage memory compacts mid preferences and behavior into far profile', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  await service.writeTurn({ userId: 'user-1', requestId: 'req-1', role: 'user', content: 'toi hay mua hang gia tot' });
  await service.summarizeNearToMid({ userId: 'user-1', requestId: 'req-1' });
  await service.updatePreference({
    userId: 'user-1',
    key: 'budget',
    value: { max: 2000000 },
    confidence: 0.8,
    sourceRefs: [{ table: 'MemoryTurn', id: 'memoryTurn-1' }],
  });
  await service.writeBehaviorSignal({ userId: 'user-1', productId: 'prod-air', type: 'view', weight: 2, sourceAgent: 'search-agent' });

  const result = await service.summarizeMidToFar({ userId: 'user-1' });

  assert.equal(result.status, 'completed');
  assert.ok(client.rows.memoryItem.some((row) => row.tier === 'far' && row.key === 'profile:stable-summary'));
  assert.match(client.rows.memoryItem.find((row) => row.key === 'profile:stable-summary').summary, /Preferences/);
});

test('storage memory export redacts and retention removes expired near items', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  await service.writeTurn({ userId: 'user-1', requestId: 'req-1', role: 'user', content: 'token=abc email a@shop.vn' });
  client.rows.memoryItem[0].expiresAt = new Date('2026-01-01T00:00:00.000Z');

  const exported = await service.exportUserMemory('user-1');
  assert.match(exported.turns[0].content, /\[redacted-email\]/);
  assert.match(exported.turns[0].content, /token=\[redacted\]/);

  const retention = await service.applyRetention({ userId: 'user-1', now: new Date('2026-05-22T00:00:00.000Z') });
  assert.equal(retention.deletedExpiredItems, 1);
});

test('storage memory delete removes all memory-owned rows', async () => {
  const client = fakeMemoryClient();
  const service = new StorageMemoryAgentService({ client });

  await service.writeTurn({ userId: 'user-1', requestId: 'req-1', role: 'user', content: 'hello' });
  await service.writeAgentResult({ userId: 'user-1', sourceAgent: 'cart-agent', sourceTable: 'CartAgentInteraction', sourceId: 'cart-1', summary: 'cart', productIds: ['prod-1'] });

  const result = await service.deleteUserMemory('user-1');

  assert.equal(result.deleted.turns, 1);
  assert.equal(result.deleted.items, 2);
  assert.equal(result.deleted.agentIndexes, 1);
  assert.equal(client.rows.memoryItem.length, 0);
});

test('estimateMemoryTokens stays deterministic', () => {
  assert.equal(estimateMemoryTokens('abcd'), 1);
  assert.equal(estimateMemoryTokens('abcde'), 2);
});

function fakeMemoryClient() {
  const rows = {
    memoryTurn: [],
    memoryEvent: [],
    memoryItem: [],
    memorySummary: [],
    memoryPreference: [],
    memoryBehaviorSignal: [],
    memoryAgentIndex: [],
  };
  const nextId = (name) => `${name}-${rows[name].length + 1}`;
  const createDelegate = (name) => ({
    async create(args) {
      const row = { id: nextId(name), createdAt: new Date(), updatedAt: new Date(), ...args.data };
      rows[name].unshift(row);
      return row;
    },
    async findMany(args = {}) {
      return filterRows(rows[name], args.where).slice(0, args.take ?? rows[name].length);
    },
    async deleteMany(args = {}) {
      const before = rows[name].length;
      const kept = rows[name].filter((row) => !matchesWhere(row, args.where));
      rows[name].splice(0, rows[name].length, ...kept);
      return { count: before - rows[name].length };
    },
  });
  const upsertDelegate = (name, keyFields) => ({
    ...createDelegate(name),
    async upsert(args) {
      const existing = rows[name].find((row) => keyFields.every((field) => readPath(row, field) === readPath(args.where, field)));
      if (existing) {
        Object.assign(existing, args.update, { updatedAt: new Date() });
        return existing;
      }
      const row = { id: nextId(name), createdAt: new Date(), updatedAt: new Date(), ...args.create };
      rows[name].unshift(row);
      return row;
    },
  });

  return {
    rows,
    memoryTurn: createDelegate('memoryTurn'),
    memoryEvent: createDelegate('memoryEvent'),
    memoryItem: upsertDelegate('memoryItem', ['userId_tier_key.userId', 'userId_tier_key.tier', 'userId_tier_key.key']),
    memorySummary: createDelegate('memorySummary'),
    memoryPreference: upsertDelegate('memoryPreference', ['userId_key.userId', 'userId_key.key']),
    memoryBehaviorSignal: createDelegate('memoryBehaviorSignal'),
    memoryAgentIndex: createDelegate('memoryAgentIndex'),
  };
}

function filterRows(rows, where = {}) {
  return rows.filter((row) => matchesWhere(row, where));
}

function matchesWhere(row, where = {}) {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') continue;
    if (value && typeof value === 'object' && 'in' in value) {
      if (!value.in.includes(row[key])) return false;
      continue;
    }
    if (value && typeof value === 'object' && 'lt' in value) {
      if (!(row[key] < value.lt)) return false;
      continue;
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function readPath(value, path) {
  return path.split('.').reduce((node, key) => node?.[key], value);
}
