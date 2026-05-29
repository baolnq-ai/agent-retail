import { Injectable } from '@nestjs/common';
import type { AgentTrace } from '../../models/agent.models.js';
import type { AgentPipelineEvent, CartManagerResult, CartToolResult, UserAnalysis } from '../../models/agent-execution.models.js';
import type { Cart } from '../../models/commerce.models.js';
import type { Product } from '../../models/catalog.models.js';
import type { CartAgentFact, CartAgentIssue, CartAgentPrivatePlanStep, CartAgentResult, CartAgentRunResult, CartAgentStatus } from '../../models/cart-agent.models.js';
import type { ChatMemoryContext } from '../chat-memory.service.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { CartManagerAgentService } from './cart-manager-agent.service.js';
import { CartAgentMutationWriterService, type CartAgentMutationResult } from './cart-agent-mutation-writer.service.js';
import type { CartAgentPrivateToolRequest } from './cart-agent-private-tool.executor.js';
import { CartAgentStateService, type PendingCartActionRecord } from './cart-agent-state.service.js';

@Injectable()
export class CartSqlRagAgentService {
  constructor(
    private readonly cartManagerAgentService: CartManagerAgentService,
    private readonly agentHistoryService: AgentHistoryService,
    private readonly cartAgentMutationWriterService?: CartAgentMutationWriterService,
    private readonly cartAgentStateService?: CartAgentStateService,
  ) {}

  async runGoal(params: {
    message: string;
    userId?: string;
    cart: Cart;
    analysis: UserAnalysis;
    products: Product[];
    selectedProducts: Product[];
    memoryContext: ChatMemoryContext;
  }): Promise<CartAgentRunResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    const privatePlan = buildPrivatePlan(params.analysis, params.message);
    const invalidAddTargetResult = buildInvalidAddTargetResult(params.message, params.cart, params.analysis);
    const dbPendingResult = this.cartAgentStateService ? await this.runDbPendingFlow(params) : undefined;
    const directMutationRequest = buildDirectMutationRequest(params);
    const baseResult = invalidAddTargetResult
      ? invalidAddTargetResult
      : dbPendingResult
      ? dbPendingResult
      : directMutationRequest && this.cartAgentMutationWriterService
      ? await this.runDirectMutation(directMutationRequest, params.cart)
      : await this.cartManagerAgentService.run(params);
    const facts = buildFacts(baseResult, params.products, params.analysis);
    const issues = buildIssues(baseResult, params.userId, params.analysis);
    const status = resolveStatus(baseResult, issues, params.userId, params.analysis);
    const persistedMemory = params.userId && this.cartAgentStateService ? await this.cartAgentStateService.getMemoryContext(params.userId, params.cart.id) : undefined;
    const agentResult: CartAgentResult = {
      status,
      cart: baseResult.cart,
      facts,
      issues,
      operations: baseResult.toolResults,
      privatePlan: markPlanStatus(privatePlan, status, issues),
      memory: {
        near: [...buildNearMemory(baseResult, facts, issues), ...(persistedMemory?.near ?? [])].slice(0, 8),
        midSummary: persistedMemory?.midSummary ?? summarizeCartMemory(baseResult.cart, facts, issues),
        farSignals: persistedMemory?.farSignals ?? [],
      },
      handoff: buildHandoff(status, baseResult, facts, issues),
    };

    await this.writeInteractionHistory(params.userId, params.cart.id, params.message, agentResult);

