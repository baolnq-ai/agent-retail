import type { Product, KnowledgeDocument } from './catalog.models.js';
import type { Cart } from './commerce.models.js';
import type { AgentTraceAgent, AgentTraceStepStatus } from './agent.models.js';

export type AgentPipelineStage = 'analyze' | 'lookup' | 'investigate' | 'plan' | 'execute' | 'verify' | 'handoff';
export type AgentPipelineStatus = AgentTraceStepStatus;
export type CartToolName = 'cart.clear' | 'cart.add' | 'cart.remove' | 'cart.setQuantity' | 'cart.incrementQuantity' | 'cart.decrementQuantity' | 'cart.confirmPendingPlan' | 'cart.cancelPendingPlan';
export type CartOperationKind = 'clear' | 'add' | 'remove' | 'set_quantity' | 'increment_quantity' | 'decrement_quantity';

export interface AgentPipelineEvent {
  timestamp: string;
  agent: AgentTraceAgent;
  stage: AgentPipelineStage;
  status: AgentPipelineStatus;
  summary: string;
  details?: Record<string, string | number | boolean | string[]>;
}

export interface AgentPipelineResult<T> {
  status: AgentPipelineStatus;
  data: T;
  events: AgentPipelineEvent[];
  errors: Array<{ source: string; message: string }>;
  handoff?: string;
}

export interface PendingCartOperation {
  type: CartOperationKind;
  productId?: string;
  quantity?: number;
  delta?: number;
}

export interface PendingCartPlan {
  id: string;
  createdAt: string;
  expiresAt: string;
  originalMessage: string;
  confirmationText: string;
  riskReason: string;
  operations: PendingCartOperation[];
  resolvedProductIds: string[];
}

export interface MemoryInvestigationResult {
  requiresHistory: boolean;
  resolvedReference?: 'new_product' | 'previous_product' | 'last_recommendation' | 'all_last_recommendations' | 'another_option';
  referenceProductIds: string[];
  lastIntent?: string;
  lastSelectedProductIds: string[];
  lastCartActionProductIds: string[];
  summary?: string;
  confidence: number;
}

export type MemoryAgentNodeKind = 'recent_turn' | 'summary' | 'preference' | 'recommendation' | 'pending_cart' | 'trace_metadata';

export interface MemoryAgentVisitedNode {
  id: string;
  kind: MemoryAgentNodeKind;
  label: string;
  score: number;
  depth: number;
  productIds?: string[];
}

export interface MemoryAgentResult extends MemoryInvestigationResult {
  visitedNodes: MemoryAgentVisitedNode[];
  evidence: string[];
}

export type RetrievalMode = 'none' | 'recent' | 'fresh' | 'alternatives';

export interface ProductManagerResult {
  mode: RetrievalMode;
  query: string;
  candidates: Product[];
  selectedProducts: Product[];
  excludedProductIds: string[];
  evidence: string[];
  confidence: number;
}

export interface RecommendationAgentResult {
  shouldShowProducts: boolean;
  products: Product[];
  presentationIntent: 'recommend' | 'compare' | 'detail' | 'cart_target' | 'none';
  displayReason: string;
  mustMentionProductIds: string[];
  mustNotMentionProductIds: string[];
  evidence: string[];
  status: 'approved' | 'needs_revision' | 'blocked';
  complaints: string[];
  decisionSource?: 'llm' | 'fallback';
}

export interface AgentHistoryEntry {
  timestamp: string;
  agent: AgentTraceAgent;
  status: AgentPipelineStatus;
  inputSummary: string;
  outputSummary: string;
  complaints: string[];
  source: 'llm' | 'fallback' | 'tool';
}

export interface SalesEvaluationResult {
  pass: boolean;
  complaints: string[];
  revisedInstruction?: string;
  source: 'llm' | 'fallback';
}

export interface AgentHistoryContext {
  agent: AgentTraceAgent;
  entries: AgentHistoryEntry[];
  summary: string;
}

export interface UserAnalysis {
  decisionSource?: 'llm' | 'fallback';
  intent: 'recommend' | 'compare' | 'product_detail' | 'policy' | 'cart_action' | 'cart_status' | 'confirm_pending' | 'cancel_pending' | 'smalltalk';
  cartOperation?: CartOperationKind;
  retrievalMode: RetrievalMode;
  shouldShowProducts: boolean;
  quantity?: {
    delta?: number;
    targetQuantity?: number;
    mentionedQuantity?: number;
    implicitOne: boolean;
  };
  references: {
    productName?: string;
    ordinal?: number;
    demonstrative?: boolean;
    useLastRecommendation?: boolean;
    useCurrentCartItem?: boolean;
    newProduct?: boolean;
    previousProduct?: boolean;
    anotherOption?: boolean;
    allLastRecommendations?: boolean;
    resolvedProductIds?: string[];
  };
  constraints: {
    budgetMax?: number;
    budgetMin?: number;
    category?: string;
    roomSize?: string;
    brand?: string;
  };
  confidence: number;
  needsClarification?: string;
}

export interface CartToolOperation {
  type: CartOperationKind;
  tool: CartToolName;
  product?: Product;
  productId?: string;
  quantity?: number;
  delta?: number;
}

export interface CartToolResult {
  tool: CartToolName;
  status: 'completed' | 'error' | 'skipped' | 'pending_confirmation';
  productIds: string[];
  beforeQuantity?: number;
  afterQuantity?: number;
  cartVersionBefore?: number;
  cartVersionAfter?: number;
  result?: string;
  error?: string;
}

export interface CartManagerResult {
  cart: Cart;
  actionResults: string[];
  traceActions: Array<{ type: string; productIds: string[]; status: 'completed' | 'error' | 'skipped'; result?: string; error?: string }>;
  toolResults: CartToolResult[];
  pendingPlan?: PendingCartPlan;
  clearedPendingPlan?: boolean;
  clarification?: string;
}

export interface AgentTurnContext {
  message: string;
  userId?: string;
  cartId: string;
  cart: Cart;
  memory: {
    recentTurns: Array<{ role: string; content: string }>;
    preferences: Array<{ key: string; value: unknown }>;
    recentRecommendationIds: string[];
    rollingSummary?: string;
    pendingCartPlan?: PendingCartPlan;
  };
  catalogCandidates: Product[];
  selectedProducts: Product[];
  allProducts: Product[];
  knowledge: KnowledgeDocument[];
}
