import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type { CartAgentResult } from '../../models/cart-agent.models.js';

export type CartAgentMemoryTier = 'near' | 'mid' | 'far';
export type PendingCartActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

export interface CartAgentInteractionDraft {
  userId: string;
  cartId?: string;
  requestId: string;
  leadGoal: string;
  result: CartAgentResult;
}

export interface CartAgentMemoryDraft {
  userId: string;
  cartId?: string;
  tier: CartAgentMemoryTier;
  key: string;
  value: unknown;
  summary?: string;
  tokenEstimate?: number;
  eventCount?: number;
  lastEventAt?: Date;
  expiresAt?: Date;
}

export interface PendingCartActionDraft {
  userId: string;
  cartId: string;
  requestId: string;
  operations: unknown;
  reason: string;
  confirmationText: string;
  expiresAt: Date;
}

export interface PendingCartActionRecord {
  id: string;
  userId: string;
  cartId: string;
  requestId: string;
  status: string;
  operations: unknown;
  reason: string;
  confirmationText: string;
  expiresAt: Date;
}

export interface CartAgentStateClient {
  cartAgentInteraction: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findMany(args: { where: Record<string, unknown>; orderBy: { createdAt: 'desc' }; take: number }): Promise<Array<Record<string, unknown>>>;
  };
  cartAgentMemory: {
    upsert(args: {
      where: { userId_tier_key: { userId: string; tier: string; key: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }): Promise<unknown>;
    findMany(args: { where: Record<string, unknown>; orderBy: { updatedAt: 'desc' }; take: number }): Promise<unknown[]>;
  };
  pendingCartAction: {
    create(args: { data: Record<string, unknown> }): Promise<PendingCartActionRecord>;
    findFirst(args: { where: Record<string, unknown>; orderBy: { createdAt: 'desc' } }): Promise<PendingCartActionRecord | null>;
    updateMany(args: { where: Record<string, unknown>; data: { status: PendingCartActionStatus } }): Promise<{ count: number }>;
  };
  cartEvent: {
    findMany(args: { where: Record<string, unknown>; orderBy: { createdAt: 'desc' }; take: number }): Promise<Array<Record<string, unknown>>>;
  };
}

@Injectable()
export class CartAgentStateService {
  constructor(private readonly prisma: PrismaService) {}

  async writeInteraction(draft: CartAgentInteractionDraft): Promise<void> {
    await persistCartAgentInteraction(this.prisma.client as unknown as CartAgentStateClient, draft);
  }

  async upsertMemory(draft: CartAgentMemoryDraft): Promise<void> {
    await upsertCartAgentMemory(this.prisma.client as unknown as CartAgentStateClient, draft);
  }

  async createPendingAction(draft: PendingCartActionDraft): Promise<PendingCartActionRecord> {
    return createPendingCartAction(this.prisma.client as unknown as CartAgentStateClient, draft);
  }

  async getActivePendingAction(userId: string, cartId?: string, now = new Date()): Promise<PendingCartActionRecord | null> {
    return getActivePendingCartAction(this.prisma.client as unknown as CartAgentStateClient, userId, cartId, now);
  }

  async resolvePendingAction(id: string, status: Exclude<PendingCartActionStatus, 'pending'>): Promise<boolean> {
    return resolvePendingCartAction(this.prisma.client as unknown as CartAgentStateClient, id, status);
  }

  async summarizeMemory(userId: string, cartId?: string): Promise<CartAgentMemorySummaryResult> {
    return summarizeCartAgentMemory(this.prisma.client as unknown as CartAgentStateClient, { userId, cartId });
  }

  async getMemoryContext(userId: string, cartId?: string): Promise<CartAgentMemoryContext> {
    return getCartAgentMemoryContext(this.prisma.client as unknown as CartAgentStateClient, userId, cartId);
  }
}

export interface CartAgentMemorySummaryResult {
  midSummary: string;
  farSummary: string;
  interactionCount: number;
  eventCount: number;
}

export interface CartAgentMemoryContext {
  near: string[];
  midSummary?: string;
  farSignals: string[];
}

export async function persistCartAgentInteraction(client: CartAgentStateClient, draft: CartAgentInteractionDraft): Promise<void> {
  await client.cartAgentInteraction.create({
    data: {
      userId: draft.userId,
      cartId: draft.cartId,
      requestId: draft.requestId,
      leadGoal: draft.leadGoal.slice(0, 1000),
      normalizedGoal: normalizeGoal(draft.leadGoal),
      privatePlan: draft.result.privatePlan as unknown as Prisma.InputJsonValue,
      toolResultsSummary: summarizeOperations(draft.result) as Prisma.InputJsonValue,
      facts: draft.result.facts as unknown as Prisma.InputJsonValue,
      issues: draft.result.issues as unknown as Prisma.InputJsonValue,
      agentMessage: draft.result.handoff.agentMessage.slice(0, 2000),
      leadInstruction: draft.result.handoff.leadInstruction.slice(0, 1000),
      status: draft.result.status,
    },
  });
}

export async function upsertCartAgentMemory(client: CartAgentStateClient, draft: CartAgentMemoryDraft): Promise<void> {
  const update = {
    cartId: draft.cartId,
    value: draft.value as Prisma.InputJsonValue,
    summary: draft.summary,
    tokenEstimate: draft.tokenEstimate ?? estimateTokens(draft.summary ?? JSON.stringify(draft.value)),
    eventCount: draft.eventCount ?? 1,
    lastEventAt: draft.lastEventAt ?? new Date(),
    expiresAt: draft.expiresAt,
  };
  await client.cartAgentMemory.upsert({
    where: { userId_tier_key: { userId: draft.userId, tier: draft.tier, key: draft.key } },
    update,
    create: {
      userId: draft.userId,
      tier: draft.tier,
      key: draft.key,
      ...update,
    },
  });
}

export async function createPendingCartAction(client: CartAgentStateClient, draft: PendingCartActionDraft): Promise<PendingCartActionRecord> {
  return client.pendingCartAction.create({
    data: {
      userId: draft.userId,
      cartId: draft.cartId,
      requestId: draft.requestId,
      status: 'pending',
      operations: draft.operations as Prisma.InputJsonValue,
      reason: draft.reason.slice(0, 500),
      confirmationText: draft.confirmationText.slice(0, 1000),
      expiresAt: draft.expiresAt,
    },
  });
}

export async function getActivePendingCartAction(
  client: CartAgentStateClient,
  userId: string,
  cartId: string | undefined,
  now = new Date(),
): Promise<PendingCartActionRecord | null> {
  return client.pendingCartAction.findFirst({
    where: {
      userId,
      ...(cartId ? { cartId } : {}),
      status: 'pending',
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function resolvePendingCartAction(
  client: CartAgentStateClient,
  id: string,
  status: Exclude<PendingCartActionStatus, 'pending'>,
): Promise<boolean> {
  const updated = await client.pendingCartAction.updateMany({ where: { id, status: 'pending' }, data: { status } });
  return updated.count === 1;
}

export async function summarizeCartAgentMemory(
  client: CartAgentStateClient,
  params: { userId: string; cartId?: string; take?: number; now?: Date },
): Promise<CartAgentMemorySummaryResult> {
  const take = params.take ?? 20;
  const [interactions, events] = await Promise.all([
    client.cartAgentInteraction.findMany({
      where: { userId: params.userId, ...(params.cartId ? { cartId: params.cartId } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    client.cartEvent.findMany({
      where: { userId: params.userId, ...(params.cartId ? { cartId: params.cartId } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);
  const statusCounts = countBy(interactions.map((interaction) => String(interaction.status ?? 'unknown')));
  const eventTypeCounts = countBy(events.map((event) => String(event.type ?? 'unknown')));
  const midSummary = `Cart memory: ${interactions.length} interactions, ${events.length} cart events, recent statuses ${formatCounts(statusCounts)}.`;
  const farSummary = `Cart behavior: event pattern ${formatCounts(eventTypeCounts) || 'none'}, completion ${statusCounts.completed ?? 0}/${interactions.length}.`;
  const now = params.now ?? new Date();

  await upsertCartAgentMemory(client, {
    userId: params.userId,
    cartId: params.cartId,
    tier: 'mid',
    key: `cart:${params.cartId ?? 'all'}:mid-summary`,
    value: { statusCounts, eventTypeCounts, interactionCount: interactions.length, eventCount: events.length },
    summary: midSummary,
    eventCount: interactions.length + events.length,
    lastEventAt: now,
  });
  await upsertCartAgentMemory(client, {
    userId: params.userId,
    tier: 'far',
    key: `user:${params.userId}:cart-behavior`,
    value: { eventTypeCounts, completedInteractionCount: statusCounts.completed ?? 0, interactionCount: interactions.length },
    summary: farSummary,
    eventCount: interactions.length + events.length,
    lastEventAt: now,
  });

  return { midSummary, farSummary, interactionCount: interactions.length, eventCount: events.length };
}

export async function getCartAgentMemoryContext(client: CartAgentStateClient, userId: string, cartId?: string): Promise<CartAgentMemoryContext> {
  const rows = await client.cartAgentMemory.findMany({
    where: {
      userId,
      ...(cartId ? { OR: [{ cartId }, { cartId: null }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  return {
    near: rows.filter((row) => getRowString(row, 'tier') === 'near').map((row) => getRowString(row, 'summary')).filter(Boolean).slice(0, 5),
    midSummary: getRowString(rows.find((row) => getRowString(row, 'tier') === 'mid' && getRowString(row, 'summary')), 'summary') || undefined,
    farSignals: rows.filter((row) => getRowString(row, 'tier') === 'far').map((row) => getRowString(row, 'summary')).filter(Boolean).slice(0, 5),
  };
}

function summarizeOperations(result: CartAgentResult): Array<Record<string, unknown>> {
  return result.operations.map((operation) => ({
    tool: operation.tool,
    status: operation.status,
    productIds: operation.productIds,
    beforeQuantity: operation.beforeQuantity,
    afterQuantity: operation.afterQuantity,
    cartVersionBefore: operation.cartVersionBefore,
    cartVersionAfter: operation.cartVersionAfter,
  }));
}

function normalizeGoal(goal: string): string {
  return goal.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}:${count}`)
    .join(', ');
}

function getRowString(row: unknown, key: string): string {
  return typeof row === 'object' && row !== null && key in row ? String((row as Record<string, unknown>)[key] ?? '') : '';
}
