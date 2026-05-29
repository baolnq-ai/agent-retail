import type { PipelineServerToolDefinition, PipelineToolRetryPolicy, PipelineToolSideEffect } from '../models/pipeline-executor.models.js';

export type PipelineToolOwner =
  | 'storage-memory-agent'
  | 'history-agent'
  | 'search-agent'
  | 'recommendation-agent'
  | 'rag-agent'
  | 'cart-agent'
  | 'security-agent'
  | 'customer-support-agent'
  | 'pipeline-executor';

export interface PipelineToolRegistryDefinition extends PipelineServerToolDefinition {
  ownerAgent: PipelineToolOwner;
  version: string;
  inputSchemaRef: string;
  outputSchemaRef: string;
  redactionPolicy: 'none' | 'summary_only' | 'redact_sensitive';
  traceSummary: string;
}

export const PIPELINE_SERVER_TOOLS: PipelineToolRegistryDefinition[] = [
  tool('memory.get_context', 'storage-memory-agent', 'none', true, false, 3000, 'read_retry', 'bounded memory context'),
  tool('memory.write_turn', 'storage-memory-agent', 'write', true, true, 5000, 'idempotent_retry', 'memory turn write'),
  tool('memory.update_preferences', 'storage-memory-agent', 'write', true, true, 5000, 'idempotent_retry', 'preference update'),
  tool('history.resolve_reference', 'history-agent', 'none', true, false, 3000, 'read_retry', 'history reference resolution'),
  tool('catalog.resolve_product', 'search-agent', 'none', false, false, 3000, 'read_retry', 'catalog product resolution'),
  tool('catalog.search_hard', 'search-agent', 'none', false, false, 3000, 'read_retry', 'hard catalog search'),
  tool('recommendation.score', 'recommendation-agent', 'none', true, false, 5000, 'read_retry', 'recommendation scoring'),
  tool('rag.search_policy', 'rag-agent', 'none', false, false, 5000, 'read_retry', 'rag policy search'),
  tool('rag.review_path', 'rag-agent', 'none', false, false, 8000, 'read_retry', 'rag path review'),
  tool('cart.get', 'cart-agent', 'none', true, false, 3000, 'read_retry', 'cart snapshot'),
  tool('cart.add_item', 'cart-agent', 'write', true, true, 5000, 'idempotent_retry', 'cart add item'),
  tool('cart.update_item', 'cart-agent', 'write', true, true, 5000, 'idempotent_retry', 'cart update item'),
  tool('cart.remove_item', 'cart-agent', 'write', true, true, 5000, 'idempotent_retry', 'cart remove item'),
  tool('security.review_input', 'security-agent', 'none', false, false, 3000, 'read_retry', 'input safety review'),
  tool('security.review_plan', 'security-agent', 'none', false, false, 3000, 'read_retry', 'plan safety review'),
  tool('security.review_action', 'security-agent', 'none', true, false, 3000, 'read_retry', 'action safety review'),
  tool('security.review_output', 'security-agent', 'none', false, false, 3000, 'read_retry', 'output safety review'),
  tool('support.handle_case', 'customer-support-agent', 'none', true, false, 5000, 'read_retry', 'support case triage'),
  tool('support.create_case', 'customer-support-agent', 'write', true, true, 5000, 'idempotent_retry', 'support case creation'),
  tool('trace.emit_event', 'pipeline-executor', 'write', false, false, 2000, 'none', 'redacted trace event'),
];

export function getPipelineTool(name: string): PipelineToolRegistryDefinition | undefined {
  return PIPELINE_SERVER_TOOLS.find((toolDefinition) => toolDefinition.name === name);
}

export function assertPipelineToolPolicy(tools: PipelineToolRegistryDefinition[] = PIPELINE_SERVER_TOOLS): string[] {
  const issueCodes: string[] = [];
  const names = new Set<string>();

  for (const definition of tools) {
    if (names.has(definition.name)) issueCodes.push(`duplicate_tool:${definition.name}`);
    names.add(definition.name);
    if (definition.timeoutMs < 500 || definition.timeoutMs > 10000) issueCodes.push(`invalid_timeout:${definition.name}`);
    if (definition.sideEffect === 'write' && definition.retryPolicy === 'read_retry') issueCodes.push(`unsafe_write_retry:${definition.name}`);
    if (isUserDataWrite(definition) && !definition.requiresIdempotencyKey) issueCodes.push(`missing_idempotency_policy:${definition.name}`);
    if (isUserDataWrite(definition) && !definition.requiresAuth) issueCodes.push(`missing_auth_policy:${definition.name}`);
  }

  return issueCodes;
}

function isUserDataWrite(definition: PipelineToolRegistryDefinition): boolean {
  return definition.sideEffect === 'write' && !definition.name.startsWith('trace.');
}

function tool(
  name: string,
  ownerAgent: PipelineToolOwner,
  sideEffect: PipelineToolSideEffect,
  requiresAuth: boolean,
  requiresIdempotencyKey: boolean,
  timeoutMs: number,
  retryPolicy: PipelineToolRetryPolicy,
  traceSummary: string,
): PipelineToolRegistryDefinition {
  const redactionPolicy = sideEffect === 'write' || requiresAuth ? 'redact_sensitive' : 'summary_only';
  return {
    name,
    version: 'v1',
    ownerAgent,
    sideEffect,
    requiresAuth,
    requiresIdempotencyKey,
    timeoutMs,
    retryPolicy,
    inputSchemaRef: `${name}.input.v1`,
    outputSchemaRef: `${name}.output.v1`,
    redactionPolicy,
    traceSummary,
  };
}
