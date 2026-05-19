import assert from 'node:assert/strict';
import test from 'node:test';

const { detectSalesIntent } = await import('../dist/services/agent-orchestrator.service.js');
const { UserAnalysisAgentService } = await import('../dist/services/agents/user-analysis-agent.service.js');
const { MemoryAgentService } = await import('../dist/services/agents/memory-agent.service.js');
const { ProductManagerAgentService } = await import('../dist/services/agents/product-manager-agent.service.js');
const { RecommendationAgentService } = await import('../dist/services/agents/recommendation-agent.service.js');

test('detectSalesIntent does not recommend from product mention alone', () => {
  assert.equal(detectSalesIntent('sản phẩm trong giỏ hiện tại có gì?'), 'cart_status');
  assert.equal(detectSalesIntent('sản phẩm này bảo hành thế nào?'), 'smalltalk');
  assert.equal(detectSalesIntent('gợi ý 2 sản phẩm dưới 4 triệu'), 'recommend');
});

test('user analysis resolves new product from memory investigation', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'thêm sản phẩm mới vào giỏ',
    memoryInvestigation: {
      requiresHistory: true,
      resolvedReference: 'new_product',
      referenceProductIds: ['prod-new'],
      lastSelectedProductIds: ['prod-new'],
      lastCartActionProductIds: [],
      confidence: 0.86,
    },
  });

  assert.equal(analysis.intent, 'cart_action');
  assert.equal(analysis.cartOperation, 'add');
  assert.equal(analysis.retrievalMode, 'recent');
  assert.equal(analysis.shouldShowProducts, true);
  assert.deepEqual(analysis.references.resolvedProductIds, ['prod-new']);
  assert.equal(analysis.needsClarification, undefined);
});

test('user analysis resolves category-like add follow-up from memory', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'thêm máy lọc đi',
    memoryInvestigation: {
      requiresHistory: false,
      resolvedReference: 'last_recommendation',
      referenceProductIds: ['air-filter-1'],
      lastSelectedProductIds: ['air-filter-1'],
      lastCartActionProductIds: [],
      confidence: 0.86,
    },
  });

  assert.equal(analysis.intent, 'cart_action');
  assert.equal(analysis.cartOperation, 'add');
  assert.equal(analysis.retrievalMode, 'recent');
  assert.deepEqual(analysis.references.resolvedProductIds, ['air-filter-1']);
  assert.match(analysis.references.productName, /máy lọc/);
});

test('user analysis treats more product request as alternatives', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'Cho nhiều sản phẩm hơn',
    memoryInvestigation: {
      requiresHistory: true,
      resolvedReference: 'another_option',
      referenceProductIds: [],
      lastSelectedProductIds: ['old-1', 'old-2'],
      lastCartActionProductIds: [],
      confidence: 0.7,
    },
  });

  assert.equal(analysis.intent, 'recommend');
  assert.equal(analysis.retrievalMode, 'alternatives');
  assert.equal(analysis.references.anotherOption, true);
  assert.equal(analysis.shouldShowProducts, true);
});

test('user analysis handles add all last recommendations without clarification', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'thêm hết vào giỏ',
    memoryInvestigation: {
      requiresHistory: true,
      resolvedReference: 'all_last_recommendations',
      referenceProductIds: ['prod-1', 'prod-2'],
      lastSelectedProductIds: ['prod-1', 'prod-2'],
      lastCartActionProductIds: [],
      confidence: 0.9,
    },
  });

  assert.equal(analysis.intent, 'cart_action');
  assert.equal(analysis.cartOperation, 'add');
  assert.equal(analysis.references.allLastRecommendations, true);
  assert.deepEqual(analysis.references.resolvedProductIds, ['prod-1', 'prod-2']);
  assert.equal(analysis.needsClarification, undefined);
});

test('memory agent expands bounded history graph', async () => {
  const storage = {
    async getInvestigationSource() {
      return {
        messages: Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `máy lọc phòng khách lượt ${index}` })),
        preferences: [{ key: 'recent_recommendations', value: ['air-filter-1'] }, { key: 'rolling_summary', value: 'Khách quan tâm máy lọc không khí.' }],
      };
    },
  };
  const service = new MemoryAgentService(storage);
  const result = await service.investigate({ userId: 'user-1', message: 'thêm máy lọc đi', maxDepth: 1, maxNodes: 4 });

  assert.equal(result.resolvedReference, 'last_recommendation');
  assert.deepEqual(result.referenceProductIds, ['air-filter-1']);
  assert.ok(result.visitedNodes.length <= 4);
});

