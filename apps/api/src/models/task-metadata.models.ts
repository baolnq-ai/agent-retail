import type { PipelineRefKind } from './pipeline-runtime.models.js';

export type TaskMetadataKind = Extract<PipelineRefKind, 'product' | 'cart' | 'rag_doc' | 'agent_result' | 'support_case'> | 'table_rows';

export interface TaskMetadataEnvelope<TPayload = unknown> {
  taskId: string;
  userId?: string;
  handle: string;
  kind: TaskMetadataKind;
  compactLabel: string;
  ids: string[];
  payload: TPayload;
  tokenEstimate: number;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

export interface TaskMetadataPutRequest<TPayload = unknown> {
  taskId: string;
  userId?: string;
  kind: TaskMetadataKind;
  compactLabel: string;
  ids: string[];
  payload: TPayload;
  createdBy: string;
  ttlSeconds?: number;
}

export interface TaskMetadataGetRequest {
  taskId: string;
  userId?: string;
  handle: string;
}

export interface TaskMetadataPickRequest extends TaskMetadataGetRequest {
  fields: string[];
}

export function createTaskMetadataHandle(taskId: string, kind: TaskMetadataKind, ids: string[]): string {
  const suffix = ids.length ? ids.join('_') : 'payload';
  return `meta_${sanitizeHandlePart(taskId)}_${sanitizeHandlePart(kind)}_${sanitizeHandlePart(suffix)}`.slice(0, 180);
}

export function estimateMetadataTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

export function pickMetadataFields<TPayload extends Record<string, unknown>>(payload: TPayload, fields: string[]): Partial<TPayload> {
  const picked: Partial<TPayload> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) picked[field as keyof TPayload] = payload[field] as TPayload[keyof TPayload];
  }
  return picked;
}

function sanitizeHandlePart(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
}