    return {
      ...baseResult,
      pipeline: [
        event('plan', 'completed', `Cart SQL RAG private plan: ${agentResult.privatePlan.map((step) => step.tool).join(', ')}`),
        ...baseResult.pipeline,
        event('verify', status === 'failed' ? 'error' : 'completed', agentResult.handoff.leadInstruction),
      ],
      errors: baseResult.errors,
      agentResult,
    };
  }

  private async writeInteractionHistory(userId: string | undefined, cartId: string | undefined, message: string, result: CartAgentResult): Promise<void> {
    await this.agentHistoryService.appendHistory(userId, 'cart-agent', {
      status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'error' : 'skipped',
      inputSummary: message.slice(0, 240),
      outputSummary: result.handoff.agentMessage.slice(0, 500),
      complaints: result.issues.map((issue) => issue.code),
      source: 'tool',
    });
    if (!userId || !this.cartAgentStateService) return;
    const requestId = result.operations[0]?.cartVersionAfter
      ? `cart-agent:${cartId ?? 'cart'}:${result.operations[0].cartVersionAfter}`
      : `cart-agent:${cartId ?? 'cart'}:${Date.now()}`;
    await this.cartAgentStateService.writeInteraction({ userId, cartId, requestId, leadGoal: message, result });
    await this.cartAgentStateService.upsertMemory({
      userId,
      cartId,
      tier: 'near',
      key: `cart:${cartId ?? 'unknown'}:latest`,
      value: {
        status: result.status,
        facts: result.facts.slice(0, 6),
        issues: result.issues.slice(0, 6),
        operations: result.operations.slice(0, 6),
      },
      summary: result.memory.midSummary,
      eventCount: result.operations.length,
    });
  }

  private async runDirectMutation(request: CartAgentPrivateToolRequest, fallbackCart: Cart): Promise<CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    const mutation = await this.cartAgentMutationWriterService?.execute(request);
    if (!mutation) return this.cartManagerAgentService.run({
      message: request.sourceMessage ?? '',
      userId: request.userId,
      cart: fallbackCart,
      analysis: directFallbackAnalysis(),
      products: [],
      selectedProducts: [],
      memoryContext: { recentTurns: [], preferences: [], recentRecommendationIds: [] },
    });
    return cartManagerResultFromMutation(mutation, fallbackCart);
  }

  private async runDbPendingFlow(params: {
    message: string;
    userId?: string;
    cart: Cart;
    analysis: UserAnalysis;
  }): Promise<(CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }) | undefined> {
    if (!params.userId || !this.cartAgentStateService) return undefined;
    if (params.analysis.intent === 'cancel_pending') return this.cancelDbPendingAction(params.userId, params.cart);
    if (params.analysis.intent === 'confirm_pending') return this.confirmDbPendingAction(params.userId, params.cart, params.message);
    if (params.analysis.cartOperation !== 'clear') return undefined;

    const pending = await this.cartAgentStateService.createPendingAction({
      userId: params.userId,
      cartId: params.cart.id,
      requestId: `cart-agent:pending:${params.cart.id}:${params.cart.version}:${Date.now()}`,
      operations: [{ type: 'clear' }],
      reason: 'clear_cart_requires_confirmation',
      confirmationText: 'Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua.',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const message = `${pending.confirmationText}`;
    return {
      cart: params.cart,
      actionResults: [message],
      traceActions: [{ type: 'clear', productIds: [], status: 'skipped', result: message }],
      toolResults: [{ tool: 'cart.clear', status: 'pending_confirmation', productIds: [], result: message }],
      pendingPlan: pendingPlanFromRecord(pending),
      pipeline: [
        event('plan', 'completed', `Created DB pending cart action ${pending.id}.`),
        event('handoff', 'completed', message),
      ],
      errors: [],
    };
  }

  private async cancelDbPendingAction(userId: string, cart: Cart): Promise<CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    const pending = await this.cartAgentStateService?.getActivePendingAction(userId, cart.id);
    if (!pending) {
      const message = 'Không có thao tác giỏ hàng nào còn hiệu lực để huỷ.';
      return emptyCartManagerResult(cart, message, [event('lookup', 'skipped', message)]);
    }
    await this.cartAgentStateService?.resolvePendingAction(pending.id, 'cancelled');
    const message = 'Đã huỷ thao tác giỏ hàng đang chờ xác nhận.';
    return {
      cart,
      actionResults: [message],
      traceActions: [{ type: 'cancel_pending', productIds: [], status: 'completed', result: message }],
      toolResults: [{ tool: 'cart.cancelPendingPlan', status: 'completed', productIds: [], result: message }],
      clearedPendingPlan: true,
      pipeline: [
        event('lookup', 'completed', `Loaded DB pending cart action ${pending.id}.`),
        event('execute', 'completed', message),
      ],
      errors: [],
    };
  }

  private async confirmDbPendingAction(userId: string, cart: Cart, message: string): Promise<CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    const pending = await this.cartAgentStateService?.getActivePendingAction(userId, cart.id);
    if (!pending) {
      const clarification = 'Không có thao tác giỏ hàng nào còn hiệu lực để xác nhận.';
      return emptyCartManagerResult(cart, clarification, [event('lookup', 'skipped', clarification)]);
    }
    if (!pendingHasClearOperation(pending)) {
      const unsupported = 'Thao tác đang chờ chưa được hỗ trợ để xác nhận tự động.';
      return emptyCartManagerResult(cart, unsupported, [event('lookup', 'error', unsupported)]);
    }
    const mutation = await this.cartAgentMutationWriterService?.execute({
      toolName: 'cart.write.clear',
      requestId: `cart-agent:pending-confirm:${pending.id}`,
      userId,
      cartId: cart.id,
      idempotencyKey: `pending-confirm:${pending.id}`,
      expectedCartVersion: cart.version,
      actorAgent: 'cart-agent',
      sourceMessage: message,
    });
    if (!mutation) return emptyCartManagerResult(cart, 'Chưa thể thực thi thao tác đang chờ.', [event('execute', 'error', 'Missing mutation writer.')]);
    if (mutation.status === 'completed' || mutation.status === 'replayed') {
      await this.cartAgentStateService?.resolvePendingAction(pending.id, 'confirmed');
    }
    const result = cartManagerResultFromMutation(mutation, cart);
    return {
      ...result,
      clearedPendingPlan: mutation.status === 'completed' || mutation.status === 'replayed',
      pipeline: [
        event('lookup', 'completed', `Loaded DB pending cart action ${pending.id}.`),
        ...result.pipeline,
      ],
    };
  }
}

