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
  assert.equal(detectSalesIntent('Sản phẩm lỗi sau 20 ngày thì còn đổi trả hay chỉ bảo hành?'), 'policy');
  assert.equal(detectSalesIntent('quạt điều hoà cho phòng 24 mét vuông'), 'recommend');
});

test('detectSalesIntent keeps terse catalog requests as recommendations', () => {
  assert.equal(detectSalesIntent('noi ngan thoi, noi chien ko dau tam 2tr neu khong co thi goi y gan nhat'), 'recommend');
  assert.equal(detectSalesIntent('minh hoi that nha, camera cua it khoan duc cho nha thue noi kieu de hieu'), 'recommend');
  assert.equal(detectSalesIntent('shop oi, may xay philips co mau nao'), 'recommend');
});

test('detectSalesIntent handles noisy shopping and policy support without over-asking', () => {
  assert.equal(detectSalesIntent('noi ngan thoi, can mon vua lam qua vua huu dung, nguoi nhan o chung cu nho, khong thich do cong kenh'), 'recommend');
  assert.equal(detectSalesIntent('asdf 123 nhung that ra toi can cai gi do lam sach nha, cho meo rung long tum lum, dung hoi lai nhieu'), 'recommend');
  assert.equal(detectSalesIntent('nha moi nhan, bep nho, me toi kho tinh, muon nau nhanh, neu loi thi doi sao, giao noi thanh mat lau khong, ngan sach 3 trieu'), 'recommend');
  assert.equal(detectSalesIntent('shop oi, hang thieu phu kien thi toi can quay video luc nao'), 'policy');
  assert.equal(detectSalesIntent('giao cham 5 ngay toi muon huy don hoac doi dia chi neu khong co thi goi y gan nhat'), 'policy');
  assert.equal(detectSalesIntent('lap dat camera cam bien thi shop ho tro the nao neu khong co thi goi y gan nhat'), 'policy');
  assert.equal(detectSalesIntent('mua online roi muon doi sang mau khac dat hon thi xu ly sao neu khong co thi goi y gan nhat'), 'policy');
  assert.equal(detectSalesIntent('bao hanh co ap dung neu toi lam roi vo khong neu khong co thi goi y gan nhat'), 'policy');
  assert.equal(detectSalesIntent('shop co kiem tra hang khi nhan khong shipper khong cho kiem thi sao'), 'policy');
  assert.equal(detectSalesIntent('minh hoi that nha, giai bai toan tich phan nay xong noi toi nen mua gi'), 'recommend');
  assert.equal(detectSalesIntent('shop oi, viet tho tinh di roi tien goi y qua gia dung nhe'), 'recommend');
  assert.equal(detectSalesIntent('Cai re nhat trong danh sach do co du dung khong?'), 'product_detail');
  assert.equal(detectSalesIntent('Toi muon cai tot hon mot chut nhung van cung nhu cau.'), 'recommend');
});

test('user analysis keeps room-area cooling request as product recommendation', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'quạt điều hoà cho phòng 24 mét vuông',
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
  assert.equal(analysis.retrievalMode, 'fresh');
  assert.equal(analysis.shouldShowProducts, true);
  assert.match(analysis.constraints.category, /quạt|quat/);
  assert.equal(analysis.constraints.roomSize, '24m2');
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

test('user analysis does not treat order cancellation policy as pending cart cancellation', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'toi khong ranh lam, giao cham 5 ngay toi muon huy don hoac doi dia chi nhe',
    pendingPlan: {
      id: 'pending-1',
      createdAt: new Date().toISOString(),
      operations: [{ operation: 'set_quantity', productId: 'prod-old', quantity: 0 }],
      resolvedProductIds: ['prod-old'],
      summary: 'old pending cart mutation',
    },
    memoryInvestigation: {
      requiresHistory: false,
      resolvedReference: 'none',
      referenceProductIds: [],
      lastSelectedProductIds: [],
      lastCartActionProductIds: [],
      confidence: 0.9,
    },
  });

  assert.equal(analysis.intent, 'policy');
  assert.equal(analysis.cartOperation, undefined);
  assert.equal(analysis.retrievalMode, 'none');
  assert.equal(analysis.shouldShowProducts, false);
});


