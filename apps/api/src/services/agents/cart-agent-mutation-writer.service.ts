import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type { Cart } from '../../models/commerce.models.js';
import type { CartAgentLedgerClient } from './cart-agent-ledger.service.js';
import { cartAgentIdempotencyScope, persistCartAgentLedgerDraft } from './cart-agent-ledger.service.js';
import {
  prepareCartAgentPrivateToolExecution,
  type CartAgentPrivateToolRequest,
} from './cart-agent-private-tool.executor.js';

export type CartAgentMutationStatus = 'completed' | 'replayed' | 'rejected' | 'conflict';

export interface CartAgentMutationResult {
  status: CartAgentMutationStatus;
  issueCodes: string[];
  toolName: string;
  cartId?: string;
  userId?: string;
  productId?: string;
  idempotencyKey?: string;
  eventCreated: boolean;
  cartVersionBefore?: number;
  cartVersionAfter?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  subtotalBefore?: number;
  subtotalAfter?: number;
  cart?: Cart;
  verification?: {
    passed: boolean;
    evidence: string[];
    issues: string[];
  };
  responseJson?: unknown;
}

interface CartMutationCartRow {
  id: string;
  userId: string | null;
  version: number;
  status: string;
  subtotal: number;
  grandTotal: number;
}

interface CartMutationProductRow {
  id: string;
  price: number;
  inventory: number;
}

interface CartMutationCartItemRow {
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartAgentMutationTransactionClient extends CartAgentLedgerClient {
  cart: {
    findUnique(args: { where: { id: string } }): Promise<CartMutationCartRow | null>;
    updateMany(args: { where: { id: string; version: number; userId?: string }; data: { subtotal: number; grandTotal: number; version?: { increment: number } } }): Promise<{ count: number }>;
  };
  product: {
    findUnique(args: { where: { id: string } }): Promise<CartMutationProductRow | null>;
  };
  cartItem: {
    findUnique(args: { where: { cartId_productId: { cartId: string; productId: string } } }): Promise<CartMutationCartItemRow | null>;
    findMany(args: { where: { cartId: string } }): Promise<CartMutationCartItemRow[]>;
    upsert(args: {
      where: { cartId_productId: { cartId: string; productId: string } };
      update: { quantity: number; unitPrice: number; lineTotal: number };
      create: { cartId: string; productId: string; quantity: number; unitPrice: number; lineTotal: number };
    }): Promise<CartMutationCartItemRow>;
    deleteMany(args: { where: { cartId: string; productId?: string } }): Promise<{ count: number }>;
  };
}

interface PrismaTransactionCapableClient {
  $transaction<T>(handler: (client: CartAgentMutationTransactionClient) => Promise<T>): Promise<T>;
}

@Injectable()
export class CartAgentMutationWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(request: CartAgentPrivateToolRequest): Promise<CartAgentMutationResult> {
    return (this.prisma.client as unknown as PrismaTransactionCapableClient).$transaction((client) => executeCartAgentMutationTransaction(client, request));
  }
}