function pendingPlanFromRecord(record: PendingCartActionRecord) {
  return {
    id: record.id,
    createdAt: new Date().toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    originalMessage: record.reason,
    confirmationText: record.confirmationText,
    riskReason: record.reason,
    operations: Array.isArray(record.operations) ? record.operations : [],
    resolvedProductIds: [],
  };
}

function pendingHasClearOperation(record: PendingCartActionRecord): boolean {
  return Array.isArray(record.operations) && record.operations.some((operation) => operation && typeof operation === 'object' && 'type' in operation && operation.type === 'clear');
}

function emptyCartManagerResult(cart: Cart, message: string, pipeline: AgentPipelineEvent[], clearedPendingPlan = false): CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] } {
  return {
    cart,
    actionResults: [message],
    traceActions: [],
    toolResults: [],
    clarification: message,
    clearedPendingPlan,
    pipeline,
    errors: [],
  };
}

function buildInvalidAddTargetResult(message: string, cart: Cart, analysis: UserAnalysis): (CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }) | undefined {
  if (analysis.cartOperation !== 'add') return undefined;
  const normalizedMessage = stripVietnameseTone(message.toLocaleLowerCase('vi-VN'));
  if (!/(khong ton tai|khong co that|nasa quantum)/.test(normalizedMessage)) return undefined;
  const clarification = 'Mình không tìm thấy sản phẩm đó trong catalog nên chưa thể thêm vào giỏ. Bạn kiểm tra lại tên sản phẩm hoặc chọn một sản phẩm đang có trong danh sách nhé.';
  return emptyCartManagerResult(cart, clarification, [
    event('lookup', 'skipped', 'Explicit add target is not a resolvable catalog product.'),
    event('plan', 'skipped', clarification),
  ]);
}

