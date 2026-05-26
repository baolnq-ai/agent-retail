import type { Product, KnowledgeDocument } from './catalog.models.js';
import type { Cart } from './commerce.models.js';
import type { AgentTraceAgent, AgentTraceStepStatus } from './agent.models.js';

export type AgentPipelineStage = 'analyze' | 'lookup' | 'investigate' | 'plan' | 'execute' | 'verify' | 'handoff' | 'evaluate' | 'revise';
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

export type StorageMemoryTier = 'near' | 'mid' | 'far';
export type StorageMemoryNeed = 'none' | 'near' | 'near_mid' | 'near_mid_far';
export type StorageMemoryRole = 'user' | 'assistant' | 'agent' | 'system';

export interface StorageMemorySourceRef {
  table: string;
  id: string;
  agent?: AgentTraceAgent | string;
  type?: string;
}

export interface StorageMemoryContextItem {
  id: string;
  tier: StorageMemoryTier;
  key: string;
  summary: string;
  value?: unknown;
  sourceRefs: StorageMemorySourceRef[];
  confidence: number;
  tokenEstimate: number;
  updatedAt?: string;
}

export interface StorageMemoryPreferenceSignal {
  key: string;
  value: unknown;
  confidence: number;
  sourceRefs: StorageMemorySourceRef[];
  updatedAt?: string;
}

export interface StorageMemoryBehaviorSignal {
  type: string;
  weight: number;
  productId?: string;
  category?: string;
  brand?: string;
  sourceAgent?: string;
  metadata?: unknown;
  createdAt?: string;
}

export interface StorageMemoryAgentIndexSignal {
  sourceAgent: string;
  sourceTable: string;
  sourceId: string;
  summary: string;
  tags: string[];
  productIds: string[];
  cartId?: string;
  confidence: number;
  createdAt?: string;
}

export interface StorageMemoryContextResult {
  need: StorageMemoryNeed;
  brief: string;
  near: StorageMemoryContextItem[];
  midSummaries: StorageMemoryContextItem[];
  farProfile: StorageMemoryContextItem[];
  preferences: StorageMemoryPreferenceSignal[];
  behaviorSignals: StorageMemoryBehaviorSignal[];
  agentIndexes: StorageMemoryAgentIndexSignal[];
  evidence: string[];
  references: {
    lastProductIds: string[];
    lastRecommendationIds: string[];
    lastCartProductIds: string[];
  };
  tokenEstimate: number;
  truncated: boolean;
  confidence: number;
}

export interface StorageMemoryWriteResult {
  status: 'completed' | 'skipped';
  id?: string;
  summary: string;
  evidence: string[];
}

export type HistoryAmbiguityType = 'previous_recommendation' | 'previous_search' | 'cart_item' | 'ordinal' | 'pronoun' | 'general_context';
export type HistoryAgentStatus = 'resolved' | 'partial' | 'not_found' | 'ambiguous' | 'failed';
export type HistoryReferenceType = 'product' | 'cart_item' | 'recommendation_set' | 'search_result' | 'conversation_topic';

export interface HistoryAgentRequest {
  requestId: string;
  userId?: string;
  message: string;
  ambiguityHint?: {
    phrase?: string;
    type?: HistoryAmbiguityType;
  };
  contextBudget?: number;
  allowedSources?: Array<'memory' | 'cart_history' | 'search_history' | 'recommendation_history' | 'chat_turns'>;
}

export interface HistoryResolvedReference {
  refType: HistoryReferenceType;
  phrase: string;
  productId?: string;
  productTitle?: string;
  productIds?: string[];
  sourceAgent?: 'cart' | 'search' | 'recommendation' | 'memory' | 'lead';
  confidence: number;
  evidence: Array<{ source: string; sourceId?: string; summary: string; createdAt?: string }>;
}

export interface HistoryNextAgentHint {
  agent: 'search' | 'recommendation' | 'cart' | 'sales' | 'rag' | 'customer_support' | 'security' | 'lead';
  reason: string;
  inputHint: unknown;
}

export interface HistoryAgentResult {
  status: HistoryAgentStatus;
  ambiguity: {
    phrase?: string;
    type: HistoryAmbiguityType;
    confidence: number;
  };
  resolvedReferences: HistoryResolvedReference[];
  missingInfo: string[];
  nextAgentHints: HistoryNextAgentHint[];
  handoff: {
    agentMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
    mustMentionProductIds: string[];
    mustNotMentionProductIds: string[];
  };
}

export interface HistoryRailConsistencyResult {
  pass: boolean;
  complaints: string[];
  mustMentionProductIds: string[];
  unexpectedProductIds: string[];
}

export type SearchLane = 'exact' | 'filter' | 'lexical' | 'embedding';
export type SearchMatchType = 'exact' | 'strong_lexical' | 'filtered' | 'semantic_fallback' | 'none';

export interface SearchAgentRequest {
  requestId: string;
  userId?: string;
  query: string;
  filters?: {
    productId?: string;
    category?: string;
    brand?: string;
    budgetMin?: number;
    budgetMax?: number;
    attributes?: Record<string, string | number | boolean>;
    requireInStock?: boolean;
  };
  limit?: number;
  fallbackPolicy?: 'hard_only' | 'embedding_if_low_recall';
}

export interface SearchAgentCandidate {
  productId: string;
  score: number;
  confidence: number;
  matchedFields: string[];
  evidence: string[];
}

export interface SearchAgentResult {
  status: 'completed' | 'no_results' | 'needs_clarification' | 'failed';
  query: string;
  usedLanes: SearchLane[];
  matchType: SearchMatchType;
  candidates: SearchAgentCandidate[];
  issues: Array<{ code: string; message: string; recoverable: boolean }>;
  handoff: {
    agentMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
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

export interface AgentQualityGateResult {
  pass: boolean;
  outcome: 'pass' | 'revise' | 'refuse' | 'clarify';
  severity: 'info' | 'warn' | 'block';
  complaints: string[];
  revisedInstruction?: string;
  safeResponse?: string;
  source: 'llm' | 'fallback';
}

export interface SalesEvaluationResult extends AgentQualityGateResult {}

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