export async function executeCartAgentMutationTransaction(
  client: CartAgentMutationTransactionClient,
  request: CartAgentPrivateToolRequest,
): Promise<CartAgentMutationResult> {
  const prepared = prepareCartAgentPrivateToolExecution(request);
  if (prepared.status !== 'ready' || !prepared.ledgerDraft) {
    return baseResult(request, 'rejected', prepared.issueCodes);
  }
  if (!isCartItemMutationTool(request.toolName)) {
    return baseResult(request, 'rejected', [`unsupported_cart_mutation_tool:${request.toolName}`]);
  }

  const idempotencyScope = request.idempotencyKey ? cartAgentIdempotencyScope(request.toolName) : undefined;
  if (request.idempotencyKey && idempotencyScope) {
    const cached = await client.idempotencyKey.findUnique({ where: { scope_key: { scope: idempotencyScope, key: request.idempotencyKey } } });
    if (cached) return { ...baseResult(request, 'replayed', []), responseJson: cached.responseJson };
  }

  const cartBefore = await client.cart.findUnique({ where: { id: prepared.ledgerDraft.cartId } });
  if (!cartBefore || cartBefore.status !== 'active') return baseResult(request, 'rejected', ['cart_not_active_or_missing']);
  if (cartBefore.userId !== prepared.ledgerDraft.userId) return baseResult(request, 'rejected', ['cart_scope_mismatch']);
  if (cartBefore.version !== request.expectedCartVersion) {
    return {
      ...baseResult(request, 'conflict', ['stale_cart_version']),
      cartVersionBefore: cartBefore.version,
      subtotalBefore: cartBefore.subtotal,
    };
  }

  const product = request.productId ? await client.product.findUnique({ where: { id: request.productId } }) : null;
  if (request.toolName !== 'cart.write.clear' && !product) return baseResult(request, 'rejected', ['product_not_found']);

  const existingItem = request.productId
    ? await client.cartItem.findUnique({ where: { cartId_productId: { cartId: cartBefore.id, productId: request.productId } } })
    : null;
  const quantityBefore = existingItem?.quantity ?? 0;
  const quantityAfter = nextQuantityForTool(request.toolName, quantityBefore, request.quantity);
  const quantityIssue = validateNextQuantity(request.toolName, quantityAfter, product?.inventory);
  if (quantityIssue) return baseResult(request, 'rejected', [quantityIssue]);

  const versionClaim = await client.cart.updateMany({
    where: { id: cartBefore.id, version: cartBefore.version, userId: prepared.ledgerDraft.userId },
    data: { subtotal: cartBefore.subtotal, grandTotal: cartBefore.grandTotal, version: { increment: 1 } },
  });
  if (versionClaim.count !== 1) {
    return {
      ...baseResult(request, 'conflict', ['cart_version_claim_conflict']),
      cartVersionBefore: cartBefore.version,
      subtotalBefore: cartBefore.subtotal,
    };
  }

  if (request.toolName === 'cart.write.clear') {
    await client.cartItem.deleteMany({ where: { cartId: cartBefore.id } });
  } else if (request.toolName === 'cart.write.remove_item' || quantityAfter === 0) {
    await client.cartItem.deleteMany({ where: { cartId: cartBefore.id, productId: request.productId } });
  } else if (request.productId && product) {
    await client.cartItem.upsert({
      where: { cartId_productId: { cartId: cartBefore.id, productId: request.productId } },
      update: { quantity: quantityAfter, unitPrice: product.price, lineTotal: product.price * quantityAfter },
      create: { cartId: cartBefore.id, productId: request.productId, quantity: quantityAfter, unitPrice: product.price, lineTotal: product.price * quantityAfter },
    });
  }

  const itemsAfter = await client.cartItem.findMany({ where: { cartId: cartBefore.id } });
  const subtotalAfter = itemsAfter.reduce((sum, item) => sum + item.lineTotal, 0);
  const cartUpdate = await client.cart.updateMany({
    where: { id: cartBefore.id, version: cartBefore.version + 1, userId: prepared.ledgerDraft.userId },
    data: { subtotal: subtotalAfter, grandTotal: subtotalAfter },
  });
  if (cartUpdate.count !== 1) {
    return {
      ...baseResult(request, 'conflict', ['cart_version_update_conflict']),
      cartVersionBefore: cartBefore.version + 1,
      subtotalBefore: cartBefore.subtotal,
    };
  }

  const responseJson = {
    status: 'completed',
    toolName: request.toolName,
    cartId: cartBefore.id,
    productId: request.productId,
    quantityBefore,
    quantityAfter: request.toolName === 'cart.write.clear' ? undefined : quantityAfter,
    cartVersionBefore: cartBefore.version,
    cartVersionAfter: cartBefore.version + 1,
    subtotalBefore: cartBefore.subtotal,
    subtotalAfter,
  };
  const verifiedCart = toCartSnapshot(cartBefore, itemsAfter, cartBefore.version + 1, subtotalAfter);
  const verification = verifyCartMutationResult({
    cart: verifiedCart,
    expectedVersion: cartBefore.version + 1,
    expectedSubtotal: subtotalAfter,
    toolName: request.toolName,
    productId: request.productId,
    expectedQuantity: request.toolName === 'cart.write.clear' ? undefined : quantityAfter,
  });
  const ledger = await persistCartAgentLedgerDraft(client, {
    ...prepared.ledgerDraft,
    quantityBefore,
    quantityAfter: request.toolName === 'cart.write.clear' ? undefined : quantityAfter,
    cartVersionAfter: cartBefore.version + 1,
    subtotalBefore: cartBefore.subtotal,
    subtotalAfter,
  }, responseJson as Prisma.InputJsonObject);

  return {
    ...baseResult(request, 'completed', []),
    eventCreated: ledger.eventCreated,
    cartVersionBefore: cartBefore.version,
    cartVersionAfter: cartBefore.version + 1,
    quantityBefore,
    quantityAfter: request.toolName === 'cart.write.clear' ? undefined : quantityAfter,
    subtotalBefore: cartBefore.subtotal,
    subtotalAfter,
    cart: verifiedCart,
    verification,
    responseJson,
  };
}