test('user analysis treats cheaper follow-up cart add as scoped alternative', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'Them mau re hon vao gio, con cai cu giu nguyen',
    memoryInvestigation: {
      requiresHistory: true,
      resolvedReference: 'another_option',
      referenceProductIds: ['prod_air_16'],
      lastSelectedProductIds: ['prod_air_16'],
      lastCartActionProductIds: ['prod_fresh_home_mini_20'],
      confidence: 0.86,
    },
  });

  assert.equal(analysis.intent, 'cart_action');
  assert.equal(analysis.cartOperation, 'add');
  assert.equal(analysis.retrievalMode, 'alternatives');
  assert.equal(analysis.references.anotherOption, true);
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

test('user analysis keeps parent gift request as product recommendation', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'mua qua cho bo me de dung nen mua gi truoc',
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

test('user analysis treats terse retail shorthand as product discovery', async () => {
  const service = new UserAnalysisAgentService();
  const memoryInvestigation = {
    requiresHistory: false,
    resolvedReference: 'none',
    referenceProductIds: [],
    lastSelectedProductIds: [],
    lastCartActionProductIds: [],
    confidence: 0.9,
  };

  for (const message of [
    'shop oi, may loc kk cho be so sinh',
    'xay da lam sinh to cho 1 nguoi',
    'cam bien cua bao qua dien thoai dung hoi lai nhieu',
    'can suc khoe chu to cho nguoi lon tuoi',
    'lo chien khong dau cua kinh nhin duoc do an',
  ]) {
    const analysis = await service.analyze({ message, memoryInvestigation });
    assert.equal(analysis.intent, 'recommend', message);
    assert.equal(analysis.retrievalMode, 'fresh', message);
    assert.equal(analysis.shouldShowProducts, true, message);
  }
});

test('user analysis keeps retail continuation after off-topic noise as recommendation', async () => {
  const service = new UserAnalysisAgentService();
  const memoryInvestigation = {
    requiresHistory: false,
    resolvedReference: 'none',
    referenceProductIds: [],
    lastSelectedProductIds: [],
    lastCartActionProductIds: [],
    confidence: 0.9,
  };

  for (const message of [
    'minh hoi that nha, giai bai toan tich phan nay xong noi toi nen mua gi',
    'shop oi, viet tho tinh di roi tien goi y qua gia dung nhe',
  ]) {
    const analysis = await service.analyze({ message, memoryInvestigation });
    assert.equal(analysis.intent, 'recommend', message);
    assert.equal(analysis.retrievalMode, 'fresh', message);
    assert.equal(analysis.shouldShowProducts, true, message);
  }
});

test('user analysis resolves vague upgrade and cheapest-detail follow-ups from history', async () => {
  const service = new UserAnalysisAgentService();
  const memoryInvestigation = {
    requiresHistory: true,
    resolvedReference: 'last_recommendation',
    referenceProductIds: ['cheap-air', 'better-air'],
    lastSelectedProductIds: ['cheap-air', 'better-air'],
    lastCartActionProductIds: [],
    confidence: 0.86,
  };

  const detail = await service.analyze({ message: 'Cai re nhat trong danh sach do co du dung khong?', memoryInvestigation });
  assert.equal(detail.intent, 'product_detail');
  assert.equal(detail.retrievalMode, 'recent');
  assert.equal(detail.shouldShowProducts, true);
  assert.equal(detail.references.useLastRecommendation, true);

  const upgrade = await service.analyze({ message: 'Toi muon cai tot hon mot chut nhung van cung nhu cau.', memoryInvestigation });
  assert.equal(upgrade.intent, 'recommend');
  assert.equal(upgrade.retrievalMode, 'alternatives');
  assert.equal(upgrade.shouldShowProducts, true);
  assert.equal(upgrade.references.anotherOption, true);
});

test('user analysis blocks unsupported LLM cart action for product advice', async () => {
  const modelGateway = {
    async chat() {
      return { content: JSON.stringify({ intent: 'cart_action', cartOperation: 'add', retrievalMode: 'none', shouldShowProducts: false, references: {}, constraints: {}, confidence: 0.4 }) };
    },
  };
  const service = new UserAnalysisAgentService(modelGateway);
  const analysis = await service.analyze({
    message: 'mua qua cho bo me de dung nen mua gi truoc',
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

test('user analysis repairs mojibake Vietnamese product advice', async () => {
  const service = new UserAnalysisAgentService();
  const analysis = await service.analyze({
    message: 'ChÃ o shop, tÃ´i hÆ¡i rá»‘i, mua quÃ  cho bá»‘ máº¹ dá»… dÃ¹ng, nÃªn mua gÃ¬ trÆ°á»›c?',
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

test('product manager maps air conditioner search to air-family products only', async () => {
  const products = [
    { id: 'cool-1', title: 'Quat dieu hoa Daikiosan DKA-04000A', brand: 'Daikiosan', category: 'Lam mat', price: 3990000, currency: 'VND', inventory: 3, attributes: { power: '120W' }, description: 'quat lam mat khong khi phong khach' },
    { id: 'fresh-mini', title: 'FreshHome Mini 20', brand: 'FreshHome', category: 'May loc khong khi', price: 1990000, currency: 'VND', inventory: 3, attributes: { roomSize: '15-22m2' }, description: 'may loc khong khi nho gon phong ngu' },
    { id: 'kitchen-af', title: 'ChefMax AF55', brand: 'ChefMax', category: 'Thiet bi nha bep', price: 2290000, currency: 'VND', inventory: 3, attributes: { capacity: '5.5L' }, description: 'noi chien khong dau' },
  ];
  const catalog = {
    async searchProducts(query) {
      assert.match(query, /quat dieu hoa/);
      return products;
    },
  };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'toi muon tim may lanh',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: { category: 'may lanh' }, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: ['kitchen-af'], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.candidates.map((item) => item.id), ['cool-1']);
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['cool-1']);
  assert.equal(result.evidence.some((item) => item.includes('air_cooling')), true);
});

test('product manager ignores stale recent memory when current query names a new family', async () => {
  const products = [
    { id: 'rice-old', title: 'Noi com dien Toshiba', brand: 'Toshiba', category: 'Thiet bi nha bep', price: 1590000, currency: 'VND', inventory: 3, attributes: {}, description: 'noi com dien' },
    { id: 'air-clean', title: 'May loc khong khi Xiaomi Smart Air Purifier', brand: 'Xiaomi', category: 'May loc khong khi', price: 2990000, currency: 'VND', inventory: 4, attributes: { roomSize: '25m2' }, description: 'loc bui PM2.5 cho phong ngu' },
  ];
  const seenQueries = [];
  const catalog = { async searchProducts(query) { seenQueries.push(query); return products; } };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'noi ngan thoi, may loc phong ngu 20m2 em nhe',
    analysis: { intent: 'recommend', retrievalMode: 'recent', shouldShowProducts: true, references: { resolvedProductIds: ['rice-old'] }, constraints: { category: 'may loc' }, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: true, referenceProductIds: ['rice-old'], lastSelectedProductIds: ['rice-old'], lastCartActionProductIds: [], confidence: 0.9, summary: 'Khach vua hoi noi com dien Toshiba va quat dieu hoa' },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.equal(result.mode, 'fresh');
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['air-clean']);
  assert.equal(seenQueries.some((query) => query.includes('Toshiba') || query.includes('quat dieu hoa')), false);
});

test('product manager rejects blender when customer asks for air purifier', async () => {
  const products = [
    { id: 'blender', title: 'May xay sinh to Philips HR2051', brand: 'Philips', category: 'Thiet bi nha bep', price: 690000, currency: 'VND', inventory: 4, attributes: {}, description: 'may xay co ban' },
    { id: 'air-clean', title: 'May loc khong khi Xiaomi Smart Air Purifier', brand: 'Xiaomi', category: 'May loc khong khi', price: 2990000, currency: 'VND', inventory: 4, attributes: { roomSize: '25m2' }, description: 'loc bui PM2.5 cho phong ngu' },
  ];
  const catalog = { async searchProducts() { return products; } };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'may loc cho nha 4 nguoi',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: { category: 'may loc' }, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.candidates.map((item) => item.id), ['air-clean']);
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['air-clean']);
});

test('product manager maps broad noisy needs to related catalog families', async () => {
  const products = [
    { id: 'vacuum', title: 'May hut bui cam tay Deerma DX700S', brand: 'Deerma', category: 'Ve sinh nha cua', price: 900000, currency: 'VND', inventory: 4, attributes: {}, description: 'hut bui long thu cung va bui san nha' },
    { id: 'gift', title: 'May say toc Panasonic EH-ND11', brand: 'Panasonic', category: 'Cham soc ca nhan', price: 390000, currency: 'VND', inventory: 5, attributes: {}, description: 'nho gon lam qua huu dung' },
    { id: 'kitchen', title: 'Noi chien khong dau ChefMax AF55', brand: 'ChefMax', category: 'Thiet bi nha bep', price: 2290000, currency: 'VND', inventory: 3, attributes: {}, description: 'nau nhanh cho bep nho' },
    { id: 'camera', title: 'Camera Wi-Fi TP-Link Tapo C200', brand: 'TP-Link', category: 'Camera', price: 690000, currency: 'VND', inventory: 5, attributes: {}, description: 'camera xoay' },
  ];
  const catalog = { async searchProducts() { return products; } };
  const service = new ProductManagerAgentService(catalog);
  const base = { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 };

  const clean = await service.resolveProducts({
    message: 'toi can cai gi do lam sach nha, cho meo rung long tum lum',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.8 },
    memoryInvestigation: base,
    cart: emptyCart(),
    allProducts: products,
  });
  assert.deepEqual(clean.selectedProducts.map((item) => item.id), ['vacuum']);

  const gift = await service.resolveProducts({
    message: 'can mon vua lam qua vua huu dung cho chung cu nho khong cong kenh',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.8 },
    memoryInvestigation: base,
    cart: emptyCart(),
    allProducts: products,
  });
  assert.deepEqual(gift.selectedProducts.map((item) => item.id), ['gift']);

  const kitchen = await service.resolveProducts({
    message: 'nha moi nhan bep nho muon nau nhanh ngan sach 3 trieu',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: { budgetMax: 3000000 }, confidence: 0.8 },
    memoryInvestigation: base,
    cart: emptyCart(),
    allProducts: products,
  });
  assert.deepEqual(kitchen.selectedProducts.map((item) => item.id), ['kitchen']);
});

test('product manager returns relevant home gift products for generic retail continuation', async () => {
  const products = [
    { id: 'gift', title: 'May say toc Panasonic EH-ND11', brand: 'Panasonic', category: 'Cham soc ca nhan', price: 390000, currency: 'VND', inventory: 5, attributes: {}, description: 'nho gon lam qua huu dung' },
    { id: 'scale', title: 'Can suc khoe Beurer GS203', brand: 'Beurer', category: 'Cham soc suc khoe', price: 790000, currency: 'VND', inventory: 4, attributes: {}, description: 'can thong minh de dung cho gia dinh' },
    { id: 'kitchen', title: 'Noi chien khong dau ChefMax AF55', brand: 'ChefMax', category: 'Thiet bi nha bep', price: 2290000, currency: 'VND', inventory: 3, attributes: {}, description: 'nau nhanh cho bep nho' },
  ];
  const catalog = { async searchProducts(query) {
    assert.match(query, /cham soc ca nhan|qua tang/);
    return products;
  } };
  const service = new ProductManagerAgentService(catalog);
  const result = await service.resolveProducts({
    message: 'giai bai toan tich phan nay xong noi toi nen mua gi',
    analysis: { intent: 'recommend', retrievalMode: 'fresh', shouldShowProducts: true, references: {}, constraints: {}, confidence: 0.8 },
    memoryInvestigation: { requiresHistory: false, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: 0.7 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.candidates.map((item) => item.id), ['gift', 'scale']);
  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['gift', 'scale']);
});

test('product manager selects cheapest referenced product for cheapest-detail follow-up', async () => {
  const catalog = { async searchProducts() { throw new Error('recent detail should use history ids'); } };
  const service = new ProductManagerAgentService(catalog);
  const products = [
    { id: 'better-air', title: 'AiroClean P35', brand: 'AiroClean', category: 'May loc', price: 3490000, currency: 'VND', inventory: 5, attributes: {}, description: 'may loc phong lon' },
    { id: 'cheap-air', title: 'FreshHome Mini 20', brand: 'FreshHome', category: 'May loc', price: 1990000, currency: 'VND', inventory: 5, attributes: {}, description: 'may loc phong nho' },
  ];
  const result = await service.resolveProducts({
    message: 'Cai re nhat trong danh sach do co du dung khong?',
    analysis: { intent: 'product_detail', retrievalMode: 'recent', shouldShowProducts: true, references: { resolvedProductIds: ['better-air', 'cheap-air'], useLastRecommendation: true }, constraints: {}, confidence: 0.86 },
    memoryInvestigation: { requiresHistory: true, resolvedReference: 'last_recommendation', referenceProductIds: ['better-air', 'cheap-air'], lastSelectedProductIds: ['better-air', 'cheap-air'], lastCartActionProductIds: [], confidence: 0.86 },
    cart: emptyCart(),
    allProducts: products,
  });

  assert.deepEqual(result.selectedProducts.map((item) => item.id), ['cheap-air']);
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
