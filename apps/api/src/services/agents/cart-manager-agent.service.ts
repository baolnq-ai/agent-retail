import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AgentTrace } from '../../models/agent.models.js';
import type { Cart } from '../../models/commerce.models.js';
import type { Product } from '../../models/catalog.models.js';
import type { AgentPipelineEvent, CartManagerResult, CartToolOperation, CartToolResult, PendingCartPlan, PendingCartOperation, UserAnalysis } from '../../models/agent-execution.models.js';
import { ChatMemoryService, type ChatMemoryContext } from '../chat-memory.service.js';
import { CommerceService } from '../commerce.service.js';

@Injectable()
export class CartManagerAgentService {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly chatMemoryService: ChatMemoryService,
  ) {}

  async run(params: {
    message: string;
    userId?: string;
    cart: Cart;
    analysis: UserAnalysis;
    products: Product[];
    selectedProducts: Product[];
    memoryContext: ChatMemoryContext;
  }): Promise<CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    const pipeline: AgentPipelineEvent[] = [];
    const errors: AgentTrace['errors'] = [];
    const startedCart = params.cart;

    pipeline.push(event('analyze', 'completed', `Cart intent: ${params.analysis.cartOperation ?? params.analysis.intent}.`));

    if (!params.userId && isCartIntent(params.analysis)) {
      const result = 'Bạn cần đăng nhập để thao tác giỏ hàng.';
      return {
        cart: params.cart,
        actionResults: [result],
        traceActions: [{ type: params.analysis.cartOperation ?? params.analysis.intent, productIds: [], status: 'error', error: result }],
        toolResults: [{ tool: 'cart.setQuantity', status: 'error', productIds: [], error: result }],
        pipeline: [...pipeline, event('execute', 'error', result)],
        errors: [{ source: 'cart-manager-agent', message: result }],
      };
    }

    if (params.analysis.intent === 'cancel_pending' && params.userId) {
      await this.chatMemoryService.clearPendingCartPlan(params.userId);
      const result = 'Đã huỷ thao tác giỏ hàng đang chờ xác nhận.';
      return {
        cart: params.cart,
        actionResults: [result],
        traceActions: [{ type: 'cancel_pending', productIds: [], status: 'completed', result }],
        toolResults: [{ tool: 'cart.cancelPendingPlan', status: 'completed', productIds: [], result }],
        clearedPendingPlan: true,
        pipeline: [...pipeline, event('execute', 'completed', result), event('verify', 'completed', 'Không thay đổi giỏ hàng.')],
        errors,
      };
    }

    if (params.analysis.intent === 'confirm_pending') {
      const pendingPlan = params.memoryContext.pendingCartPlan;
      if (!pendingPlan || Date.parse(pendingPlan.expiresAt) <= Date.now()) {
        const clarification = 'Không có thao tác giỏ hàng nào còn hiệu lực để xác nhận.';
        return emptyResult(params.cart, clarification, [...pipeline, event('plan', 'skipped', clarification)], errors);
      }
      const operations = this.operationsFromPendingPlan(pendingPlan, params.products);
      pipeline.push(event('plan', 'completed', `Xác nhận pending plan ${pendingPlan.id}.`, { operations: operations.map((operation) => operation.tool) }));
      const executed = await this.executeOperations(params.userId, startedCart, operations);
      if (params.userId) await this.chatMemoryService.clearPendingCartPlan(params.userId);
      return {
        ...executed,
        clearedPendingPlan: true,
        pipeline: [...pipeline, ...executed.pipeline, event('verify', 'completed', summarizeVerification(startedCart, executed.cart))],
        errors: executed.errors,
      };
    }

    if (!params.analysis.cartOperation) return emptyResult(params.cart, '', [...pipeline, event('plan', 'skipped', 'Không có thao tác giỏ hàng.')], errors);

    const operations = this.buildOperations(params);
    pipeline.push(event('lookup', operations.length ? 'completed' : 'skipped', operations.length ? `Resolved ${operations.length} cart operation(s).` : 'Chưa resolve được sản phẩm cần thao tác.'));
    if (operations.length === 0) {
      const clarification = 'Mình chưa xác định được sản phẩm cần thao tác, bạn nói rõ tên sản phẩm hoặc vị trí trong giỏ giúp mình nhé.';
      return emptyResult(params.cart, clarification, [...pipeline, event('handoff', 'completed', clarification)], errors);
    }

    const needsConfirmation = shouldAskConfirmation(params.analysis, operations);
    if (needsConfirmation && params.userId) {
      const pendingPlan = buildPendingPlan(params.message, operations);
      await this.chatMemoryService.savePendingCartPlan(params.userId, pendingPlan);
      const result = `${pendingPlan.confirmationText} Trả lời “Đúng” để xác nhận hoặc “Huỷ” để bỏ qua.`;
      return {
        cart: params.cart,
        actionResults: [result],
        traceActions: operations.map((operation) => ({ type: operation.type, productIds: operation.productId ? [operation.productId] : [], status: 'skipped' as const, result })),
        toolResults: operations.map((operation) => ({ tool: operation.tool, status: 'pending_confirmation' as const, productIds: operation.productId ? [operation.productId] : [], result })),
        pendingPlan,
        pipeline: [...pipeline, event('plan', 'completed', `Saved pending plan ${pendingPlan.id}.`), event('handoff', 'completed', result)],
        errors,
      };
    }

    pipeline.push(event('plan', 'completed', `Built cart tool plan: ${operations.map((operation) => operation.tool).join(', ')}.`));
    const executed = await this.executeOperations(params.userId, startedCart, operations);
    return {
      ...executed,
      pipeline: [...pipeline, ...executed.pipeline, event('verify', 'completed', summarizeVerification(startedCart, executed.cart))],
      errors: executed.errors,
    };
  }

  private buildOperations(params: { message: string; cart: Cart; analysis: UserAnalysis; products: Product[]; selectedProducts: Product[]; memoryContext: ChatMemoryContext }): CartToolOperation[] {
    const operation = params.analysis.cartOperation;
    if (!operation) return [];
    if (operation === 'clear') return [{ type: 'clear', tool: 'cart.clear' }];

    const productPool = mergeProducts(params.products, params.selectedProducts);
    const resolvedProducts = productsFromResolvedReferences(params.analysis, productPool);
    if (operation === 'add' && resolvedProducts.length > 0) {
      return resolvedProducts.map((candidate) => ({ type: 'add', tool: 'cart.add', product: candidate, productId: candidate.id, quantity: params.analysis.quantity?.targetQuantity ?? 1 }));
    }

    const product = resolveProduct(params.analysis, params.cart, productPool);
    if (!product && operation === 'add' && params.selectedProducts.length > 0) {
      return params.selectedProducts.map((candidate) => ({ type: 'add', tool: 'cart.add', product: candidate, productId: candidate.id, quantity: params.analysis.quantity?.targetQuantity ?? 1 }));
    }
    if (!product) return [];

    if (operation === 'add') return [{ type: 'add', tool: 'cart.add', product, productId: product.id, quantity: params.analysis.quantity?.targetQuantity ?? 1 }];
    if (operation === 'remove') return [{ type: 'remove', tool: 'cart.remove', product, productId: product.id }];
    if (operation === 'set_quantity') return [{ type: 'set_quantity', tool: 'cart.setQuantity', product, productId: product.id, quantity: params.analysis.quantity?.targetQuantity ?? 1 }];
    if (operation === 'increment_quantity') return [{ type: 'increment_quantity', tool: 'cart.incrementQuantity', product, productId: product.id, delta: params.analysis.quantity?.delta ?? 1 }];
    if (operation === 'decrement_quantity') return [{ type: 'decrement_quantity', tool: 'cart.decrementQuantity', product, productId: product.id, delta: params.analysis.quantity?.delta ?? 1 }];
    return [];
  }

  private operationsFromPendingPlan(plan: PendingCartPlan, products: Product[]): CartToolOperation[] {
    return plan.operations.map((operation) => {
      const product = operation.productId ? products.find((candidate) => candidate.id === operation.productId) : undefined;
      return {
        type: operation.type,
        tool: toolFromOperation(operation.type),
        product,
        productId: operation.productId,
        quantity: operation.quantity,
        delta: operation.delta,
      };
    });
  }

  private async executeOperations(userId: string | undefined, cart: Cart, operations: CartToolOperation[]): Promise<CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] }> {
    let nextCart = cart;
    const actionResults: string[] = [];
    const traceActions: CartManagerResult['traceActions'] = [];
    const toolResults: CartToolResult[] = [];
    const pipeline: AgentPipelineEvent[] = [];
    const errors: AgentTrace['errors'] = [];

    for (const operation of operations) {
      const productIds = operation.productId ? [operation.productId] : [];
      const beforeQuantity = operation.productId ? nextCart.items.find((item) => item.productId === operation.productId)?.quantity ?? 0 : undefined;
      try {
        if (!userId) throw new Error('Bạn cần đăng nhập để thao tác giỏ hàng.');
        if (operation.type === 'clear') nextCart = await this.commerceService.clearCurrentCart(userId);
        if (operation.type === 'add' && operation.productId) nextCart = await this.commerceService.addItemToCurrentCart(userId, operation.productId, operation.quantity ?? 1);
        if (operation.type === 'remove' && operation.productId) nextCart = await this.commerceService.removeCurrentCartItem(userId, operation.productId);
        if (operation.type === 'set_quantity' && operation.productId) nextCart = await this.commerceService.updateCurrentCartItem(userId, operation.productId, operation.quantity ?? 1);
        if (operation.type === 'increment_quantity' && operation.productId) nextCart = await this.commerceService.incrementCurrentCartItem(userId, operation.productId, operation.delta ?? 1);
        if (operation.type === 'decrement_quantity' && operation.productId) nextCart = await this.commerceService.decrementCurrentCartItem(userId, operation.productId, operation.delta ?? 1);
        const afterQuantity = operation.productId ? nextCart.items.find((item) => item.productId === operation.productId)?.quantity ?? 0 : undefined;
        const result = summarizeOperation(operation, beforeQuantity, afterQuantity);
        actionResults.push(result);
        traceActions.push({ type: operation.type, productIds, status: 'completed', result });
        toolResults.push({ tool: operation.tool, status: 'completed', productIds, beforeQuantity, afterQuantity, cartVersionBefore: cart.version, cartVersionAfter: nextCart.version, result });
        pipeline.push(event('execute', 'completed', result, { tool: operation.tool, productIds }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thực hiện được thao tác giỏ hàng.';
        actionResults.push(message);
        traceActions.push({ type: operation.type, productIds, status: 'error', error: message });
        toolResults.push({ tool: operation.tool, status: 'error', productIds, beforeQuantity, error: message });
        pipeline.push(event('execute', 'error', message, { tool: operation.tool, productIds }));
        errors.push({ source: 'cart-manager-agent', message });
      }
    }

    return { cart: nextCart, actionResults, traceActions, toolResults, pipeline, errors };
  }
}

function isCartIntent(analysis: UserAnalysis): boolean {
  return analysis.intent === 'cart_action' || analysis.intent === 'cart_status' || analysis.intent === 'confirm_pending' || analysis.intent === 'cancel_pending';
}

function productsFromResolvedReferences(analysis: UserAnalysis, products: Product[]): Product[] {
  const productIds = analysis.references.resolvedProductIds;
  if (!productIds?.length) return [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const resolved = productIds.map((productId) => productById.get(productId)).filter((product): product is Product => product !== undefined);
  const contextualMatches = analysis.references.productName
    ? resolved.filter((product) => productMatchesReference(product, analysis.references.productName ?? ''))
    : resolved;
  const candidates = contextualMatches.length > 0 ? contextualMatches : resolved;
  return analysis.references.allLastRecommendations ? candidates : candidates.slice(0, 1);
}

function resolveProduct(analysis: UserAnalysis, cart: Cart, products: Product[]): Product | undefined {
  const resolvedProducts = productsFromResolvedReferences(analysis, products);
  if (resolvedProducts.length === 1) return resolvedProducts[0];
  if (analysis.references.productName) {
    const named = products.find((product) => productMatchesReference(product, analysis.references.productName ?? ''));
    if (named) return named;
  }
  if (analysis.references.ordinal) {
    const cartItem = cart.items[analysis.references.ordinal - 1];
    const product = cartItem ? products.find((candidate) => candidate.id === cartItem.productId) : products[analysis.references.ordinal - 1];
    if (product) return product;
  }
  if (analysis.references.useCurrentCartItem || analysis.references.demonstrative) {
    if (cart.items.length === 1) return products.find((product) => product.id === cart.items[0].productId);
  }
  return products.length === 1 ? products[0] : undefined;
}

function productMatchesReference(product: Product, reference: string): boolean {
  const normalizedReference = normalize(reference);
  const haystack = normalize(`${product.title} ${product.brand} ${product.category} ${product.description}`);
  const referenceTokens = normalizedReference
    .split(/\s+/)
    .filter((token) => token.length > 1 && !['thêm', 'add', 'sản', 'phẩm', 'món', 'cái', 'vào', 'giỏ', 'cart', 'đi'].includes(token));
  return referenceTokens.length > 0 && referenceTokens.every((token) => haystack.includes(token));
}

function shouldAskConfirmation(analysis: UserAnalysis, operations: CartToolOperation[]): boolean {
  if (analysis.cartOperation === 'clear') return true;
  if (analysis.cartOperation === 'add' && analysis.references.resolvedProductIds?.length && analysis.references.allLastRecommendations) return false;
  if (operations.length > 1) return true;
  return false;
}

function buildPendingPlan(message: string, operations: CartToolOperation[]): PendingCartPlan {
  const pendingOperations: PendingCartOperation[] = operations.map((operation) => ({
    type: operation.type,
    productId: operation.productId,
    quantity: operation.quantity,
    delta: operation.delta,
  }));
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    originalMessage: message,
    confirmationText: describePendingOperations(operations),
    riskReason: operations.some((operation) => operation.type === 'clear') ? 'Thao tác xoá rộng cần xác nhận.' : 'Thao tác nhiều sản phẩm cần xác nhận.',
    operations: pendingOperations,
    resolvedProductIds: operations.map((operation) => operation.productId).filter((productId): productId is string => Boolean(productId)),
  };
}

function describePendingOperations(operations: CartToolOperation[]): string {
  if (operations.some((operation) => operation.type === 'clear')) return 'Mình sẽ xoá toàn bộ giỏ hàng';
  return `Mình sẽ thao tác ${operations.length} sản phẩm trong giỏ hàng.`;
}

function toolFromOperation(operation: PendingCartOperation['type']): CartToolOperation['tool'] {
  if (operation === 'clear') return 'cart.clear';
  if (operation === 'add') return 'cart.add';
  if (operation === 'remove') return 'cart.remove';
  if (operation === 'set_quantity') return 'cart.setQuantity';
  if (operation === 'increment_quantity') return 'cart.incrementQuantity';
  return 'cart.decrementQuantity';
}

function summarizeOperation(operation: CartToolOperation, beforeQuantity?: number, afterQuantity?: number): string {
  const title = operation.product?.title ?? 'sản phẩm';
  if (operation.type === 'clear') return 'Đã xoá toàn bộ sản phẩm trong giỏ hàng.';
  if (operation.type === 'add') return `Đã thêm ${operation.quantity ?? 1} × ${title} vào giỏ hàng.`;
  if (operation.type === 'remove') return `Đã xoá ${title} khỏi giỏ hàng.`;
  if (operation.type === 'set_quantity') return afterQuantity === 0 ? `Đã xoá ${title} khỏi giỏ hàng.` : `Đã cập nhật ${title} thành số lượng ${afterQuantity}.`;
  if (operation.type === 'increment_quantity') return `Đã tăng ${title} từ ${beforeQuantity ?? 0} lên ${afterQuantity ?? 0}.`;
  return afterQuantity === 0 ? `Đã giảm ${title} về 0 và xoá khỏi giỏ hàng.` : `Đã giảm ${title} từ ${beforeQuantity ?? 0} xuống ${afterQuantity ?? 0}.`;
}

function summarizeVerification(beforeCart: Cart, afterCart: Cart): string {
  return `Cart version ${beforeCart.version} → ${afterCart.version}, items ${beforeCart.items.length} → ${afterCart.items.length}.`;
}

function emptyResult(cart: Cart, clarification: string, pipeline: AgentPipelineEvent[], errors: AgentTrace['errors']): CartManagerResult & { pipeline: AgentPipelineEvent[]; errors: AgentTrace['errors'] } {
  return { cart, actionResults: clarification ? [clarification] : [], traceActions: [], toolResults: [], clarification: clarification || undefined, pipeline, errors };
}

function event(stage: AgentPipelineEvent['stage'], status: AgentPipelineEvent['status'], summary: string, details?: AgentPipelineEvent['details']): AgentPipelineEvent {
  return { timestamp: new Date().toISOString(), agent: 'cart-manager-agent', stage, status, summary, details };
}

function mergeProducts(left: Product[], right: Product[]): Product[] {
  const productById = new Map(left.map((product) => [product.id, product]));
  for (const product of right) productById.set(product.id, product);
  return Array.from(productById.values());
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}