function baseResult(request: CartAgentPrivateToolRequest, status: CartAgentMutationStatus, issueCodes: string[]): CartAgentMutationResult {
  return {
    status,
    issueCodes,
    toolName: request.toolName,
    cartId: request.cartId,
    userId: request.userId,
    productId: request.productId,
    idempotencyKey: request.idempotencyKey,
    eventCreated: false,
  };
}

function isCartItemMutationTool(toolName: string): boolean {
  return [
    'cart.write.add_item',
    'cart.write.set_quantity',
    'cart.write.increment_item',
    'cart.write.decrement_item',
    'cart.write.remove_item',
    'cart.write.clear',
  ].includes(toolName);
}

function nextQuantityForTool(toolName: string, currentQuantity: number, requestedQuantity?: number): number {
  if (toolName === 'cart.write.add_item') return currentQuantity + (requestedQuantity ?? 0);
  if (toolName === 'cart.write.set_quantity') return requestedQuantity ?? currentQuantity;
  if (toolName === 'cart.write.increment_item') return currentQuantity + (requestedQuantity ?? 0);
  if (toolName === 'cart.write.decrement_item') return Math.max(0, currentQuantity - (requestedQuantity ?? 0));
  if (toolName === 'cart.write.remove_item') return 0;
  return currentQuantity;
}

function validateNextQuantity(toolName: string, quantityAfter: number, inventory?: number): string | undefined {
  if (!Number.isInteger(quantityAfter) || quantityAfter < 0) return 'invalid_quantity';
  if (toolName === 'cart.write.add_item' || toolName === 'cart.write.set_quantity' || toolName === 'cart.write.increment_item') {
    if (quantityAfter < 1) return 'invalid_quantity';
    if (inventory !== undefined && quantityAfter > inventory) return 'out_of_stock';
  }
  return undefined;
}

function toCartSnapshot(cartBefore: CartMutationCartRow, items: CartMutationCartItemRow[], version: number, subtotal: number): Cart {
  return {
    id: cartBefore.id,
    version,
    status: 'active',
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal,
    grandTotal: subtotal,
  };
}

function verifyCartMutationResult(params: {
  cart: Cart;
  expectedVersion: number;
  expectedSubtotal: number;
  toolName: string;
  productId?: string;
  expectedQuantity?: number;
}): CartAgentMutationResult['verification'] {
  const issues: string[] = [];
  if (params.cart.version !== params.expectedVersion) issues.push('version_mismatch');
  if (params.cart.subtotal !== params.expectedSubtotal || params.cart.grandTotal !== params.expectedSubtotal) issues.push('total_mismatch');
  if (params.toolName === 'cart.write.clear' && params.cart.items.length !== 0) issues.push('clear_failed_items_remain');
  if (params.productId && params.expectedQuantity !== undefined) {
    const itemQuantity = params.cart.items.find((item) => item.productId === params.productId)?.quantity ?? 0;
    if (itemQuantity !== params.expectedQuantity) issues.push('quantity_mismatch');
  }
  return {
    passed: issues.length === 0,
    issues,
    evidence: [
      `cart.version=${params.cart.version}`,
      `cart.subtotal=${params.cart.subtotal}`,
      `item_count=${params.cart.items.length}`,
    ],
  };
}
