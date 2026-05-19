import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentChatResponse } from '../models/agent.models.js';
import type { MemoryInvestigationResult, PendingCartPlan } from '../models/agent-execution.models.js';
import type { Product } from '../models/catalog.models.js';
import { PrismaService } from './prisma.service.js';

export interface ChatMemoryContext {
  recentTurns: Array<{ role: string; content: string }>;
  preferences: Array<{ key: string; value: unknown }>;
  recentRecommendationIds: string[];
  rollingSummary?: string;
  pendingCartPlan?: PendingCartPlan;
}

export interface UserMemorySummary {
  threadCount: number;
  messageCount: number;
  preferenceKeys: string[];
  interactionCount: number;
  latestUpdatedAt?: string;
}

@Injectable()
export class ChatMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(userId: string | undefined): Promise<ChatMemoryContext> {
    if (!userId) return { recentTurns: [], preferences: [], recentRecommendationIds: [] };

    const [thread, preferences] = await Promise.all([
      this.prisma.client.chatThread.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 6 } },
      }),
      this.prisma.client.userPreference.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 8 }),
    ]);

    const preferenceContext = preferences.map((preference) => ({ key: preference.key, value: preference.value }));
    return {
      recentTurns: thread?.messages.reverse().map((message) => ({ role: message.role, content: message.content })) ?? [],
      preferences: preferenceContext,
      recentRecommendationIds: readStringArray(preferenceContext.find((preference) => preference.key === 'recent_recommendations')?.value),
      rollingSummary: readString(preferenceContext.find((preference) => preference.key === 'rolling_summary')?.value),
      pendingCartPlan: readPendingCartPlan(preferenceContext.find((preference) => preference.key === 'pending_cart_plan')?.value),
    };
  }

  async getInvestigationSource(userId: string | undefined): Promise<{ messages: Array<{ role: string; content: string; metadata?: unknown }>; preferences: Array<{ key: string; value: unknown }> }> {
    if (!userId) return { messages: [], preferences: [] };
    const [thread, preferences] = await Promise.all([
      this.prisma.client.chatThread.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 8 } },
      }),
      this.prisma.client.userPreference.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 8 }),
    ]);
    return {
      messages: thread?.messages.map((message) => ({ role: message.role, content: message.content, metadata: message.metadata })) ?? [],
      preferences: preferences.map((preference) => ({ key: preference.key, value: preference.value })),
    };
  }

  async investigateContext(userId: string | undefined, message: string): Promise<MemoryInvestigationResult> {
    const { MemoryAgentService } = await import('./agents/memory-agent.service.js');
    return new MemoryAgentService(this).investigate({ userId, message });
  }

  async saveTurn(params: { userId?: string; cartId?: string; userMessage: string; assistantResponse: AgentChatResponse; products: Product[] }): Promise<void> {
    if (!params.userId) return;

    const thread = await this.prisma.client.chatThread.upsert({
      where: { id: await this.resolveThreadId(params.userId, params.cartId) },
      update: { cartId: params.cartId, updatedAt: new Date() },
      create: { userId: params.userId, cartId: params.cartId, title: params.userMessage.slice(0, 80) },
    });
    const assistantText = params.assistantResponse.blocks.find((block) => block.type === 'text')?.content ?? '';

    await this.prisma.client.chatMessage.createMany({
      data: [
        { threadId: thread.id, role: 'user', content: params.userMessage },
        { threadId: thread.id, role: 'assistant', content: assistantText, metadata: params.assistantResponse as unknown as Prisma.InputJsonValue },
      ],
    });

    await this.saveProductPreferences(params.userId, params.products);
    await this.updateRollingSummary(params.userId, params.userMessage, assistantText);
  }

  async recordEvent(params: { userId?: string; productId?: string; type: string; metadata?: unknown }): Promise<void> {
    await this.prisma.client.userInteractionEvent.create({
      data: {
        userId: params.userId,
        productId: params.productId,
        type: params.type,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getUserMemorySummary(userId: string): Promise<UserMemorySummary> {
    const [threads, messageCount, preferences, interactionCount] = await Promise.all([
      this.prisma.client.chatThread.findMany({ where: { userId }, select: { id: true, updatedAt: true } }),
      this.prisma.client.chatMessage.count({ where: { thread: { userId } } }),
      this.prisma.client.userPreference.findMany({ where: { userId }, select: { key: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.client.userInteractionEvent.count({ where: { userId } }),
    ]);
    const latestUpdatedAt = [...threads.map((thread) => thread.updatedAt), ...preferences.map((preference) => preference.updatedAt)]
      .sort((left, right) => right.getTime() - left.getTime())[0];
    return {
      threadCount: threads.length,
      messageCount,
      preferenceKeys: preferences.map((preference) => preference.key),
      interactionCount,
      latestUpdatedAt: latestUpdatedAt?.toISOString(),
    };
  }

  async deleteUserMemory(userId: string): Promise<UserMemorySummary> {
    const threads = await this.prisma.client.chatThread.findMany({ where: { userId }, select: { id: true } });
    const threadIds = threads.map((thread) => thread.id);

    await this.prisma.client.$transaction([
      this.prisma.client.chatMessage.deleteMany({ where: { threadId: { in: threadIds } } }),
      this.prisma.client.chatThread.deleteMany({ where: { userId } }),
      this.prisma.client.userPreference.deleteMany({ where: { userId } }),
      this.prisma.client.userInteractionEvent.deleteMany({ where: { userId } }),
    ]);
    return this.getUserMemorySummary(userId);
  }

  async savePendingCartPlan(userId: string, plan: PendingCartPlan): Promise<void> {
    await this.prisma.client.userPreference.upsert({
      where: { userId_key: { userId, key: 'pending_cart_plan' } },
      update: { value: plan as unknown as Prisma.InputJsonValue },
      create: { userId, key: 'pending_cart_plan', value: plan as unknown as Prisma.InputJsonValue },
    });
  }

  async clearPendingCartPlan(userId: string): Promise<void> {
    await this.prisma.client.userPreference.deleteMany({ where: { userId, key: 'pending_cart_plan' } });
  }

  private async resolveThreadId(userId: string, cartId: string | undefined): Promise<string> {
    const thread = await this.prisma.client.chatThread.findFirst({ where: { userId, cartId }, orderBy: { updatedAt: 'desc' } });
    return thread?.id ?? `thread-${userId}-${cartId ?? 'default'}`;
  }

  private async saveProductPreferences(userId: string, products: Product[]): Promise<void> {
    const categories = [...new Set(products.map((product) => product.category))].slice(0, 5);
    const productIds = products.map((product) => product.id).slice(0, 8);

    if (categories.length > 0) {
      await this.prisma.client.userPreference.upsert({
        where: { userId_key: { userId, key: 'recent_categories' } },
        update: { value: categories as Prisma.InputJsonValue },
        create: { userId, key: 'recent_categories', value: categories as Prisma.InputJsonValue },
      });
    }

    if (productIds.length > 0) {
      await this.prisma.client.userPreference.upsert({
        where: { userId_key: { userId, key: 'recent_recommendations' } },
        update: { value: productIds as Prisma.InputJsonValue },
        create: { userId, key: 'recent_recommendations', value: productIds as Prisma.InputJsonValue },
      });
    }
  }

  private async updateRollingSummary(userId: string, userMessage: string, assistantText: string): Promise<void> {
    const existing = await this.prisma.client.userPreference.findUnique({ where: { userId_key: { userId, key: 'rolling_summary' } } });
    const previous = readString(existing?.value);
    const next = [previous, `Khách: ${userMessage}`, `Agent: ${assistantText}`]
      .filter(Boolean)
      .join('\n')
      .slice(-4000);

    await this.prisma.client.userPreference.upsert({
      where: { userId_key: { userId, key: 'rolling_summary' } },
      update: { value: next as Prisma.InputJsonValue },
      create: { userId, key: 'rolling_summary', value: next as Prisma.InputJsonValue },
    });
  }
}

function emptyInvestigation(requiresHistory: boolean): MemoryInvestigationResult {
  return { requiresHistory, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: requiresHistory ? 0.2 : 0.7 };
}

function requiresHistoryLookup(normalizedMessage: string): boolean {
  return /(sản phẩm mới|mẫu mới|cái mới|vừa gợi ý|vừa đề xuất|vừa rồi|thêm hết|tất cả|mấy cái đó|các cái đó|sản phẩm khác|mẫu khác|cái khác|nó|đó|này)/.test(normalizedMessage);
}

function detectResolvedReference(normalizedMessage: string): MemoryInvestigationResult['resolvedReference'] | undefined {
  if (/thêm hết|tất cả|cả \\d|mấy cái đó|các cái đó/.test(normalizedMessage)) return 'all_last_recommendations';
  if (/sản phẩm khác|mẫu khác|cái khác|khác/.test(normalizedMessage)) return 'another_option';
  if (/sản phẩm mới|mẫu mới|cái mới/.test(normalizedMessage)) return 'new_product';
  if (/vừa gợi ý|vừa đề xuất|vừa rồi/.test(normalizedMessage)) return 'last_recommendation';
  if (/nó|đó|này/.test(normalizedMessage)) return 'previous_product';
  return undefined;
}

function readAssistantMetadata(value: unknown): AgentChatResponse | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as AgentChatResponse;
  return Array.isArray(candidate.blocks) ? candidate : undefined;
}

function readProductIdsFromBlocks(response: AgentChatResponse | undefined): string[] {
  const productBlock = response?.blocks.find((block) => block.type === 'product_list');
  return productBlock?.type === 'product_list' ? productBlock.items.map((product) => product.id) : [];
}

function readTraceSelectedProductIds(response: AgentChatResponse | undefined): string[] {
  const trace = (response as unknown as { trace?: { retrieval?: { selectedProductIds?: unknown } } } | undefined)?.trace;
  return readStringArray(trace?.retrieval?.selectedProductIds);
}

function readTraceCartProductIds(response: AgentChatResponse | undefined): string[] {
  const trace = (response as unknown as { trace?: { cart?: { resolvedProductIds?: unknown } } } | undefined)?.trace;
  return readStringArray(trace?.cart?.resolvedProductIds);
}

function readTraceIntent(response: AgentChatResponse | undefined): string | undefined {
  const intent = (response as unknown as { trace?: { intent?: unknown } } | undefined)?.trace?.intent;
  return typeof intent === 'string' ? intent : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readPendingCartPlan(value: unknown): PendingCartPlan | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as PendingCartPlan;
  if (!candidate.id || !candidate.expiresAt || !Array.isArray(candidate.operations)) return undefined;
  if (Date.parse(candidate.expiresAt) <= Date.now()) return undefined;
  return candidate;
}