test('product manager resolves recent products from memory ids', async () => {
  const catalog = { async searchProducts() { throw new Error('should not search for recent mode'); } };
  const service = new ProductManagerAgentService(catalog);
  const product = { id: 'air-filter-1', title: 'AiroClean P35', brand: 'AiroClean', category: 'Máy lọc', price: 3500000, currency: 'VND', inventory: 5, attributes: {}, description: 'lọc phòng khách' };
  const result = await service.resolveProducts({
    message: 'thêm máy lọc đi',
    analysis: {
      intent: 'cart_action',
      cartOperation: 'add',
      retrievalMode: 'recent',
      shouldShowProducts: true,
      references: { resolvedProductIds: ['air-filter-1'] },
      constraints: {},
      confidence: 0.86,
    },
    memoryInvestigation: {
      requiresHistory: true,
      resolvedReference: 'last_recommendation',
      referenceProductIds: ['air-filter-1'],
      lastSelectedProductIds: ['air-filter-1'],
      lastCartActionProductIds: [],
      confidence: 0.86,
    },
    cart: { id: 'cart-1', version: 1, items: [], subtotal: 0, grandTotal: 0, status: 'active' },
    allProducts: [product],
  });

  assert.equal(result.mode, 'recent');
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['air-filter-1']);
});

test('recommendation agent shows exactly compared products', async () => {
  const service = new RecommendationAgentService();
  const products = [productFixture('compare-1'), productFixture('compare-2'), productFixture('extra-1')];
  const result = await service.planPresentation({
    message: 'so sánh 2 sản phẩm',
    analysis: { intent: 'compare', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.8 },
    productManagerResult: productManagerResult(products, products.slice(0, 2), 0.78),
    cartManagerResult: emptyCartManagerResult(),
    knowledge: [],
    cart: emptyCart(),
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.presentationIntent, 'compare');
  assert.deepEqual(result.products.map((item) => item.id), ['compare-1', 'compare-2']);
  assert.deepEqual(result.mustMentionProductIds, ['compare-1', 'compare-2']);
});

test('recommendation agent hides products for policy context', async () => {
  const service = new RecommendationAgentService();
  const products = [productFixture('policy-1')];
  const result = await service.planPresentation({
    message: 'chính sách đổi trả',
    analysis: { intent: 'policy', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.8 },
    productManagerResult: productManagerResult(products, products, 0.78),
    cartManagerResult: emptyCartManagerResult(),
    knowledge: [],
    cart: emptyCart(),
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.shouldShowProducts, false);
  assert.deepEqual(result.products, []);
});

test('recommendation agent does not show unrelated cards for unresolved cart action', async () => {
  const service = new RecommendationAgentService();
  const products = [productFixture('cart-unknown')];
  const result = await service.planPresentation({
    message: 'thêm sản phẩm vào giỏ',
    analysis: { intent: 'cart_action', cartOperation: 'add', retrievalMode: 'recent', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.6 },
    productManagerResult: productManagerResult(products, products, 0.78),
    cartManagerResult: { ...emptyCartManagerResult(), actionResults: ['Mình chưa xác định được sản phẩm cần thao tác.'] },
    knowledge: [],
    cart: emptyCart(),
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.shouldShowProducts, false);
  assert.deepEqual(result.products, []);
});

test('product manager excludes recent and cart products for alternatives', async () => {
  const products = [
    { id: 'old-1', title: 'Cũ', brand: 'A', category: 'Máy lọc', price: 100, currency: 'VND', inventory: 1, attributes: {}, description: 'cũ' },
    { id: 'cart-1', title: 'Trong giỏ', brand: 'A', category: 'Máy lọc', price: 100, currency: 'VND', inventory: 1, attributes: {}, description: 'giỏ' },
    { id: 'new-1', title: 'Mới', brand: 'A', category: 'Máy lọc', price: 100, currency: 'VND', inventory: 1, attributes: {}, description: 'mới' },
  ];
  const catalog = { async searchProducts() { return products; } };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'sản phẩm khác',
    analysis: { intent: 'recommend', retrievalMode: 'alternatives', shouldShowProducts: true, references: { anotherOption: true }, constraints: {}, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: true, resolvedReference: 'another_option', referenceProductIds: [], lastSelectedProductIds: ['old-1'], lastCartActionProductIds: [], confidence: 0.5 },
    cart: { id: 'cart-1', version: 1, items: [{ productId: 'cart-1', quantity: 1, unitPrice: 100, lineTotal: 100 }], subtotal: 100, grandTotal: 100, status: 'active' },
    allProducts: products,
  });

  assert.deepEqual(result.candidates.map((item) => item.id), ['new-1']);
  assert.deepEqual(result.excludedProductIds, ['cart-1', 'old-1']);
});

function productFixture(id) {
  return { id, title: `Sản phẩm ${id}`, brand: 'RetailHome', category: 'Máy lọc', price: 1000000, currency: 'VND', inventory: 5, attributes: {}, description: 'Sản phẩm test' };
}

function productManagerResult(candidates, selectedProducts, confidence) {
  return { mode: 'fresh', query: 'test', candidates, selectedProducts, excludedProductIds: [], evidence: ['test evidence'], confidence };
}

function emptyCart() {
  return { id: 'cart-1', version: 1, items: [], subtotal: 0, grandTotal: 0, status: 'active' };
}

function emptyCartManagerResult() {
  return { cart: emptyCart(), actionResults: [], traceActions: [], toolResults: [] };
}
