import assert from 'node:assert/strict';
import test from 'node:test';

const { detectSalesIntent } = await import('../dist/services/agent-orchestrator.service.js');
const { UserAnalysisAgentService } = await import('../dist/services/agents/user-analysis-agent.service.js');
const { MemoryAgentService } = await import('../dist/services/agents/memory-agent.service.js');
const { ProductManagerAgentService } = await import('../dist/services/agents/product-manager-agent.service.js');
const { CartManagerAgentService } = await import('../dist/services/agents/cart-manager-agent.service.js');
const { RecommendationAgentService } = await import('../dist/services/agents/recommendation-agent.service.js');
const { AgentQualityGateService } = await import('../dist/services/agents/agent-quality-gate.service.js');

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

test('user analysis treats cart view as cart status', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'cho xem giỏ hàng',
    memoryInvestigation: {
      requiresHistory: false,
      resolvedReference: 'none',
      referenceProductIds: [],
      lastSelectedProductIds: [],
      lastCartActionProductIds: [],
      confidence: 0.9,
    },
  });

  assert.equal(analysis.intent, 'cart_status');
  assert.equal(analysis.cartOperation, undefined);
  assert.equal(analysis.retrievalMode, 'none');
  assert.equal(analysis.shouldShowProducts, false);
  assert.equal(analysis.needsClarification, undefined);
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

test('user analysis keeps pet vacuum question as product recommendation', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'Co robot hut bui nao hop nha co thu cung khong?',
    memoryInvestigation: {
      requiresHistory: false,
      resolvedReference: 'none',
      referenceProductIds: [],
      lastSelectedProductIds: [],
      lastCartActionProductIds: [],
      confidence: 0.9,
    },
  });

  assert.equal(analysis.intent, 'recommend');
  assert.equal(analysis.cartOperation, undefined);
  assert.equal(analysis.retrievalMode, 'fresh');
  assert.equal(analysis.shouldShowProducts, true);
});

test('detectSalesIntent keeps current retail support and recommendation intent', () => {
  assert.equal(detectSalesIntent('Minh thich hang tiet kiem dien, co mon nao dang nen mua khong?'), 'recommend');
  assert.equal(detectSalesIntent('Mua online thi nhan hoa don hay xac nhan don nhu the nao?'), 'policy');
  assert.equal(detectSalesIntent('Cho them lua chon khac cung nhom nhung gia mem hon'), 'recommend');
});

test('user analysis preserves explicit product ids even when LLM tries to hide product retrieval', async () => {
  const modelGateway = {
    async chat() {
      return { content: JSON.stringify({ intent: 'smalltalk', retrievalMode: 'none', shouldShowProducts: false, references: {}, constraints: {}, confidence: 0.3 }) };
    },
  };
  const service = new UserAnalysisAgentService(modelGateway);
  const analysis = await service.analyze({
    message: 'San pham prod_air_clean_p35 co hop phong ngu khong',
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
  });

  assert.equal(analysis.intent, 'product_detail');
  assert.equal(analysis.retrievalMode, 'fresh');
  assert.equal(analysis.shouldShowProducts, true);
  assert.deepEqual(analysis.references.resolvedProductIds, ['prod_air_clean_p35']);
});

test('quality gate blocks contradictory cart status operation', async () => {
  const modelGateway = { async chat() { throw new Error('force fallback'); } };
  const history = { async getHistory() { return { agent: 'user-analysis-agent', entries: [], summary: '' }; }, async appendHistory() {} };
  const service = new AgentQualityGateService(modelGateway, history);
  const result = await service.evaluate({
    agent: 'user-analysis-agent',
    job: 'intent analysis',
    userMessage: 'xem giỏ hàng',
    inputSummary: 'cart status',
    output: { intent: 'cart_status', cartOperation: 'add', retrievalMode: 'none', shouldShowProducts: false },
    contract: ['cart_status không được có cartOperation'],
  });

  assert.equal(result.pass, false);
  assert.equal(result.severity, 'block');
  assert.equal(result.outcome, 'revise');
});

