import type { Cart } from './commerce.models.js';
import type { CartManagerResult, CartToolResult } from './agent-execution.models.js';

export type CartAgentStatus =
  | 'completed'
  | 'needs_auth'
  | 'needs_product_resolution'
  | 'needs_confirmation'
  | 'conflict'
  | 'rejected'
  | 'failed';

export type CartAgentIssueCode =
  | 'product_not_in_cart'
  | 'product_not_resolved'
  | 'out_of_stock'
  | 'quantity_exceeds_stock'
  | 'cart_query_failed'
  | 'verification_failed'
  | 'needs_auth'
  | 'needs_confirmation'
  | 'cart_conflict'
  | 'tool_failed';

export interface CartAgentFact {
  type: 'cart_total' | 'cart_empty' | 'item_found' | 'item_missing' | 'operation_completed' | 'operation_pending';
  message: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  lineTotal?: number;
  subtotal?: number;
  grandTotal?: number;
  currency?: string;
  evidence: string[];
}

export interface CartAgentIssue {
  code: CartAgentIssueCode;
  message: string;
  recoverable: boolean;
  suggestedNextAgent?: 'search' | 'recommendation' | 'security' | 'customer_support' | 'lead';
}

export interface CartAgentPrivatePlanStep {
  step: string;
  tool: string;
  status: 'planned' | 'completed' | 'skipped' | 'error';
  summary: string;
}

export interface CartAgentHandoff {
  agentMessage: string;
  userSafeMessage: string;
  leadInstruction: string;
  allowedClaims: string[];
  forbiddenClaims: string[];
}

export interface CartAgentResult {
  status: CartAgentStatus;
  cart: Cart;
  facts: CartAgentFact[];
  issues: CartAgentIssue[];
  operations: CartToolResult[];
  privatePlan: CartAgentPrivatePlanStep[];
  memory: {
    near: string[];
    midSummary?: string;
    farSignals: string[];
  };
  handoff: CartAgentHandoff;
}

export type CartAgentRunResult = CartManagerResult & {
  agentResult: CartAgentResult;
};
