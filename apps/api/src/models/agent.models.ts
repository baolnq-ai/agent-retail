import type { Product, KnowledgeDocument } from './catalog.models.js';
import type { Cart } from './commerce.models.js';
import type { AgentPipelineEvent, CartToolResult, PendingCartPlan } from './agent-execution.models.js';
import type { AgentTaskBlackboardSnapshot, PipelineTracePlaybackEvent } from './pipeline-runtime.models.js';

export interface AgentChatRequest {
  message: string;
  cartId?: string;
  user?: { id: string; name: string };
}

export type AgentMessageBlock =
  | { type: 'text'; version: 1; content: string }
  | { type: 'product_list'; version: 1; items: Product[] }
  | { type: 'cart_summary'; version: 1; cart: Cart }
  | { type: 'policy_answer'; version: 1; items: KnowledgeDocument[] }
  | { type: 'quick_replies'; version: 1; items: string[] };

export type AgentTraceAgent =
  | 'lead-agent'
  | 'storage-memory-agent'
  | 'history-agent'
  | 'search-agent'
  | 'recommendation-agent'
  | 'cart-agent'
  | 'rag-agent'
  | 'security-agent'
  | 'customer-support-agent'
  | 'sales-agent'
  | 'memory-agent'
  | 'user-analysis-agent'
  | 'product-manager-agent'
  | 'retrieval-agent'
  | 'cart-manager-agent'
  | 'sales-evaluator-agent';
export type AgentTraceStepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'error' | 'blocked';
export type AgentTraceNodeKind = 'agent' | 'db' | 'vector_db' | 'tool' | 'text' | 'file' | 'service' | 'llm';

export interface AgentTraceNode {
  id: string;
  label: string;
  kind: AgentTraceNodeKind;
  status: AgentTraceStepStatus;
  detail?: string;
  metric?: string;
  agentName?: AgentTraceAgent;
  order?: number;
  iconKey?: string;
  shortCode?: string;
}

export interface AgentTraceGraphEdge {
  from: string;
  to: string;
  status?: AgentTraceStepStatus;
  order?: number;
  label?: string;
  direction?: 'call' | 'return' | 'data' | 'guard' | 'write';
}

export interface AgentTraceStep {
  agent: AgentTraceAgent;
  status: AgentTraceStepStatus;
  summary: string;
}

export interface AgentTraceEvent {
  timestamp: string;
  agent: AgentTraceAgent;
  type: 'started' | 'completed' | 'skipped' | 'error' | 'tool_call' | 'tool_result';
  summary: string;
}

export interface AgentTrace {
  traceId: string;
  messageId: string;
  timestamp: string;
  intent: string;
  agents: AgentTraceAgent[];
  edges: Array<{ from: AgentTraceAgent; to: AgentTraceAgent; status?: AgentTraceStepStatus; order?: number }>;
  nodes?: AgentTraceNode[];
  graphEdges?: AgentTraceGraphEdge[];
  playbackEvents?: PipelineTracePlaybackEvent[];
  steps: AgentTraceStep[];
  events: AgentTraceEvent[];
  memory: {
    recentTurnCount: number;
    rollingSummaryLength: number;
    recentRecommendationIds: string[];
    preferenceKeys: string[];
  };
  retrieval: {
    lexicalCandidateIds: string[];
    selectedProductIds: string[];
    contextDocumentCount: number;
    rerankTopScores: number[];
    fallbackRanking?: 'keyword' | 'rag_rerank';
  };
  cart: {
    actionType: string;
    resolvedProductIds: string[];
    beforeItemCount: number;
    afterItemCount: number;
    result?: string;
    actions: Array<{ type: string; productIds: string[]; status: 'completed' | 'error' | 'skipped'; result?: string; error?: string }>;
  };
  llm: {
    model: string;
    contextDocumentCount: number;
    promptSections: string[];
  };
  pipeline?: AgentPipelineEvent[];
  blackboard?: AgentTaskBlackboardSnapshot;
  toolResults?: CartToolResult[];
  pendingPlan?: PendingCartPlan;
  errors: Array<{ source: string; message: string }>;
}

export interface AgentChatResponse {
  messageId: string;
  model: string;
  blocks: AgentMessageBlock[];
  diagnostics: {
    embeddingDimensions: number;
    rerankTopScore: number;
    contextDocuments: number;
  };
  trace: AgentTrace;
}
