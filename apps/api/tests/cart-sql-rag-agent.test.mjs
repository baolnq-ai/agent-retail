import assert from 'node:assert/strict';
import { test } from 'node:test';

const { CartSqlRagAgentService } = await import('../dist/services/agents/cart-sql-rag-agent.service.js');

const product = {
  id: 'prod_mop_1',
  title: 'HomeSweep Mop Max 2',
  brand: 'HomeSweep',
  category: 'Ve sinh nha cua',
  price: 2230000,
  currency: 'VND',
  inventory: 5,
  attributes: {},
  description: 'Mop for home cleaning',
};

test('cart sql rag agent returns grounded facts and lead handoff for cart inspection', async () => {
  const history = [];
  const service = createService({
    cart: cartWithItem(),
    actionResults: [],
    traceActions: [],
    toolResults: [],
  }, history);

  const result = await service.runGoal({
    message: 'kiem tra gio co HomeSweep Mop Max 2 chua va tong tien bao nhieu',
    userId: 'user-1',
    cart: cartWithItem(),
    analysis: baseAnalysis({ intent: 'cart_status', productName: 'HomeSweep Mop Max 2', resolvedProductIds: ['prod_mop_1'] }),
    products: [product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(result.agentResult.status, 'completed');
  assert.equal(result.agentResult.facts.some((fact) => fact.type === 'item_found' && fact.productId === 'prod_mop_1'), true);
  assert.equal(result.agentResult.facts.some((fact) => fact.type === 'cart_total' && fact.grandTotal === 4460000), true);
  assert.match(result.agentResult.handoff.leadInstruction, /Enough grounded cart facts/);
  assert.equal(result.agentResult.privatePlan.some((step) => step.tool === 'cart.sql.find_cart_item'), true);
  assert.equal(history.length, 1);
  assert.equal(history[0].agent, 'cart-agent');
});

test('cart sql rag agent returns needs_auth issue for guest cart mutation', async () => {
  const service = createService({
    cart: emptyCart(),
    actionResults: ['Ban can dang nhap de thao tac gio hang.'],
    traceActions: [{ type: 'add', productIds: [], status: 'error', error: 'Ban can dang nhap de thao tac gio hang.' }],
    toolResults: [{ tool: 'cart.add', status: 'error', productIds: [], error: 'Ban can dang nhap de thao tac gio hang.' }],
    errors: [{ source: 'cart-manager-agent', message: 'Ban can dang nhap de thao tac gio hang.' }],
  });

  const result = await service.runGoal({
    message: 'them HomeSweep Mop Max 2 vao gio hang',
    cart: emptyCart(),
    analysis: baseAnalysis({ intent: 'cart_action', cartOperation: 'add', productName: 'HomeSweep Mop Max 2', resolvedProductIds: ['prod_mop_1'] }),
    products: [product],
    selectedProducts: [product],
    memoryContext: emptyMemory(),
  });

  assert.equal(result.agentResult.status, 'needs_auth');
  assert.equal(result.agentResult.issues.some((issue) => issue.code === 'needs_auth'), true);
  assert.match(result.agentResult.handoff.leadInstruction, /log in/);
  assert.equal(result.agentResult.privatePlan.some((step) => step.tool === 'cart.write.add_item'), true);
});

test('cart sql rag agent asks search to resolve missing product target before write', async () => {
  const service = createService({
    cart: emptyCart(),
    actionResults: ['Chua xac dinh duoc san pham can thao tac.'],
    traceActions: [],
    toolResults: [],
    clarification: 'Chua xac dinh duoc san pham can thao tac.',
  });

  const result = await service.runGoal({
    message: 'them cai do vao gio',
    userId: 'user-1',
    cart: emptyCart(),
    analysis: baseAnalysis({ intent: 'cart_action', cartOperation: 'add', productName: undefined, resolvedProductIds: [] }),
    products: [],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(result.agentResult.status, 'needs_product_resolution');
  assert.equal(result.agentResult.issues.some((issue) => issue.code === 'product_not_resolved' && issue.suggestedNextAgent === 'search'), true);
  assert.match(result.agentResult.handoff.leadInstruction, /Search Agent/);
});

test('cart sql rag agent uses mutation writer fast path for resolved single-product write', async () => {
  const managerCalls = [];
  const writerCalls = [];
  const service = createService({
    cart: emptyCart(),
    actionResults: [],
    traceActions: [],
    toolResults: [],
  }, [], {
    execute: async (request) => {
      writerCalls.push(request);
      return {
        status: 'completed',
        issueCodes: [],
        toolName: request.toolName,
        cartId: request.cartId,
        userId: request.userId,
        productId: request.productId,
        idempotencyKey: request.idempotencyKey,
        eventCreated: true,
        cartVersionBefore: 3,
        cartVersionAfter: 4,
        quantityBefore: 0,
        quantityAfter: 1,
        subtotalBefore: 0,
        subtotalAfter: 2230000,
        cart: {
          id: 'cart-1',
          version: 4,
          status: 'active',
          items: [{ productId: 'prod_mop_1', quantity: 1, unitPrice: 2230000, lineTotal: 2230000 }],
          subtotal: 2230000,
          grandTotal: 2230000,
        },
        verification: { passed: true, evidence: ['cart.version=4'], issues: [] },
      };
    },
  }, managerCalls);

  const result = await service.runGoal({
    message: 'them HomeSweep Mop Max 2 vao gio hang',
    userId: 'user-1',
    cart: { ...emptyCart(), version: 3 },
    analysis: baseAnalysis({ intent: 'cart_action', cartOperation: 'add', productName: 'HomeSweep Mop Max 2', resolvedProductIds: ['prod_mop_1'] }),
    products: [product],
    selectedProducts: [product],
    memoryContext: emptyMemory(),
  });

  assert.equal(managerCalls.length, 0);
  assert.equal(writerCalls.length, 1);
  assert.equal(writerCalls[0].toolName, 'cart.write.add_item');
  assert.equal(writerCalls[0].expectedCartVersion, 3);
  assert.equal(result.agentResult.status, 'completed');
  assert.equal(result.agentResult.cart.version, 4);
  assert.equal(result.agentResult.facts.some((fact) => fact.type === 'operation_completed'), true);
  assert.equal(result.pipeline.some((item) => item.stage === 'verify' && item.summary.includes('cart.version=4')), true);
});

test('cart sql rag agent creates DB pending action before clearing non-empty cart', async () => {
  const managerCalls = [];
  const state = fakeStateService();
  const service = createService({ cart: cartWithItem() }, [], undefined, managerCalls, state);

  const result = await service.runGoal({
    message: 'xoa het gio hang',
    userId: 'user-1',
    cart: cartWithItem(),
    analysis: baseAnalysis({ intent: 'cart_action', cartOperation: 'clear', productName: undefined, resolvedProductIds: [] }),
    products: [product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(managerCalls.length, 0);
  assert.equal(state.pending.length, 1);
  assert.equal(result.agentResult.status, 'needs_confirmation');
  assert.equal(result.agentResult.issues.some((issue) => issue.code === 'needs_confirmation'), true);
  assert.equal(result.pendingPlan.id, state.pending[0].id);
});

test('cart sql rag agent confirms DB pending clear through mutation writer', async () => {
  const state = fakeStateService();
  state.pending.push({
    id: 'pending-1',
    userId: 'user-1',
    cartId: 'cart-1',
    requestId: 'req-pending',
    status: 'pending',
    operations: [{ type: 'clear' }],
    reason: 'clear_cart_requires_confirmation',
    confirmationText: 'Confirm clear',
    expiresAt: new Date(Date.now() + 60_000),
  });
  const writerCalls = [];
  const writer = {
    execute: async (request) => {
      writerCalls.push(request);
      return {
        status: 'completed',
        issueCodes: [],
        toolName: 'cart.write.clear',
        cartId: 'cart-1',
        userId: 'user-1',
        idempotencyKey: request.idempotencyKey,
        eventCreated: true,
        cartVersionBefore: 3,
        cartVersionAfter: 4,
        subtotalBefore: 4460000,
        subtotalAfter: 0,
        cart: emptyCartWithVersion(4),
        verification: { passed: true, evidence: ['cart.version=4', 'item_count=0'], issues: [] },
      };
    },
  };
  const service = createService({ cart: cartWithItem() }, [], writer, [], state);

  const result = await service.runGoal({
    message: 'dung xoa di',
    userId: 'user-1',
    cart: cartWithItem(),
    analysis: baseAnalysis({ intent: 'confirm_pending', productName: undefined, resolvedProductIds: [] }),
    products: [product],
    selectedProducts: [],
    memoryContext: emptyMemory(),
  });

  assert.equal(writerCalls.length, 1);
  assert.equal(writerCalls[0].toolName, 'cart.write.clear');
  assert.equal(state.pending[0].status, 'confirmed');
  assert.equal(result.agentResult.status, 'completed');
  assert.equal(result.agentResult.cart.items.length, 0);
  assert.equal(result.clearedPendingPlan, true);
});

function createService(managerResult, history = [], writer, managerCalls = [], state) {
  const manager = {
    run: async () => {
      managerCalls.push(true);
      return {
      cart: emptyCart(),
      actionResults: [],
      traceActions: [],
      toolResults: [],
      pipeline: [],
      errors: [],
      ...managerResult,
    };
    },
  };
  const agentHistory = {
    appendHistory: async (userId, agent, entry) => {
      history.push({ userId, agent, ...entry });
    },
  };
  return new CartSqlRagAgentService(manager, agentHistory, writer, state);
}

function baseAnalysis(overrides = {}) {
  return {
    intent: 'cart_status',
    retrievalMode: 'none',
    shouldShowProducts: false,
    references: {
      productName: overrides.productName,
      resolvedProductIds: overrides.resolvedProductIds ?? [],
    },
    constraints: {},
    confidence: 0.9,
    ...overrides,
  };
}

function emptyMemory() {
  return { recentTurns: [], preferences: [], recentRecommendationIds: [] };
}

function emptyCart() {
  return { id: 'cart-1', version: 1, status: 'active', items: [], subtotal: 0, grandTotal: 0 };
}

function emptyCartWithVersion(version) {
  return { ...emptyCart(), version };
}

function cartWithItem() {
  return {
    id: 'cart-1',
    version: 3,
    status: 'active',
    items: [{ productId: 'prod_mop_1', quantity: 2, unitPrice: 2230000, lineTotal: 4460000 }],
    subtotal: 4460000,
    grandTotal: 4460000,
  };
}

function fakeStateService() {
  return {
    pending: [],
    interactions: [],
    memories: [],
    async createPendingAction(draft) {
      const row = {
        id: `pending-${this.pending.length + 1}`,
        status: 'pending',
        createdAt: new Date(),
        ...draft,
      };
      this.pending.push(row);
      return row;
    },
    async getActivePendingAction(userId, cartId) {
      return this.pending.find((row) => row.userId === userId && row.cartId === cartId && row.status === 'pending' && row.expiresAt > new Date()) ?? null;
    },
    async resolvePendingAction(id, status) {
      const row = this.pending.find((candidate) => candidate.id === id && candidate.status === 'pending');
      if (!row) return false;
      row.status = status;
      return true;
    },
    async writeInteraction(draft) {
      this.interactions.push(draft);
    },
    async upsertMemory(draft) {
      this.memories.push(draft);
    },
    async getMemoryContext() {
      return { near: [], midSummary: undefined, farSignals: [] };
    },
  };
}