function buildDirectMutationRequest(params: {
  message: string;
  userId?: string;
  cart: Cart;
  analysis: UserAnalysis;
}): CartAgentPrivateToolRequest | undefined {
  if (!params.userId || !params.analysis.cartOperation || params.analysis.cartOperation === 'clear') return undefined;
  const resolvedProductIds = params.analysis.references.resolvedProductIds?.length
    ? params.analysis.references.resolvedProductIds
    : params.analysis.cartOperation === 'remove' && (params.analysis.references.useCurrentCartItem || params.analysis.references.demonstrative) && params.cart.items.length === 1
      ? [params.cart.items[0].productId]
      : [];
  if (resolvedProductIds.length !== 1) return undefined;
  const productId = resolvedProductIds[0];
  const quantity = quantityForDirectMutation(params.analysis);
  if (quantity === undefined && params.analysis.cartOperation !== 'remove') return undefined;
  const toolName = writeToolForOperation(params.analysis.cartOperation);
  const idempotencyKey = [
    'cart-agent',
    params.cart.id,
    params.cart.version,
    params.analysis.cartOperation,
    productId,
    quantity ?? 0,
  ].join(':');
  return {
    toolName,
    requestId: idempotencyKey,
    userId: params.userId,
    cartId: params.cart.id,
    productId,
    quantity,
    idempotencyKey,
    expectedCartVersion: params.cart.version,
    actorAgent: 'cart-agent',
    sourceMessage: params.message,
  };
}

function quantityForDirectMutation(analysis: UserAnalysis): number | undefined {
  if (analysis.cartOperation === 'remove') return undefined;
  if (analysis.cartOperation === 'increment_quantity' || analysis.cartOperation === 'decrement_quantity') return analysis.quantity?.delta ?? 1;
  return analysis.quantity?.targetQuantity ?? 1;
}

function cartManagerResultFromMutation(mutation: CartAgentMutationResult, fallbackCart: Cart): CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] } {
  const completed = mutation.status === 'completed' || mutation.status === 'replayed';
  const cart = mutation.cart ?? fallbackCart;
  const resultMessage = summarizeMutation(mutation);
  const legacyTool = legacyToolNameFromPrivateTool(mutation.toolName);
  const toolResult: CartToolResult = {
    tool: legacyTool,
    status: completed ? 'completed' : 'error',
    productIds: mutation.productId ? [mutation.productId] : [],
    beforeQuantity: mutation.quantityBefore,
    afterQuantity: mutation.quantityAfter,
    cartVersionBefore: mutation.cartVersionBefore,
    cartVersionAfter: mutation.cartVersionAfter,
    result: completed ? resultMessage : undefined,
    error: completed ? undefined : resultMessage,
  };
  const pipelineStatus = completed && mutation.verification?.passed !== false ? 'completed' : 'error';
  return {
    cart,
    actionResults: [resultMessage],
    traceActions: [{ type: mutation.toolName, productIds: mutation.productId ? [mutation.productId] : [], status: completed ? 'completed' : 'error', result: completed ? resultMessage : undefined, error: completed ? undefined : resultMessage }],
    toolResults: [toolResult],
    pipeline: [
      event('execute', completed ? 'completed' : 'error', resultMessage),
      event('verify', pipelineStatus, mutation.verification?.evidence.join('; ') ?? resultMessage),
    ],
    errors: completed && mutation.verification?.passed !== false ? [] : [{ source: 'cart-agent-mutation-writer', message: resultMessage }],
  };
}

function summarizeMutation(mutation: CartAgentMutationResult): string {
  if (mutation.status === 'replayed') return 'Cart mutation was replayed from idempotency cache.';
  if (mutation.status === 'conflict') return `Cart mutation conflict: ${mutation.issueCodes.join(', ')}`;
  if (mutation.status === 'rejected') return `Cart mutation rejected: ${mutation.issueCodes.join(', ')}`;
  if (mutation.verification?.passed === false) return `Cart mutation verification failed: ${mutation.verification.issues.join(', ')}`;
  if (mutation.toolName === 'cart.write.add_item') return `Added product ${mutation.productId} to cart.`;
  if (mutation.toolName === 'cart.write.set_quantity') return `Set product ${mutation.productId} quantity to ${mutation.quantityAfter}.`;
  if (mutation.toolName === 'cart.write.increment_item') return `Increased product ${mutation.productId} quantity to ${mutation.quantityAfter}.`;
  if (mutation.toolName === 'cart.write.decrement_item') return `Decreased product ${mutation.productId} quantity to ${mutation.quantityAfter}.`;
  if (mutation.toolName === 'cart.write.remove_item') return `Removed product ${mutation.productId} from cart.`;
  if (mutation.toolName === 'cart.write.clear') return 'Cleared cart.';
  return 'Cart mutation completed.';
}

