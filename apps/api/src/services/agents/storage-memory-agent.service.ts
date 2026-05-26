import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentTraceAgent } from '../../models/agent.models.js';
import type {
  StorageMemoryAgentIndexSignal,
  StorageMemoryBehaviorSignal,
  StorageMemoryContextItem,
  StorageMemoryContextResult,
  StorageMemoryNeed,
  StorageMemoryPreferenceSignal,
  StorageMemoryRole,
  StorageMemorySourceRef,
  StorageMemoryTier,
  StorageMemoryWriteResult,
} from '../../models/agent-execution.models.js';
import { PrismaService } from '../prisma.service.js';

const DEFAULT_TOKEN_BUDGET = 2400;
const MAX_VALUE_TEXT = 1200;

type StorageMemoryClient = {
  memoryTurn: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memoryEvent: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memoryItem: {
    upsert(args: Record<string, unknown>): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memorySummary: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memoryPreference: {
    upsert(args: Record<string, unknown>): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memoryBehaviorSignal: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
  memoryAgentIndex: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
    findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    deleteMany?(args: Record<string, unknown>): Promise<{ count: number }>;
  };
};

@Injectable()
export class StorageMemoryAgentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | { client: StorageMemoryClient }) {}

  async getContext(params: {
    userId?: string;
    message?: string;
    requestId?: string;
    need?: StorageMemoryNeed;
    tokenBudget?: number;
    sourceAgents?: string[];
  }): Promise<StorageMemoryContextResult> {
    if (!params.userId) return emptyContext('none');

    const client = this.client();
    const need = params.need ?? classifyNeed(params.message ?? '');
    if (need === 'none') return emptyContext('none');

    const now = new Date();
    const tokenBudget = Math.max(400, params.tokenBudget ?? DEFAULT_TOKEN_BUDGET);
    const includeMid = need === 'near_mid' || need === 'near_mid_far';
    const includeFar = need === 'near_mid_far';

    const [turns, events, nearItems, midItems, farItems, preferences, behaviorSignals, agentIndexes] = await Promise.all([
      client.memoryTurn.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      client.memoryEvent.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      client.memoryItem.findMany({
        where: { userId: params.userId, tier: 'near', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
      includeMid
        ? client.memoryItem.findMany({ where: { userId: params.userId, tier: 'mid' }, orderBy: { updatedAt: 'desc' }, take: 8 })
        : Promise.resolve([]),
      includeFar
        ? client.memoryItem.findMany({ where: { userId: params.userId, tier: 'far' }, orderBy: { updatedAt: 'desc' }, take: 8 })
        : Promise.resolve([]),
      includeFar
        ? client.memoryPreference.findMany({ where: { userId: params.userId }, orderBy: { updatedAt: 'desc' }, take: 10 })
        : Promise.resolve([]),
      includeFar
        ? client.memoryBehaviorSignal.findMany({ where: { userId: params.userId }, orderBy: { createdAt: 'desc' }, take: 12 })
        : Promise.resolve([]),
      client.memoryAgentIndex.findMany({
        where: {
          userId: params.userId,
          ...(params.sourceAgents?.length ? { sourceAgent: { in: params.sourceAgents } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);

    const near = [
      ...nearItems.map((item) => toContextItem(item, 'near')),
      ...turns.map((turn) => turnToContextItem(turn)),
      ...events.map((event) => eventToContextItem(event)),
    ];
    const midSummaries = midItems.map((item) => toContextItem(item, 'mid'));
    const farProfile = farItems.map((item) => toContextItem(item, 'far'));
    const preferenceSignals = preferences.map(toPreferenceSignal);
    const behavior = behaviorSignals.map(toBehaviorSignal);
    const indexes = agentIndexes.map(toAgentIndexSignal);

    const budgeted = enforceBudget({
      near,
      midSummaries,
      farProfile,
      preferences: preferenceSignals,
      behaviorSignals: behavior,
      agentIndexes: indexes,
      tokenBudget,
      preferFar: shouldPreferFar(params.message ?? ''),
    });
    const evidence = uniqueStrings([
      ...budgeted.near.flatMap((item) => item.sourceRefs.map(formatSourceRef)),
      ...budgeted.midSummaries.flatMap((item) => item.sourceRefs.map(formatSourceRef)),
      ...budgeted.farProfile.flatMap((item) => item.sourceRefs.map(formatSourceRef)),
      ...budgeted.preferences.flatMap((item) => item.sourceRefs.map(formatSourceRef)),
      ...budgeted.agentIndexes.map((item) => `${item.sourceTable}:${item.sourceId}`),
    ]).slice(0, 20);
    const references = collectReferences({ near: budgeted.near, preferences: budgeted.preferences, agentIndexes: budgeted.agentIndexes });
    const brief = buildBrief({
      need,
      near: budgeted.near,
      midSummaries: budgeted.midSummaries,
      farProfile: budgeted.farProfile,
      preferences: budgeted.preferences,
      agentIndexes: budgeted.agentIndexes,
      references,
    });

    return {
      need,
      brief,
      near: budgeted.near,
      midSummaries: budgeted.midSummaries,
      farProfile: budgeted.farProfile,
      preferences: budgeted.preferences,
      behaviorSignals: budgeted.behaviorSignals,
      agentIndexes: budgeted.agentIndexes,
      evidence,
      references,
      tokenEstimate: budgeted.tokenEstimate,
      truncated: budgeted.truncated,
      confidence: evidence.length > 0 ? 0.82 : 0.42,
    };
  }

  async writeTurn(params: {
    userId?: string;
    threadId?: string;
    requestId: string;
    role: StorageMemoryRole;
    content: string;
    metadata?: unknown;
  }): Promise<StorageMemoryWriteResult> {
    if (!params.userId) return skipped('No userId, memory turn skipped.');
    const safeContent = redactSensitive(params.content).slice(0, 6000);
    const row = await this.client().memoryTurn.create({
      data: {
        userId: params.userId,
        threadId: params.threadId,
        requestId: params.requestId,
        role: params.role,
        content: safeContent,
        metadata: redactJson(params.metadata) as Prisma.InputJsonValue | undefined,
      },
    });
    await this.upsertItem({
      userId: params.userId,
      tier: 'near',
      key: `request:${params.requestId}:turn:${params.role}`,
      value: { role: params.role, content: safeContent.slice(0, MAX_VALUE_TEXT) },
      summary: `${params.role}: ${safeContent.slice(0, 220)}`,
      sourceRefs: [{ table: 'MemoryTurn', id: row.id }],
      confidence: 0.86,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { status: 'completed', id: row.id, summary: 'Memory turn written.', evidence: [`MemoryTurn:${row.id}`] };
  }

  async writeEvent(params: {
    userId?: string;
    requestId?: string;
    sourceAgent?: AgentTraceAgent | string;
    type: string;
    subjectType?: string;
    subjectId?: string;
    payload: unknown;
    confidence?: number;
  }): Promise<StorageMemoryWriteResult> {
    if (!params.userId) return skipped('No userId, memory event skipped.');
    const row = await this.client().memoryEvent.create({
      data: {
        userId: params.userId,
        requestId: params.requestId,
        sourceAgent: params.sourceAgent,
        type: params.type,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        payload: redactJson(params.payload) as Prisma.InputJsonValue,
        confidence: clampConfidence(params.confidence),
      },
    });
    const productIds = extractProductIds(params.payload);
    await this.upsertItem({
      userId: params.userId,
      tier: 'near',
      key: `event:${row.id}`,
      value: { type: params.type, subjectId: params.subjectId, productIds },
      summary: `${params.sourceAgent ?? 'pipeline'} ${params.type}${productIds.length ? ` products=${productIds.join(',')}` : ''}`,
      sourceRefs: [{ table: 'MemoryEvent', id: row.id, agent: params.sourceAgent, type: params.type }],
      confidence: clampConfidence(params.confidence),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { status: 'completed', id: row.id, summary: 'Memory event written.', evidence: [`MemoryEvent:${row.id}`] };
  }

  async writeAgentResult(params: {
    userId?: string;
    sourceAgent: AgentTraceAgent | string;
    sourceTable: string;
    sourceId: string;
    summary: string;
    tags?: string[];
    productIds?: string[];
    cartId?: string;
    confidence?: number;
  }): Promise<StorageMemoryWriteResult> {
    if (!params.userId) return skipped('No userId, agent index skipped.');
    const row = await this.client().memoryAgentIndex.create({
      data: {
        userId: params.userId,
        sourceAgent: params.sourceAgent,
        sourceTable: params.sourceTable,
        sourceId: params.sourceId,
        summary: redactSensitive(params.summary).slice(0, 1000),
        tags: (params.tags ?? []) as Prisma.InputJsonValue,
        productIds: (params.productIds ?? []) as Prisma.InputJsonValue,
        cartId: params.cartId,
        confidence: clampConfidence(params.confidence),
      },
    });
    await this.upsertItem({
      userId: params.userId,
      tier: 'near',
      key: `agent:${params.sourceAgent}:${params.sourceId}`,
      value: { sourceAgent: params.sourceAgent, productIds: params.productIds ?? [], cartId: params.cartId },
      summary: `${params.sourceAgent}: ${redactSensitive(params.summary).slice(0, 240)}`,
      sourceRefs: [{ table: 'MemoryAgentIndex', id: row.id, agent: params.sourceAgent }],
      confidence: clampConfidence(params.confidence),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { status: 'completed', id: row.id, summary: 'Agent result indexed.', evidence: [`MemoryAgentIndex:${row.id}`] };
  }

  async updatePreference(params: {
    userId?: string;
    key: string;
    value: unknown;
    confidence?: number;
    sourceRefs: StorageMemorySourceRef[];
    decayPolicy?: unknown;
  }): Promise<StorageMemoryWriteResult> {
    if (!params.userId) return skipped('No userId, preference skipped.');
    if (params.sourceRefs.length === 0) return skipped('Preference without source refs skipped.');
    const row = await this.client().memoryPreference.upsert({
      where: { userId_key: { userId: params.userId, key: params.key } },
      update: {
        value: redactJson(params.value) as Prisma.InputJsonValue,
        confidence: clampConfidence(params.confidence),
        sourceRefs: params.sourceRefs as unknown as Prisma.InputJsonValue,
        decayPolicy: params.decayPolicy as Prisma.InputJsonValue | undefined,
      },
      create: {
        userId: params.userId,
        key: params.key,
        value: redactJson(params.value) as Prisma.InputJsonValue,
        confidence: clampConfidence(params.confidence),
        sourceRefs: params.sourceRefs as unknown as Prisma.InputJsonValue,
        decayPolicy: params.decayPolicy as Prisma.InputJsonValue | undefined,
      },
    });
    await this.upsertItem({
      userId: params.userId,
      tier: 'far',
      key: `preference:${params.key}`,
      value: { key: params.key, value: redactJson(params.value) },
      summary: `Preference ${params.key}: ${stringifyValue(params.value).slice(0, 180)}`,
      sourceRefs: params.sourceRefs,
      confidence: clampConfidence(params.confidence),
    });
    return { status: 'completed', id: row.id, summary: 'Preference updated.', evidence: params.sourceRefs.map(formatSourceRef) };
  }

  async writeBehaviorSignal(params: {
    userId?: string;
    productId?: string;
    category?: string;
    brand?: string;
    type: string;
    weight?: number;
    sourceAgent?: AgentTraceAgent | string;
    metadata?: unknown;
  }): Promise<StorageMemoryWriteResult> {
    const row = await this.client().memoryBehaviorSignal.create({
      data: {
        userId: params.userId,
        productId: params.productId,
        category: params.category,
        brand: params.brand,
        type: params.type,
        weight: Math.max(-10, Math.min(10, params.weight ?? 1)),
        sourceAgent: params.sourceAgent,
        metadata: redactJson(params.metadata) as Prisma.InputJsonValue | undefined,
      },
    });
    return { status: 'completed', id: row.id, summary: 'Behavior signal written.', evidence: [`MemoryBehaviorSignal:${row.id}`] };
  }

  async summarizeNearToMid(params: { userId: string; requestId?: string; limit?: number }): Promise<StorageMemoryWriteResult> {
    const items = await this.client().memoryItem.findMany({
      where: { userId: params.userId, tier: 'near' },
      orderBy: { updatedAt: 'desc' },
      take: params.limit ?? 20,
    });
    if (items.length === 0) return skipped('No near memory to summarize.');
    const sourceRefs = items.flatMap((item) => [{ table: 'MemoryItem', id: String(item.id) }]);
    const summary = items
      .map((item) => readString(item.summary) ?? `${readString(item.key) ?? 'memory'}: ${stringifyValue(item.value).slice(0, 160)}`)
      .slice(0, 12)
      .join('\n');
    await this.client().memorySummary.create({
      data: {
        userId: params.userId,
        scope: 'session',
        sourceAgent: 'storage-memory-agent',
        sourceRefIds: sourceRefs.map((ref) => ref.id) as Prisma.InputJsonValue,
        summary,
        facts: { itemCount: items.length, requestId: params.requestId } as Prisma.InputJsonValue,
        confidence: 0.76,
        tokenEstimate: estimateMemoryTokens(summary),
      },
    });
    const item = await this.upsertItem({
      userId: params.userId,
      tier: 'mid',
      key: `session:${params.requestId ?? 'latest'}:summary`,
      value: { itemCount: items.length },
      summary,
      sourceRefs,
      confidence: 0.76,
    });
    return { status: 'completed', id: item.id, summary: 'Near memory summarized to mid.', evidence: sourceRefs.map(formatSourceRef).slice(0, 12) };
  }

  async summarizeMidToFar(params: { userId: string; key?: string; limit?: number }): Promise<StorageMemoryWriteResult> {
    const [midItems, preferences, behaviorSignals] = await Promise.all([
      this.client().memoryItem.findMany({
        where: { userId: params.userId, tier: 'mid' },
        orderBy: { updatedAt: 'desc' },
        take: params.limit ?? 12,
      }),
      this.client().memoryPreference.findMany({ where: { userId: params.userId }, orderBy: { updatedAt: 'desc' }, take: 12 }),
      this.client().memoryBehaviorSignal.findMany({ where: { userId: params.userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    if (midItems.length === 0 && preferences.length === 0 && behaviorSignals.length === 0) return skipped('No mid/far candidates to summarize.');

    const sourceRefs = [
      ...midItems.map((item) => ({ table: 'MemoryItem', id: String(item.id) })),
      ...preferences.map((item) => ({ table: 'MemoryPreference', id: String(item.id) })),
      ...behaviorSignals.map((item) => ({ table: 'MemoryBehaviorSignal', id: String(item.id) })),
    ];
    const behaviorBrief = summarizeBehaviorRows(behaviorSignals);
    const preferenceBrief = preferences
      .map((item) => `${readString(item.key) ?? 'preference'}=${stringifyValue(item.value).slice(0, 120)}`)
      .slice(0, 8)
      .join('; ');
    const midBrief = midItems
      .map((item) => readString(item.summary) ?? stringifyValue(item.value).slice(0, 160))
      .slice(0, 6)
      .join(' | ');
    const summary = [`Mid: ${midBrief}`, preferenceBrief ? `Preferences: ${preferenceBrief}` : '', behaviorBrief ? `Behavior: ${behaviorBrief}` : '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 1800);

    await this.client().memorySummary.create({
      data: {
        userId: params.userId,
        scope: 'user',
        sourceAgent: 'storage-memory-agent',
        sourceRefIds: sourceRefs.map((ref) => ref.id) as Prisma.InputJsonValue,
        summary,
        facts: {
          midCount: midItems.length,
          preferenceCount: preferences.length,
          behaviorCount: behaviorSignals.length,
        } as Prisma.InputJsonValue,
        confidence: 0.74,
        tokenEstimate: estimateMemoryTokens(summary),
      },
    });
    const item = await this.upsertItem({
      userId: params.userId,
      tier: 'far',
      key: params.key ?? 'profile:stable-summary',
      value: {
        midCount: midItems.length,
        preferenceCount: preferences.length,
        behaviorCount: behaviorSignals.length,
      },
      summary,
      sourceRefs,
      confidence: 0.74,
    });
    return { status: 'completed', id: item.id, summary: 'Mid memory summarized to far profile.', evidence: sourceRefs.map(formatSourceRef).slice(0, 16) };
  }

  async applyRetention(params: { userId: string; now?: Date }): Promise<{ deletedExpiredItems: number }> {
    const result = await this.client().memoryItem.deleteMany?.({
      where: {
        userId: params.userId,
        expiresAt: { lt: params.now ?? new Date() },
      },
    });
    return { deletedExpiredItems: result?.count ?? 0 };
  }

  async exportUserMemory(userId: string): Promise<{
    exportedAt: string;
    userId: string;
    turns: Array<Record<string, unknown>>;
    events: Array<Record<string, unknown>>;
    items: Array<Record<string, unknown>>;
    summaries: Array<Record<string, unknown>>;
    preferences: Array<Record<string, unknown>>;
    behaviorSignals: Array<Record<string, unknown>>;
    agentIndexes: Array<Record<string, unknown>>;
  }> {
    const client = this.client();
    const [turns, events, items, summaries, preferences, behaviorSignals, agentIndexes] = await Promise.all([
      client.memoryTurn.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      client.memoryEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      client.memoryItem.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 1000 }),
      client.memorySummary.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 1000 }),
      client.memoryPreference.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 1000 }),
      client.memoryBehaviorSignal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
      client.memoryAgentIndex.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      userId,
      turns: rowsForExport(turns),
      events: rowsForExport(events),
      items: rowsForExport(items),
      summaries: rowsForExport(summaries),
      preferences: rowsForExport(preferences),
      behaviorSignals: rowsForExport(behaviorSignals),
      agentIndexes: rowsForExport(agentIndexes),
    };
  }

  async deleteUserMemory(userId: string): Promise<{ deleted: Record<string, number> }> {
    const client = this.client();
    const [turns, events, items, summaries, preferences, behaviorSignals, agentIndexes] = await Promise.all([
      client.memoryTurn.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memoryEvent.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memoryItem.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memorySummary.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memoryPreference.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memoryBehaviorSignal.deleteMany?.({ where: { userId } }) ?? { count: 0 },
      client.memoryAgentIndex.deleteMany?.({ where: { userId } }) ?? { count: 0 },
    ]);
    return {
      deleted: {
        turns: turns.count,
        events: events.count,
        items: items.count,
        summaries: summaries.count,
        preferences: preferences.count,
        behaviorSignals: behaviorSignals.count,
        agentIndexes: agentIndexes.count,
      },
    };
  }

  private async upsertItem(params: {
    userId: string;
    tier: StorageMemoryTier;
    key: string;
    value: unknown;
    summary: string;
    sourceRefs: StorageMemorySourceRef[];
    confidence?: number;
    expiresAt?: Date;
  }): Promise<{ id: string } & Record<string, unknown>> {
    const tokenEstimate = estimateMemoryTokens(`${params.summary}\n${stringifyValue(params.value)}`);
    return this.client().memoryItem.upsert({
      where: { userId_tier_key: { userId: params.userId, tier: params.tier, key: params.key } },
      update: {
        value: redactJson(params.value) as Prisma.InputJsonValue,
        summary: params.summary,
        sourceRefs: params.sourceRefs as unknown as Prisma.InputJsonValue,
        confidence: clampConfidence(params.confidence),
        tokenEstimate,
        expiresAt: params.expiresAt,
      },
      create: {
        userId: params.userId,
        tier: params.tier,
        key: params.key,
        value: redactJson(params.value) as Prisma.InputJsonValue,
        summary: params.summary,
        sourceRefs: params.sourceRefs as unknown as Prisma.InputJsonValue,
        confidence: clampConfidence(params.confidence),
        tokenEstimate,
        expiresAt: params.expiresAt,
      },
    });
  }

  private client(): StorageMemoryClient {
    return this.prisma.client as unknown as StorageMemoryClient;
  }
}

export function estimateMemoryTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function classifyNeed(message: string): StorageMemoryNeed {
  const normalized = normalize(message);
  if (!normalized) return 'near';
  if (/(vua roi|luc nay|truoc do|cai do|cai nay|no|san pham vua|de xuat vua|goi y vua|them het|tat ca cai do)/.test(stripVietnamese(normalized))) return 'near_mid_far';
  if (/(thich|uu tien|hay mua|hanh vi|so thich|ca nhan|lich su|da mua)/.test(stripVietnamese(normalized))) return 'near_mid_far';
  if (/(gio hang|san pham|tu van|de xuat|tim|so sanh|bao hanh|doi tra)/.test(stripVietnamese(normalized))) return 'near_mid';
  return 'near';
}

function shouldPreferFar(message: string): boolean {
  const normalized = stripVietnamese(normalize(message));
  return /(so thich|hanh vi|ca nhan|thich|uu tien|hay mua|da mua)/.test(normalized);
}

function enforceBudget(params: {
  near: StorageMemoryContextItem[];
  midSummaries: StorageMemoryContextItem[];
  farProfile: StorageMemoryContextItem[];
  preferences: StorageMemoryPreferenceSignal[];
  behaviorSignals: StorageMemoryBehaviorSignal[];
  agentIndexes: StorageMemoryAgentIndexSignal[];
  tokenBudget: number;
  preferFar?: boolean;
}): Omit<StorageMemoryContextResult, 'need' | 'brief' | 'evidence' | 'references' | 'confidence'> {
  let tokenEstimate = 0;
  let truncated = false;
  const takeWithinBudget = <T>(items: T[], estimate: (item: T) => number): T[] => {
    const selected: T[] = [];
    for (const item of items) {
      const next = estimate(item);
      if (tokenEstimate + next > params.tokenBudget) {
        truncated = true;
        continue;
      }
      tokenEstimate += next;
      selected.push(item);
    }
    return selected;
  };

  const agentIndexes = takeWithinBudget(fairBySource(params.agentIndexes, (item) => item.sourceAgent), (item) => estimateMemoryTokens(item.summary));
  if (params.preferFar) {
    const farProfile = takeWithinBudget(params.farProfile, (item) => item.tokenEstimate);
    const preferences = takeWithinBudget(params.preferences, (item) => estimateMemoryTokens(`${item.key}:${stringifyValue(item.value)}`));
    const behaviorSignals = takeWithinBudget(params.behaviorSignals, (item) => estimateMemoryTokens(`${item.type}:${item.productId ?? item.category ?? item.brand ?? ''}`));
    const midSummaries = takeWithinBudget(params.midSummaries, (item) => item.tokenEstimate);
    const near = takeWithinBudget(params.near, (item) => item.tokenEstimate);
    return { near, midSummaries, farProfile, preferences, behaviorSignals, agentIndexes, tokenEstimate, truncated };
  }
  const near = takeWithinBudget(params.near, (item) => item.tokenEstimate);
  const midSummaries = takeWithinBudget(params.midSummaries, (item) => item.tokenEstimate);
  const farProfile = takeWithinBudget(params.farProfile, (item) => item.tokenEstimate);
  const preferences = takeWithinBudget(params.preferences, (item) => estimateMemoryTokens(`${item.key}:${stringifyValue(item.value)}`));
  const behaviorSignals = takeWithinBudget(params.behaviorSignals, (item) => estimateMemoryTokens(`${item.type}:${item.productId ?? item.category ?? item.brand ?? ''}`));
  return { near, midSummaries, farProfile, preferences, behaviorSignals, agentIndexes, tokenEstimate, truncated };
}

function fairBySource<T>(items: T[], sourceOf: (item: T) => string | undefined): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const source = sourceOf(item) ?? 'unknown';
    buckets.set(source, [...(buckets.get(source) ?? []), item]);
  }
  const selected: T[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const bucket of buckets.values()) {
      const next = bucket.shift();
      if (next) {
        selected.push(next);
        changed = true;
      }
    }
  }
  return selected;
}

function buildBrief(params: {
  need: StorageMemoryNeed;
  near: StorageMemoryContextItem[];
  midSummaries: StorageMemoryContextItem[];
  farProfile: StorageMemoryContextItem[];
  preferences: StorageMemoryPreferenceSignal[];
  agentIndexes: StorageMemoryAgentIndexSignal[];
  references: StorageMemoryContextResult['references'];
}): string {
  const lines = [
    `Memory need=${params.need}.`,
    params.references.lastProductIds.length ? `Recent product refs: ${params.references.lastProductIds.join(', ')}.` : '',
    params.agentIndexes.length ? `Agent refs: ${params.agentIndexes.map((item) => `${item.sourceAgent}:${item.sourceId}`).slice(0, 6).join(', ')}.` : '',
    params.near.length ? `Near: ${params.near.slice(0, 4).map((item) => item.summary).join(' | ')}` : '',
    params.midSummaries.length ? `Mid: ${params.midSummaries.slice(0, 3).map((item) => item.summary).join(' | ')}` : '',
    params.farProfile.length || params.preferences.length ? `Far signals: ${[...params.farProfile.map((item) => item.summary), ...params.preferences.map((item) => item.key)].slice(0, 5).join(' | ')}` : '',
  ].filter(Boolean);
  return lines.join('\n').slice(0, 1800);
}

function collectReferences(params: {
  near: StorageMemoryContextItem[];
  preferences: StorageMemoryPreferenceSignal[];
  agentIndexes: StorageMemoryAgentIndexSignal[];
}): StorageMemoryContextResult['references'] {
  const productIds = uniqueStrings([
    ...params.near.flatMap((item) => extractProductIds(item.value)),
    ...params.preferences.flatMap((item) => extractProductIds(item.value)),
    ...params.agentIndexes.flatMap((item) => item.productIds),
  ]);
  const recommendationIds = uniqueStrings([
    ...params.agentIndexes.filter((item) => /recommendation|search/.test(item.sourceAgent)).flatMap((item) => item.productIds),
    ...params.preferences.filter((item) => /recommend|recent/.test(item.key)).flatMap((item) => extractProductIds(item.value)),
  ]);
  const cartIds = uniqueStrings([
    ...params.agentIndexes.filter((item) => /cart/.test(item.sourceAgent)).flatMap((item) => item.productIds),
    ...params.near.filter((item) => /cart/.test(item.key)).flatMap((item) => extractProductIds(item.value)),
  ]);
  return { lastProductIds: productIds.slice(0, 12), lastRecommendationIds: recommendationIds.slice(0, 8), lastCartProductIds: cartIds.slice(0, 8) };
}

function toContextItem(row: Record<string, unknown>, fallbackTier: StorageMemoryTier): StorageMemoryContextItem {
  const summary = readString(row.summary) ?? `${readString(row.key) ?? 'memory'}: ${stringifyValue(row.value).slice(0, 200)}`;
  return {
    id: String(row.id),
    tier: readTier(row.tier) ?? fallbackTier,
    key: readString(row.key) ?? String(row.id),
    summary,
    value: row.value,
    sourceRefs: readSourceRefs(row.sourceRefs),
    confidence: readNumber(row.confidence) ?? 0.7,
    tokenEstimate: readNumber(row.tokenEstimate) ?? estimateMemoryTokens(summary),
    updatedAt: readDate(row.updatedAt),
  };
}

function turnToContextItem(row: Record<string, unknown>): StorageMemoryContextItem {
  const role = readString(row.role) ?? 'unknown';
  const content = readString(row.content) ?? '';
  return {
    id: String(row.id),
    tier: 'near',
    key: `turn:${row.id}`,
    summary: `${role}: ${content.slice(0, 220)}`,
    value: { role, content: content.slice(0, MAX_VALUE_TEXT), metadata: row.metadata },
    sourceRefs: [{ table: 'MemoryTurn', id: String(row.id) }],
    confidence: 0.82,
    tokenEstimate: estimateMemoryTokens(content),
    updatedAt: readDate(row.createdAt),
  };
}

function eventToContextItem(row: Record<string, unknown>): StorageMemoryContextItem {
  const type = readString(row.type) ?? 'event';
  const sourceAgent = readString(row.sourceAgent);
  const productIds = extractProductIds(row.payload);
  return {
    id: String(row.id),
    tier: 'near',
    key: `event:${row.id}`,
    summary: `${sourceAgent ?? 'pipeline'} ${type}${productIds.length ? ` products=${productIds.join(',')}` : ''}`,
    value: { type, payload: row.payload, productIds },
    sourceRefs: [{ table: 'MemoryEvent', id: String(row.id), agent: sourceAgent, type }],
    confidence: readNumber(row.confidence) ?? 0.7,
    tokenEstimate: estimateMemoryTokens(`${type}:${stringifyValue(row.payload)}`),
    updatedAt: readDate(row.createdAt),
  };
}

function toPreferenceSignal(row: Record<string, unknown>): StorageMemoryPreferenceSignal {
  return {
    key: readString(row.key) ?? 'unknown',
    value: row.value,
    confidence: readNumber(row.confidence) ?? 0.7,
    sourceRefs: readSourceRefs(row.sourceRefs),
    updatedAt: readDate(row.updatedAt),
  };
}

function toBehaviorSignal(row: Record<string, unknown>): StorageMemoryBehaviorSignal {
  return {
    type: readString(row.type) ?? 'unknown',
    weight: readNumber(row.weight) ?? 1,
    productId: readString(row.productId),
    category: readString(row.category),
    brand: readString(row.brand),
    sourceAgent: readString(row.sourceAgent),
    metadata: row.metadata,
    createdAt: readDate(row.createdAt),
  };
}

function toAgentIndexSignal(row: Record<string, unknown>): StorageMemoryAgentIndexSignal {
  return {
    sourceAgent: readString(row.sourceAgent) ?? 'unknown',
    sourceTable: readString(row.sourceTable) ?? 'unknown',
    sourceId: readString(row.sourceId) ?? String(row.id),
    summary: readString(row.summary) ?? '',
    tags: readStringArray(row.tags),
    productIds: readStringArray(row.productIds),
    cartId: readString(row.cartId),
    confidence: readNumber(row.confidence) ?? 0.7,
    createdAt: readDate(row.createdAt),
  };
}

function summarizeBehaviorRows(rows: Array<Record<string, unknown>>): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = [readString(row.type) ?? 'unknown', readString(row.productId) ?? readString(row.category) ?? readString(row.brand) ?? 'general'].join(':');
    counts.set(key, (counts.get(key) ?? 0) + (readNumber(row.weight) ?? 1));
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([key, weight]) => `${key}=${Number(weight.toFixed(2))}`)
    .join('; ');
}

function rowsForExport(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, exportValue(key, value)])));
}

function exportValue(key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (isSensitiveKey(key)) return '[redacted]';
  return redactJson(value);
}

function emptyContext(need: StorageMemoryNeed): StorageMemoryContextResult {
  return {
    need,
    brief: need === 'none' ? 'No storage memory loaded.' : 'No storage memory found.',
    near: [],
    midSummaries: [],
    farProfile: [],
    preferences: [],
    behaviorSignals: [],
    agentIndexes: [],
    evidence: [],
    references: { lastProductIds: [], lastRecommendationIds: [], lastCartProductIds: [] },
    tokenEstimate: 0,
    truncated: false,
    confidence: need === 'none' ? 0.7 : 0.2,
  };
}

function skipped(summary: string): StorageMemoryWriteResult {
  return { status: 'skipped', summary, evidence: [] };
}

function readSourceRefs(value: unknown): StorageMemorySourceRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StorageMemorySourceRef => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as StorageMemorySourceRef;
    return typeof candidate.table === 'string' && typeof candidate.id === 'string';
  });
}

function readTier(value: unknown): StorageMemoryTier | undefined {
  return value === 'near' || value === 'mid' || value === 'far' ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readDate(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function extractProductIds(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const candidate = value as { productId?: unknown; productIds?: unknown; products?: unknown };
  const direct = typeof candidate.productId === 'string' ? [candidate.productId] : [];
  const many = readStringArray(candidate.productIds);
  const products = Array.isArray(candidate.products)
    ? candidate.products.flatMap((item) => (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string' ? [(item as { id: string }).id] : []))
    : [];
  return uniqueStrings([...direct, ...many, ...products]);
}

function redactJson(value: unknown): unknown {
  if (typeof value === 'string') return redactSensitive(value);
  if (Array.isArray(value)) return value.map(redactJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, isSensitiveKey(key) ? '[redacted]' : redactJson(item)]));
}

function redactSensitive(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b(?:\+?84|0)(?:\d[\s.-]?){8,10}\b/g, '[redacted-phone]')
    .replace(/\b(password|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]');
}

function isSensitiveKey(key: string): boolean {
  return /password|token|secret|api[_-]?key|authorization|cookie/i.test(key);
}

function clampConfidence(value: unknown): number {
  const numeric = readNumber(value) ?? 0.7;
  return Math.max(0, Math.min(1, numeric));
}

function formatSourceRef(ref: StorageMemorySourceRef): string {
  return `${ref.table}:${ref.id}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function stripVietnamese(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}
