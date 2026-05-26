import type { AgentTraceAgent, AgentTraceNodeKind } from './agent.models.js';

export type PipelineV2Agent =
  | 'lead-agent'
  | 'storage-memory-agent'
  | 'history-agent'
  | 'search-agent'
  | 'recommendation-agent'
  | 'cart-agent'
  | 'rag-agent'
  | 'security-agent'
  | 'customer-support-agent'
  | 'sales-agent';

export type PipelineV2Status = 'completed' | 'needs_clarification' | 'blocked' | 'error';
export type PipelineV2HistoryWindow = 'recent' | 'mid' | 'long' | 'summary';
export type PipelineV2DataSource = 'postgres' | 'qdrant' | 'llm' | 'in_memory' | 'http';

export interface PipelineV2AgentRequest {
  traceId: string;
  userId?: string;
  cartId?: string;
  from: PipelineV2Agent;
  to: PipelineV2Agent;
  originalMessage: string;
  instruction: string;
  context: Array<{ source: string; content: string; confidence?: number }>;
  expectedOutput: string[];
}

export interface PipelineV2AgentResponse {
  traceId: string;
  agent: PipelineV2Agent;
  status: PipelineV2Status;
  summary: string;
  findings: string[];
  structuredData: Record<string, unknown>;
  confidence: number;
  errors: Array<{ code: string; message: string; recoverable: boolean }>;
  suggestedNextAgents: PipelineV2Agent[];
}

export interface PipelineV2HistoryPolicy {
  enabled: boolean;
  windows: PipelineV2HistoryWindow[];
  maxEntries: number;
  summarizeAfterEntries: number;
}

export interface PipelineV2TracePolicy {
  iconKey: string;
  shortCode: string;
  nodeKind: AgentTraceNodeKind;
}

export interface PipelineV2AgentDefinition {
  id: PipelineV2Agent;
  legacyAgent?: AgentTraceAgent;
  displayName: string;
  role: string;
  owns: string[];
  canReceiveFrom: PipelineV2Agent[];
  canDelegateTo: PipelineV2Agent[];
  reads: PipelineV2DataSource[];
  writes: PipelineV2DataSource[];
  history: PipelineV2HistoryPolicy;
  responseContract: string[];
  trace: PipelineV2TracePolicy;
}
