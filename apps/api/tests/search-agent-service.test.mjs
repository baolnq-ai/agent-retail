import assert from 'node:assert/strict';
import test from 'node:test';
import { SearchAgentService } from '../dist/services/agents/search-agent.service.js';

test('search agent returns exact product title first', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) });
  const result = await service.runGoal({ requestId: 'req-1', query: 'AiroClean P35' });

  assert.equal(result.status, 'completed');
  assert.equal(result.matchType, 'exact');
  assert.equal(result.usedLanes.includes('exact'), true);
  assert.equal(result.candidates[0].productId, 'prod-air-p35');
});

test('search agent applies hard budget stock and category filters', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) });
  const result = await service.runGoal({
    requestId: 'req-2',
    query: 'may loc khong khi',
    filters: { category: 'dien gia dung', budgetMax: 2000000, requireInStock: true },
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.usedLanes.includes('filter'), true);
  assert.deepEqual(result.candidates.map((item) => item.productId), ['prod-air-mini']);
});

test('search agent uses semantic fallback with clear wording when exact is missing', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) });
  const result = await service.runGoal({ requestId: 'req-3', query: 'máy làm sạch bụi phòng ngủ z999', fallbackPolicy: 'embedding_if_low_recall' });

  assert.equal(result.status, 'completed');
  assert.equal(result.matchType, 'semantic_fallback');
  assert.equal(result.usedLanes.includes('embedding'), true);
  assert.equal(result.issues.some((issue) => issue.code === 'semantic_fallback_used'), true);
  assert.match(result.handoff.leadInstruction, /no exact product\/name was found/i);
  assert.equal(result.handoff.forbiddenClaims.some((claim) => /exact matches/i.test(claim)), true);
});

test('search agent hard only returns no exact semantic claims', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) });
  const result = await service.runGoal({ requestId: 'req-4', query: 'unknown z999', fallbackPolicy: 'hard_only' });

  assert.equal(result.status, 'no_results');
  assert.equal(result.usedLanes.includes('embedding'), false);
  assert.equal(result.matchType, 'none');
});

test('search agent writes private interaction and near memory', async () => {
  const client = fakeClient(products());
  const service = new SearchAgentService({ client });
  await service.runGoal({ requestId: 'req-5', userId: 'user-1', query: 'AiroClean P35' });

  assert.equal(client.rows.searchAgentInteraction.length, 1);
  assert.equal(client.rows.searchAgentInteraction[0].selectedProductIds[0], 'prod-air-p35');
  assert.equal(client.rows.searchAgentMemory.length, 1);
  assert.match(client.rows.searchAgentMemory[0].summary, /prod-air-p35/);
});

function fakeClient(seedProducts) {
  const rows = { searchAgentInteraction: [], searchAgentMemory: [] };
  return {
    rows,
    product: {
      async findMany() {
        return seedProducts;
      },
      async findUnique(args) {
        return seedProducts.find((product) => product.id === args.where.id) ?? null;
      },
    },
    searchAgentInteraction: {
      async create(args) {
        const row = { id: `interaction-${rows.searchAgentInteraction.length + 1}`, ...args.data };
        rows.searchAgentInteraction.unshift(row);
        return row;
      },
    },
    searchAgentMemory: {
      async upsert(args) {
        const row = { id: `memory-${rows.searchAgentMemory.length + 1}`, ...args.create };
        rows.searchAgentMemory.unshift(row);
        return row;
      },
      async findMany() {
        return rows.searchAgentMemory;
      },
    },
  };
}

function products() {
  return [
    {
      id: 'prod-air-p35',
      title: 'AiroClean P35',
      brand: 'AiroClean',
      category: 'Dien gia dung',
      price: 3490000,
      currency: 'VND',
      inventory: 5,
      attributes: { roomSize: '25-35m2', filter: 'HEPA H13' },
      description: 'may loc khong khi cho phong lon, loc bui PM2.5',
    },
    {
      id: 'prod-air-mini',
      title: 'FreshHome Mini 20',
      brand: 'FreshHome',
      category: 'Dien gia dung',
      price: 1990000,
      currency: 'VND',
      inventory: 4,
      attributes: { roomSize: '15-22m2', filter: 'HEPA H12' },
      description: 'may loc khong khi nho gon phong ngu',
    },
    {
      id: 'prod-kitchen-af',
      title: 'ChefMax AF55',
      brand: 'ChefMax',
      category: 'Thiet bi nha bep',
      price: 2290000,
      currency: 'VND',
      inventory: 2,
      attributes: { capacity: '5.5L' },
      description: 'noi chien khong dau',
    },
  ];
}
