import type { AgentTraceGraphEdge, AgentTraceStepStatus } from './agent.models.js';
import type { PipelineV2Agent } from './agent-pipeline-v2.models.js';

export type PipelineRuntimeStatus = 'planned' | 'running' | 'completed' | 'blocked' | 'failed';
export type PipelineRefKind = 'product' | 'cart' | 'cart_item' | 'cart_event' | 'rag_doc' | 'table' | 'agent_result' | 'metadata' | 'support_case';

export interface PipelineRuntimeRef {
  refId: string;
  kind: PipelineRefKind;
  label: string;
  ids: string[];
  confidence: number;
  metadataHandle?: string;
}

export interface PipelineExecutionStep {
  id: string;
  agent: PipelineV2Agent;
  action: string;
  toolName?: string;
  executionMode?: 'deterministic_tool' | 'structured_llm' | 'compose';
  inputRefs: string[];
  outputRefs: string[];
  dependsOn: string[];
  successCriteria: string[];
  contextBudgetTokens: number;
  idempotencyKey?: string;
}

export interface PipelineExecutionPlan {
  planId: string;
  taskId: string;
  leadProfileId: string;
  status: PipelineRuntimeStatus;
  goal: string;
  refs: PipelineRuntimeRef[];
  steps: PipelineExecutionStep[];
  finalConstraints: string[];
}

export interface PipelineTracePlaybackEvent {
  id: string;
  from: string;
  to: string;
  order: number;
  direction: NonNullable<AgentTraceGraphEdge['direction']>;
  status: AgentTraceStepStatus;
  label?: string;
  durationMs?: number;
  payloadRef?: string;
}

export interface PipelineContextBudget {
  maxLeadContextTokens: number;
  maxAgentContextTokens: number;
  maxRawPayloadRefs: number;
}

export interface AgentTaskBudget {
  maxLoops: number;
  maxToolCalls: number;
  maxEvaluatorRetries: number;
  maxWallTimeMs: number;
}

export interface AgentTaskBlackboardEvent {
  id?: string;
  agent: PipelineV2Agent | 'memory-agent' | 'user-analysis-agent' | 'product-manager-agent' | 'cart-manager-agent' | 'sales-evaluator-agent';
  stage: string;
  status: AgentTraceStepStatus;
  summary: string;
  inputRefs?: string[];
  outputRefs?: string[];
  evidence?: Array<{ kind: PipelineRefKind | 'text'; label: string; ids?: string[]; confidence?: number }>;
  toolCall?: { name: string; argsSummary: string; resultSummary?: string };
  decision?: Record<string, string | number | boolean | string[]>;
  durationMs?: number;
}

export interface AgentTaskBlackboardSnapshot {
  taskId: string;
  requestId: string;
  status: PipelineRuntimeStatus;
  goal: string;
  budget: AgentTaskBudget;
  hypotheses: Array<{ label: string; confidence: number; source: string }>;
  evidence: AgentTaskBlackboardEvent['evidence'];
  decisions: Array<Record<string, string | number | boolean | string[]>>;
  evaluatorVerdict?: Record<string, unknown>;
  finalContract?: Record<string, unknown>;
  eventCount: number;
}

export const DEFAULT_PIPELINE_CONTEXT_BUDGET: PipelineContextBudget = {
  maxLeadContextTokens: 4096,
  maxAgentContextTokens: 3072,
  maxRawPayloadRefs: 0,
};

export const DEFAULT_AGENT_TASK_BUDGET: AgentTaskBudget = {
  maxLoops: 6,
  maxToolCalls: 14,
  maxEvaluatorRetries: 2,
  maxWallTimeMs: 120000,
};

export function sortPlaybackEvents(events: PipelineTracePlaybackEvent[]): PipelineTracePlaybackEvent[] {
  return [...events].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export function isCompactRuntimeRef(ref: PipelineRuntimeRef): boolean {
  return ref.refId.length > 0
    && ref.label.length <= 120
    && ref.ids.every((id) => id.length <= 120)
    && ref.confidence >= 0
    && ref.confidence <= 1
    && !Object.prototype.hasOwnProperty.call(ref, 'payload');
}
