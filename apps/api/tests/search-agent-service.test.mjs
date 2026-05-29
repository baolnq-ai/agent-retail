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

test('search agent does not use embedding fallback for product search', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) }, fakeModelGateway(), fakeQdrant('prod-air-mini'));
  const result = await service.runGoal({ requestId: 'req-3', query: 'máy làm sạch bụi phòng ngủ z999', fallbackPolicy: 'broad_lexical_if_low_recall' });

  assert.equal(result.status, 'completed');
  assert.equal(result.usedLanes.includes('embedding'), false);
  assert.equal(result.candidates.some((item) => item.productId === 'prod-air-mini'), true);
});

test('search agent expands air conditioner intent without jumping to kitchen products', async () => {
  const service = new SearchAgentService({ client: fakeClient(products()) }, fakeModelGateway(), fakeQdrant('prod-kitchen-af'));
  const result = await service.runGoal({ requestId: 'req-air-family', query: 'toi muon tim may lanh', fallbackPolicy: 'broad_lexical_if_low_recall' });

  assert.equal(result.status, 'completed');
  assert.equal(result.issues.some((issue) => issue.code === 'related_family_expanded'), true);
  assert.equal(result.candidates.some((item) => item.productId === 'prod-cooling-fan'), true);
  assert.equal(result.candidates.some((item) => item.productId === 'prod-air-p35' || item.productId === 'prod-air-mini'), false);
  assert.equal(result.candidates.some((item) => item.productId === 'prod-kitchen-af'), false);
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

function fakeModelGateway() {
  return {
    async embed(texts) {
      return texts.map((text, index) => [1, index + 1, text.length % 17]);
    },
  };
}

function fakeQdrant(productId) {
  return {
    async ensureCollection() {},
    async upsert() {},
    async search() {
      return [{ productId, score: 0.82 }];
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
      id: 'prod-cooling-fan',
      title: 'Quat dieu hoa Midea AC120',
      brand: 'Midea',
      category: 'Lam mat',
      price: 2490000,
      currency: 'VND',
      inventory: 3,
      attributes: { tank: '30L' },
      description: 'quat dieu hoa lam mat khong khi phong ngu',
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
