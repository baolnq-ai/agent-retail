import { randomUUID } from 'node:crypto';

export const correlationIdHeader = 'x-correlation-id';

export function resolveCorrelationId(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (firstValue) return firstValue.trim();
  }

  return randomUUID();
}