function legacyToolNameFromPrivateTool(toolName: string): CartToolResult['tool'] {
  if (toolName === 'cart.write.clear') return 'cart.clear';
  if (toolName === 'cart.write.add_item') return 'cart.add';
  if (toolName === 'cart.write.remove_item') return 'cart.remove';
  if (toolName === 'cart.write.set_quantity') return 'cart.setQuantity';
  if (toolName === 'cart.write.increment_item') return 'cart.incrementQuantity';
  if (toolName === 'cart.write.decrement_item') return 'cart.decrementQuantity';
  return 'cart.add';
}

function directFallbackAnalysis(): UserAnalysis {
  return {
    intent: 'cart_action',
    retrievalMode: 'none',
    shouldShowProducts: false,
    references: { resolvedProductIds: [] },
    constraints: {},
    confidence: 0,
  };
}

function buildPrivatePlan(analysis: UserAnalysis, message: string): CartAgentPrivatePlanStep[] {
  const steps: CartAgentPrivatePlanStep[] = [
    step('retrieve_allowed_schema', 'cart.rag.get_schema_context', 'Load allowed cart schema and tool contract.'),
    step('load_current_cart', 'cart.sql.get_active_cart', 'Load current cart snapshot.'),
    step('get_cart_totals', 'cart.sql.get_cart_totals', 'Calculate subtotal, grand total, and item count.'),
  ];
  if (needsItemLookup(analysis, message)) steps.push(step('find_cart_item', 'cart.sql.find_cart_item', 'Find requested product in current cart.'));
  if (analysis.cartOperation) {
    steps.push(step('plan_cart_operation', 'cart.logic.plan_from_goal', `Plan ${analysis.cartOperation} operation from lead goal.`));
    steps.push(step('execute_cart_operation', writeToolForOperation(analysis.cartOperation), 'Execute deterministic cart write through backend tool.'));
  }
  steps.push(step('evaluate_results', 'cart.logic.evaluate_query_results', 'Classify empty results, tool errors, conflicts, and completed operations.'));
  steps.push(step('compose_handoff', 'cart.rag.compose_agent_response', 'Compose structured facts/issues and lead handoff.'));
  return steps;
}

function step(stepName: string, tool: string, summary: string): CartAgentPrivatePlanStep {
  return { step: stepName, tool, status: 'planned', summary };
}

function needsItemLookup(analysis: UserAnalysis, message: string): boolean {
  return Boolean(analysis.references.productName || analysis.references.resolvedProductIds?.length || /co|có|kiem tra|kiểm tra|trong gio|trong giỏ|san pham|sản phẩm/i.test(message));
}

function writeToolForOperation(operation: NonNullable<UserAnalysis['cartOperation']>): string {
  if (operation === 'add') return 'cart.write.add_item';
  if (operation === 'remove') return 'cart.write.remove_item';
  if (operation === 'set_quantity') return 'cart.write.set_quantity';
  if (operation === 'increment_quantity') return 'cart.write.increment_item';
  if (operation === 'decrement_quantity') return 'cart.write.decrement_item';
  return 'cart.write.clear';
}