test('quality gate refuses clear out-of-scope questions', async () => {
  const modelGateway = { async chat() { throw new Error('force fallback'); } };
  const history = { async getHistory() { return { agent: 'sales-agent', entries: [], summary: '' }; }, async appendHistory() {} };
  const service = new AgentQualityGateService(modelGateway, history);
  const result = await service.evaluate({
    agent: 'sales-agent',
    job: 'final response',
    userMessage: 'ai là tổng thống Mỹ',
    inputSummary: 'out of scope',
    output: { draft: 'Tổng thống Mỹ là ...' },
    contract: ['Không trả lời chủ đề ngoài RetailHome'],
  });

  assert.equal(result.pass, false);
  assert.equal(result.outcome, 'refuse');
  assert.match(result.safeResponse ?? '', /RetailHome/);
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

test('product manager resolves explicit product ids before lexical search', async () => {
  const catalog = { async searchProducts() { throw new Error('explicit product ids should not search catalog'); } };
  const service = new ProductManagerAgentService(catalog);
  const products = [productFixture('prod_air_clean_p35'), productFixture('prod_fresh_home_mini_20'), productFixture('prod_other')];
  const result = await service.resolveProducts({
    message: 'So sanh prod_air_clean_p35 voi prod_fresh_home_mini_20',
    analysis: { intent: 'compare', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.9 },
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.candidates.map((item) => item.id), ['prod_air_clean_p35', 'prod_fresh_home_mini_20']);
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['prod_air_clean_p35', 'prod_fresh_home_mini_20']);
  assert.equal(result.confidence, 0.96);
});

test('cart action with explicit product name searches catalog and executes cart tool', async () => {
  const product = { id: 'mop-2', title: 'HomeSweep Mop Max 2', brand: 'HomeSweep', category: 'Vệ sinh nhà cửa', price: 2230000, currency: 'VND', inventory: 5, attributes: {}, description: 'cây lau nhà thông minh' };
  const catalog = { async searchProducts(query) {
    assert.equal(query, 'homesweep mop max 2');
    return [product];
  } };
  const productService = new ProductManagerAgentService(catalog);
  const analysisService = new UserAnalysisAgentService();
  const analysis = await analysisService.analyze({
    message: 'thêm HomeSweep Mop Max 2 vào giỏ hàng nha',
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
  });

  assert.equal(analysis.intent, 'cart_action');
  assert.equal(analysis.cartOperation, 'add');
  assert.equal(analysis.retrievalMode, 'fresh');
  assert.equal(analysis.references.productName, 'homesweep mop max 2');

  const productResult = await productService.resolveProducts({
    message: 'thêm HomeSweep Mop Max 2 vào giỏ hàng nha',
    analysis,
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: [product],
  });
  assert.deepEqual(productResult.selectedProducts.map((item) => item.id), ['mop-2']);

  const commerce = {
    async addItemToCurrentCart(userId, productId, quantity) {
      assert.equal(userId, 'user-1');
      assert.equal(productId, 'mop-2');
      assert.equal(quantity, 1);
      return { id: 'cart-1', version: 2, items: [{ productId, quantity, unitPrice: product.price, lineTotal: product.price }], subtotal: product.price, grandTotal: product.price, status: 'active' };
    },
  };
  const memory = { async clearPendingCartPlan() {}, async savePendingCartPlan() {} };
  const cartService = new CartManagerAgentService(commerce, memory);
  const cartResult = await cartService.run({
    message: 'thêm HomeSweep Mop Max 2 vào giỏ hàng nha',
    userId: 'user-1',
    cart: emptyCart(),
    analysis,
    products: productResult.candidates,
    selectedProducts: productResult.selectedProducts,
    memoryContext: { recentTurns: [], preferences: [], recentRecommendationIds: [] },
  });

  assert.equal(cartResult.toolResults[0]?.status, 'completed');
  assert.deepEqual(cartResult.toolResults[0]?.productIds, ['mop-2']);
  assert.equal(cartResult.cart.items.length, 1);
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

test('recommendation agent keeps valid fallback rail when LLM tries to hide selected products', async () => {
  const modelGateway = {
    async chat() {
      return { content: JSON.stringify({ shouldShowProducts: false, productIds: [], presentationIntent: 'none', status: 'blocked', displayReason: 'wrong hide', complaints: ['wrong hide'] }) };
    },
  };
  const service = new RecommendationAgentService(modelGateway);
  const products = [productFixture('prod_air_clean_p35')];
  const result = await service.planPresentation({
    message: 'San pham prod_air_clean_p35 co hop phong ngu khong',
    analysis: { intent: 'product_detail', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.9 },
    productManagerResult: productManagerResult(products, products, 0.96),
    cartManagerResult: emptyCartManagerResult(),
    knowledge: [],
    cart: emptyCart(),
  });

  assert.equal(result.status, 'approved');
  assert.equal(result.shouldShowProducts, true);
  assert.deepEqual(result.products.map((item) => item.id), ['prod_air_clean_p35']);
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

test('product manager treats budget number as price not product count', async () => {
  const products = [
    { id: 'fresh-mini', title: 'FreshHome Mini 20', brand: 'FreshHome', category: 'Máy lọc không khí', price: 1990000, currency: 'VND', inventory: 3, attributes: { roomSize: '15-22m2' }, description: 'máy lọc nhỏ gọn' },
    { id: 'expensive-air', title: 'AiroClean P35', brand: 'AiroClean', category: 'Máy lọc không khí', price: 3490000, currency: 'VND', inventory: 3, attributes: { roomSize: '25-35m2' }, description: 'máy lọc phòng lớn' },
  ];
  const catalog = { async searchProducts() { return products.filter((product) => product.price <= 2000000); } };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'tư vấn máy lọc dưới 2 triệu',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: { budgetMax: 2000000, category: 'máy lọc' }, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['fresh-mini']);
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
