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

export const DEFAULT_PIPELINE_CONTEXT_BUDGET: PipelineContextBudget = {
  maxLeadContextTokens: 4096,
  maxAgentContextTokens: 3072,
  maxRawPayloadRefs: 0,
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