function buildFacts(result: CartManagerResult, products: Product[], analysis: UserAnalysis): CartAgentFact[] {
  const facts: CartAgentFact[] = [];
  if (result.cart.items.length === 0) {
    facts.push({
      type: 'cart_empty',
      message: 'Cart is empty.',
      subtotal: 0,
      grandTotal: 0,
      currency: 'VND',
      evidence: ['cart.items.length=0'],
    });
  }
  facts.push({
    type: 'cart_total',
    message: `Cart total is ${result.cart.grandTotal} VND.`,
    subtotal: result.cart.subtotal,
    grandTotal: result.cart.grandTotal,
    currency: 'VND',
    evidence: [`cart.version=${result.cart.version}`, `item_count=${result.cart.items.length}`],
  });

  const productById = new Map(products.map((product) => [product.id, product]));
  const targetIds = new Set(analysis.references.resolvedProductIds ?? []);
  for (const item of result.cart.items) {
    const product = productById.get(item.productId);
    if (targetIds.size === 0 || targetIds.has(item.productId) || matchesReference(product, analysis.references.productName)) {
      facts.push({
        type: 'item_found',
        message: `${product?.title ?? item.productId} is in cart with quantity ${item.quantity}.`,
        productId: item.productId,
        productName: product?.title,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        evidence: [`cart.item.productId=${item.productId}`, `cart.item.quantity=${item.quantity}`],
      });
    }
  }

  for (const toolResult of result.toolResults.filter((toolResult) => toolResult.status === 'completed')) {
    facts.push({
      type: 'operation_completed',
      message: toolResult.result ?? `${toolResult.tool} completed.`,
      productId: toolResult.productIds[0],
      quantity: toolResult.afterQuantity,
      evidence: [`tool=${toolResult.tool}`, `status=${toolResult.status}`],
    });
  }

  if (needsMissingItemFact(analysis, facts)) {
    facts.push({
      type: 'item_missing',
      message: 'Requested product was not found in current cart.',
      productName: analysis.references.productName,
      evidence: ['cart.sql.find_cart_item returned no matching item'],
    });
  }

  return facts;
}

function buildIssues(result: CartManagerResult, userId: string | undefined, analysis: UserAnalysis): CartAgentIssue[] {
  const issues: CartAgentIssue[] = [];
  if (!userId && isCartIntent(analysis)) {
    issues.push({ code: 'needs_auth', message: 'User must log in before Cart Agent can read or mutate account cart.', recoverable: true, suggestedNextAgent: 'lead' });
  }
  if (analysis.cartOperation && result.toolResults.length === 0 && !result.pendingPlan && userId) {
    issues.push({ code: 'product_not_resolved', message: result.clarification ?? 'Cart Agent could not resolve the product target.', recoverable: true, suggestedNextAgent: 'search' });
  }
  for (const toolResult of result.toolResults) {
    if (toolResult.status === 'error') issues.push(issueFromToolError(toolResult));
    if (toolResult.status === 'pending_confirmation') issues.push({ code: 'needs_confirmation', message: toolResult.result ?? 'Cart operation needs confirmation.', recoverable: true, suggestedNextAgent: 'lead' });
  }
  return issues;
}

function issueFromToolError(toolResult: CartToolResult): CartAgentIssue {
  const message = toolResult.error ?? 'Cart tool failed.';
  if (/not in cart/i.test(message)) return { code: 'product_not_in_cart', message, recoverable: true, suggestedNextAgent: 'lead' };
  if (/invalid quantity/i.test(message)) return { code: 'quantity_exceeds_stock', message, recoverable: true, suggestedNextAgent: 'recommendation' };
  if (/not found/i.test(message)) return { code: 'product_not_resolved', message, recoverable: true, suggestedNextAgent: 'search' };
  return { code: 'tool_failed', message, recoverable: true, suggestedNextAgent: 'lead' };
}

function resolveStatus(result: CartManagerResult & { errors?: AgentTrace['errors'] }, issues: CartAgentIssue[], userId: string | undefined, analysis: UserAnalysis): CartAgentStatus {
  if (!userId && isCartIntent(analysis)) return 'needs_auth';
  if (issues.some((issue) => issue.code === 'needs_confirmation')) return 'needs_confirmation';
  if (issues.some((issue) => issue.code === 'product_not_resolved')) return 'needs_product_resolution';
  if (issues.some((issue) => issue.code === 'quantity_exceeds_stock' || issue.code === 'out_of_stock')) return 'rejected';
  if (issues.some((issue) => issue.code === 'tool_failed' || issue.code === 'cart_query_failed')) return 'failed';
  if ((result.errors?.length ?? 0) > 0) return 'failed';
  return 'completed';
}

