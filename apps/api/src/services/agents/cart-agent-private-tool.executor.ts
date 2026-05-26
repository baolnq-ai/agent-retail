import { Injectable } from '@nestjs/common';
import { getCartAgentTool, isAllowedCartAgentTool, type CartAgentToolDefinition } from './cart-agent-tool.registry.js';

export type CartAgentPrivateToolStatus = 'ready' | 'rejected';

export interface CartAgentPrivateToolRequest {
  toolName: string;
  userId?: string;
  cartId?: string;
  requestId: string;
  idempotencyKey?: string;
  expectedCartVersion?: number;
  productId?: string;
  quantity?: number;
  actorAgent?: string;
  sourceMessage?: string;
}

export interface CartAgentLedgerDraft {
  cartId: string;
  userId: string;
  requestId: string;
  idempotencyKey?: string;
  type: string;
  productId?: string;
  quantityBefore?: number;
  quantityAfter?: number;
  cartVersionBefore?: number;
  cartVersionAfter?: number;
  subtotalBefore?: number;
  subtotalAfter?: number;
  actorType: 'agent';
  actorAgent: string;
  toolName: string;
  sourceMessage?: string;
}

export interface CartAgentPrivateToolPreparedExecution {
  status: CartAgentPrivateToolStatus;
  issueCodes: string[];
  tool?: CartAgentToolDefinition;
  ledgerDraft?: CartAgentLedgerDraft;
}

@Injectable()
export class CartAgentPrivateToolExecutorService {
  prepare(request: CartAgentPrivateToolRequest): CartAgentPrivateToolPreparedExecution {
    return prepareCartAgentPrivateToolExecution(request);
  }
}

export function prepareCartAgentPrivateToolExecution(request: CartAgentPrivateToolRequest): CartAgentPrivateToolPreparedExecution {
  const tool = getCartAgentTool(request.toolName);
  const issueCodes = validateCartAgentPrivateToolRequest(request, tool);
  if (issueCodes.length > 0 || !tool) {
    return { status: 'rejected', issueCodes, tool };
  }

  return {
    status: 'ready',
    issueCodes: [],
    tool,
    ledgerDraft: tool.write ? buildLedgerDraft(request) : undefined,
  };
}

export function validateCartAgentPrivateToolRequest(request: CartAgentPrivateToolRequest, tool = getCartAgentTool(request.toolName)): string[] {
  const issueCodes: string[] = [];
  if (!isAllowedCartAgentTool(request.toolName) || !tool) return [`tool_not_allowed:${request.toolName}`];
  if (request.toolName.toLocaleLowerCase('vi-VN').includes('raw')) issueCodes.push(`raw_sql_not_allowed:${request.toolName}`);
  if (tool.requiresAuth && !request.userId) issueCodes.push(`missing_user:${request.toolName}`);
  if (tool.requiresAuth && !request.cartId) issueCodes.push(`missing_cart:${request.toolName}`);
  if (tool.requiresIdempotency && !request.idempotencyKey) issueCodes.push(`missing_idempotency_key:${request.toolName}`);
  if (tool.requiresCartVersion && request.expectedCartVersion === undefined) issueCodes.push(`missing_expected_cart_version:${request.toolName}`);
  if (tool.category === 'write' && ['cart.write.add_item', 'cart.write.set_quantity', 'cart.write.increment_item', 'cart.write.decrement_item', 'cart.write.remove_item'].includes(tool.name) && !request.productId) {
    issueCodes.push(`missing_product_id:${request.toolName}`);
  }
  if (tool.category === 'write' && ['cart.write.add_item', 'cart.write.set_quantity', 'cart.write.increment_item', 'cart.write.decrement_item'].includes(tool.name) && !Number.isInteger(request.quantity)) {
    issueCodes.push(`missing_quantity:${request.toolName}`);
  }
  return issueCodes;
}

export function buildLedgerDraft(request: CartAgentPrivateToolRequest): CartAgentLedgerDraft {
  if (!request.userId || !request.cartId) {
    throw new Error('Cannot build cart ledger draft without userId and cartId.');
  }
  return {
    cartId: request.cartId,
    userId: request.userId,
    requestId: request.requestId,
    idempotencyKey: request.idempotencyKey,
    type: eventTypeFromTool(request.toolName),
    productId: request.productId,
    quantityAfter: request.quantity,
    cartVersionBefore: request.expectedCartVersion,
    actorType: 'agent',
    actorAgent: request.actorAgent ?? 'cart-agent',
    toolName: request.toolName,
    sourceMessage: request.sourceMessage ? request.sourceMessage.slice(0, 500) : undefined,
  };
}

function eventTypeFromTool(toolName: string): string {
  if (toolName === 'cart.write.add_item') return 'add';
  if (toolName === 'cart.write.set_quantity') return 'set_quantity';
  if (toolName === 'cart.write.increment_item') return 'increment';
  if (toolName === 'cart.write.decrement_item') return 'decrement';
  if (toolName === 'cart.write.remove_item') return 'remove';
  if (toolName === 'cart.write.clear') return 'clear';
  if (toolName === 'cart.write.create_pending_action') return 'pending_created';
  if (toolName === 'cart.write.confirm_pending_action') return 'pending_confirmed';
  if (toolName === 'cart.write.cancel_pending_action') return 'pending_cancelled';
  if (toolName === 'cart.audit.write_interaction') return 'interaction';
  if (toolName === 'cart.memory.write_near') return 'memory_near';
  if (toolName === 'cart.memory.summarize_mid') return 'memory_mid';
  if (toolName === 'cart.memory.update_far') return 'memory_far';
  return 'tool_event';
}
