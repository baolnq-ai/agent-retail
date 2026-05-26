import type { PipelineExecutionPlan, PipelineExecutionStep, PipelineRuntimeRef, PipelineRuntimeStatus, PipelineTracePlaybackEvent } from './pipeline-runtime.models.js';
import { DEFAULT_PIPELINE_CONTEXT_BUDGET, isCompactRuntimeRef } from './pipeline-runtime.models.js';

export type PipelineToolSideEffect = 'none' | 'write';
export type PipelineToolRetryPolicy = 'none' | 'read_retry' | 'idempotent_retry';

export interface PipelineServerToolDefinition {
  name: string;
  version?: string;
  ownerAgent: string;
  sideEffect: PipelineToolSideEffect;
  requiresAuth: boolean;
  requiresIdempotencyKey: boolean;
  timeoutMs: number;
  retryPolicy: PipelineToolRetryPolicy;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
  redactionPolicy?: 'none' | 'summary_only' | 'redact_sensitive';
  traceSummary?: string;
}

export interface PipelineExecutorRequest {
  requestId: string;
  userId?: string;
  plan: PipelineExecutionPlan;
  contextBudget?: Partial<typeof DEFAULT_PIPELINE_CONTEXT_BUDGET>;
}

export interface PipelineStepExecutionResult {
  stepId: string;
  status: PipelineRuntimeStatus;
  inputRefs: string[];
  outputRefs: string[];
  issueCodes: string[];
  startedAt: string;
  completedAt?: string;
}

export interface PipelineExecutorResult {
  requestId: string;
  planId: string;
  taskId: string;
  status: PipelineRuntimeStatus;
  stepResults: PipelineStepExecutionResult[];
  playbackEvents: PipelineTracePlaybackEvent[];
  outputRefs: string[];
  issueCodes: string[];
}

export interface PipelineExecutorValidationResult {
  ok: boolean;
  issueCodes: string[];
}

export function validateExecutorRequestBoundary(
  request: PipelineExecutorRequest,
  tools: PipelineServerToolDefinition[],
): PipelineExecutorValidationResult {
  const issueCodes: string[] = [];
  const budget = { ...DEFAULT_PIPELINE_CONTEXT_BUDGET, ...request.contextBudget };
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  if (budget.maxRawPayloadRefs !== 0) issueCodes.push('raw_payload_refs_not_allowed');
  if (request.plan.goal.trim().length === 0) issueCodes.push('missing_goal');

  for (const ref of request.plan.refs) {
    if (!isCompactRuntimeRef(ref)) issueCodes.push(`non_compact_ref:${ref.refId}`);
  }

  const knownStepIds = new Set(request.plan.steps.map((step) => step.id));
  for (const step of request.plan.steps) {
    validateStepBoundary(step, toolMap, knownStepIds, budget.maxAgentContextTokens, issueCodes);
  }

  return { ok: issueCodes.length === 0, issueCodes };
}

export function createExecutorPlaybackEvents(plan: PipelineExecutionPlan): PipelineTracePlaybackEvent[] {
  const stepAgentById = new Map(plan.steps.map((step) => [step.id, step.agent]));
  return plan.steps.map((step, index) => ({
    id: `exec_${plan.planId}_${step.id}`,
    from: stepAgentById.get(step.dependsOn[0] ?? '') ?? 'pipeline-executor',
    to: step.agent,
    order: index + 1,
    direction: 'call',
    status: step.dependsOn.length ? 'running' : 'pending',
    label: step.toolName ?? step.action,
    payloadRef: step.inputRefs[0],
  }));
}

function validateStepBoundary(
  step: PipelineExecutionStep,
  toolMap: Map<string, PipelineServerToolDefinition>,
  knownStepIds: Set<string>,
  maxAgentContextTokens: number,
  issueCodes: string[],
): void {
  if (step.contextBudgetTokens > maxAgentContextTokens) issueCodes.push(`context_budget_exceeded:${step.id}`);
  if (step.dependsOn.includes(step.id)) issueCodes.push(`self_dependency:${step.id}`);
  for (const dependency of step.dependsOn) {
    if (!knownStepIds.has(dependency)) issueCodes.push(`unknown_dependency:${step.id}:${dependency}`);
  }

  if (!step.toolName) return;

  const tool = toolMap.get(step.toolName);
  if (!tool) {
    issueCodes.push(`unknown_tool:${step.id}:${step.toolName}`);
    return;
  }

  if (tool.sideEffect === 'write' && tool.requiresIdempotencyKey && !step.idempotencyKey) {
    issueCodes.push(`missing_idempotency_key:${step.id}:${step.toolName}`);
  }

  if (tool.sideEffect === 'write' && tool.retryPolicy === 'read_retry') {
    issueCodes.push(`unsafe_write_retry:${step.id}:${step.toolName}`);
  }
}

export function refsById(refs: PipelineRuntimeRef[]): Map<string, PipelineRuntimeRef> {
  return new Map(refs.map((ref) => [ref.refId, ref]));
}