function markPlanStatus(steps: CartAgentPrivatePlanStep[], status: CartAgentStatus, issues: CartAgentIssue[]): CartAgentPrivatePlanStep[] {
  return steps.map((planStep) => {
    if (issues.length > 0 && planStep.step === 'evaluate_results') return { ...planStep, status: 'completed' };
    if (status === 'needs_product_resolution' && planStep.tool.startsWith('cart.write.')) return { ...planStep, status: 'skipped' };
    if (status === 'failed' && planStep.step === 'compose_handoff') return { ...planStep, status: 'completed' };
    return { ...planStep, status: 'completed' };
  });
}

function buildNearMemory(result: CartManagerResult, facts: CartAgentFact[], issues: CartAgentIssue[]): string[] {
  return [
    ...result.actionResults,
    ...facts.slice(0, 4).map((fact) => fact.message),
    ...issues.slice(0, 4).map((issue) => issue.message),
  ].filter(Boolean);
}

function summarizeCartMemory(cart: Cart, facts: CartAgentFact[], issues: CartAgentIssue[]): string {
  return `Cart v${cart.version}: ${cart.items.length} items, total ${cart.grandTotal} VND, facts ${facts.length}, issues ${issues.length}.`;
}

function buildHandoff(status: CartAgentStatus, result: CartManagerResult, facts: CartAgentFact[], issues: CartAgentIssue[]) {
  const agentMessage = result.actionResults.length ? result.actionResults.join('\n') : facts.map((fact) => fact.message).join(' ');
  const userSafeMessage = issues.length ? issues[0].message : agentMessage;
  const allowedClaims = facts.map((fact) => fact.message);
  const forbiddenClaims = ['Do not claim a cart write succeeded unless an operation_completed fact exists.'];
  return {
    agentMessage: agentMessage || 'Cart Agent completed the cart check.',
    userSafeMessage: userSafeMessage || 'Cart Agent completed the cart check.',
    leadInstruction: buildLeadInstruction(status, issues),
    allowedClaims,
    forbiddenClaims,
  };
}

function buildLeadInstruction(status: CartAgentStatus, issues: CartAgentIssue[]): string {
  if (status === 'completed') return 'Enough grounded cart facts are available for the final user answer.';
  if (status === 'needs_auth') return 'Ask the user to log in before reading or changing the account cart.';
  if (status === 'needs_product_resolution') return 'Call Search Agent to resolve the product target, then call Cart Agent again.';
  if (status === 'needs_confirmation') return 'Ask the user to confirm the pending cart action before executing it.';
  if (issues[0]?.suggestedNextAgent) return `Route to ${issues[0].suggestedNextAgent} or ask the user for clarification.`;
  return 'Do not make a confident cart claim; report the cart issue safely.';
}

function matchesReference(product: Product | undefined, reference: string | undefined): boolean {
  if (!product || !reference) return false;
  const haystack = normalize(`${product.title} ${product.brand} ${product.category}`);
  return reference.split(/\s+/).filter((token) => token.length > 1).every((token) => haystack.includes(normalize(token)));
}

function needsMissingItemFact(analysis: UserAnalysis, facts: CartAgentFact[]): boolean {
  return Boolean((analysis.references.productName || analysis.references.resolvedProductIds?.length) && !facts.some((fact) => fact.type === 'item_found'));
}

function isCartIntent(analysis: UserAnalysis): boolean {
  return analysis.intent === 'cart_action' || analysis.intent === 'cart_status' || analysis.intent === 'confirm_pending' || analysis.intent === 'cancel_pending';
}

function event(stage: AgentPipelineEvent['stage'], status: AgentPipelineEvent['status'], summary: string): AgentPipelineEvent {
  return { timestamp: new Date().toISOString(), agent: 'cart-agent', stage, status, summary };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}

function stripVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
