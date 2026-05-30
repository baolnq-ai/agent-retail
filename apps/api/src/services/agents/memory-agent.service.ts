import { Injectable } from '@nestjs/common';
import { Buffer } from 'node:buffer';
import type { AgentChatResponse } from '../../models/agent.models.js';
import type { MemoryAgentResult, MemoryAgentVisitedNode, MemoryInvestigationResult } from '../../models/agent-execution.models.js';
import { ChatMemoryService } from '../chat-memory.service.js';

@Injectable()
export class MemoryAgentService {
  constructor(private readonly chatMemoryService: ChatMemoryService) {}

  async investigate(params: { userId?: string; message: string; maxDepth?: number; maxNodes?: number }): Promise<MemoryAgentResult> {
    const normalizedMessage = normalize(params.message);
    const requiresHistory = requiresHistoryLookup(normalizedMessage);
    const maxDepth = params.maxDepth ?? 2;
    const maxNodes = params.maxNodes ?? 12;
    if (!params.userId) return { ...emptyInvestigation(requiresHistory), visitedNodes: [], evidence: [] };

    const source = await this.chatMemoryService.getInvestigationSource(params.userId);
    const assistantMessages = source.messages.filter((message) => message.role === 'assistant');
    const lastMetadata = readAssistantMetadata(assistantMessages[0]?.metadata);
    const recentRecommendationIds = readStringArray(source.preferences.find((preference) => preference.key === 'recent_recommendations')?.value);
    const lastSelectedProductIds = uniqueStrings([
      ...readProductIdsFromBlocks(lastMetadata),
      ...readTraceSelectedProductIds(lastMetadata),
      ...recentRecommendationIds,
    ]);
    const lastCartActionProductIds = readTraceCartProductIds(lastMetadata);
    const resolvedReference = detectResolvedReference(normalizedMessage);
    const seedNodes = buildSeedNodes(source.messages, source.preferences, lastMetadata, normalizedMessage);
    const visitedNodes = expandMemoryNodes(seedNodes, normalizedMessage, maxDepth, maxNodes);
    const referencedProducts = uniqueStrings(visitedNodes.flatMap((node) => node.productIds ?? []));
    const cartReferenceProductIds = isLastCartItemReference(normalizedMessage) ? lastCartActionProductIds : [];
    const referenceProductIds = resolvedReference ? uniqueStrings([...cartReferenceProductIds, ...lastSelectedProductIds, ...referencedProducts]) : [];
    const summary = readString(source.preferences.find((preference) => preference.key === 'rolling_summary')?.value);

    return {
      requiresHistory,
      resolvedReference,
      referenceProductIds,
      lastIntent: readTraceIntent(lastMetadata),
      lastSelectedProductIds,
      lastCartActionProductIds,
      summary,
      confidence: referenceProductIds.length > 0 ? 0.86 : requiresHistory ? 0.35 : 0.7,
      visitedNodes,
      evidence: visitedNodes.slice(0, 5).map((node) => `${node.kind}: ${node.label}`),
    };
  }
}

function buildSeedNodes(messages: Array<{ role: string; content: string; metadata?: unknown }>, preferences: Array<{ key: string; value: unknown }>, metadata: AgentChatResponse | undefined, normalizedMessage: string): MemoryAgentVisitedNode[] {
  const messageNodes = messages.map((message, index) => ({
    id: `turn-${index}`,
    kind: 'recent_turn' as const,
    label: `${message.role}: ${message.content.slice(0, 160)}`,
    score: scoreText(message.content, normalizedMessage) + Math.max(0, 1 - index * 0.08),
    depth: 0,
    productIds: readProductIdsFromMetadata(message.metadata),
  }));
  const preferenceNodes = preferences.map((preference, index) => ({
    id: `preference-${preference.key}`,
    kind: preference.key === 'rolling_summary' ? 'summary' as const : preference.key === 'recent_recommendations' ? 'recommendation' as const : preference.key === 'pending_cart_plan' ? 'pending_cart' as const : 'preference' as const,
    label: `${preference.key}: ${stringifyValue(preference.value).slice(0, 180)}`,
    score: scoreText(`${preference.key} ${stringifyValue(preference.value)}`, normalizedMessage) + Math.max(0, 0.7 - index * 0.05),
    depth: 0,
    productIds: readStringArray(preference.value),
  }));
  const traceNode: MemoryAgentVisitedNode[] = metadata ? [{
    id: 'trace-metadata-latest',
    kind: 'trace_metadata',
    label: `Trace gần nhất: ${readTraceIntent(metadata) ?? 'unknown'}`,
    score: readTraceSelectedProductIds(metadata).length ? 0.9 : 0.2,
    depth: 0,
    productIds: uniqueStrings([...readTraceSelectedProductIds(metadata), ...readTraceCartProductIds(metadata)]),
  }] : [];
  return [...traceNode, ...messageNodes, ...preferenceNodes];
}

function expandMemoryNodes(seedNodes: MemoryAgentVisitedNode[], normalizedMessage: string, maxDepth: number, maxNodes: number): MemoryAgentVisitedNode[] {
  const visited: MemoryAgentVisitedNode[] = [];
  const queue = seedNodes
    .filter((node) => node.score > 0.15 || (node.productIds?.length ?? 0) > 0)
    .sort((left, right) => right.score - left.score);

  while (queue.length > 0 && visited.length < maxNodes) {
    const node = queue.shift();
    if (!node || visited.some((item) => item.id === node.id)) continue;
    visited.push(node);
    if (node.depth >= maxDepth || node.score < 0.25) continue;
    const related = seedNodes
      .filter((candidate) => candidate.id !== node.id && !visited.some((item) => item.id === candidate.id))
      .filter((candidate) => hasRelatedProducts(node, candidate) || hasRelatedTokens(node.label, candidate.label, normalizedMessage))
      .map((candidate) => ({ ...candidate, depth: node.depth + 1, score: Math.max(candidate.score * 0.72, 0.2) }));
    queue.push(...related);
    queue.sort((left, right) => right.score - left.score);
  }

  return visited.slice(0, maxNodes);
}

function hasRelatedProducts(left: MemoryAgentVisitedNode, right: MemoryAgentVisitedNode): boolean {
  const productIds = new Set(left.productIds ?? []);
  return (right.productIds ?? []).some((productId) => productIds.has(productId));
}

function hasRelatedTokens(left: string, right: string, normalizedMessage: string): boolean {
  const messageTokens = tokenSet(normalizedMessage);
  const leftTokens = tokenSet(normalize(left));
  const rightTokens = tokenSet(normalize(right));
  return [...leftTokens].some((token) => token.length > 2 && rightTokens.has(token) && (messageTokens.has(token) || /máy|lọc|nồi|robot|camera|đèn|quạt|bếp|giỏ|sản phẩm/.test(token)));
}

function scoreText(value: string, normalizedMessage: string): number {
  const tokens = [...tokenSet(normalizedMessage)].filter((token) => token.length > 2);
  const haystack = normalize(value);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 0.18 : 0), 0);
}

function tokenSet(value: string): Set<string> {
  return new Set(value.split(/\s+/).filter(Boolean));
}

function emptyInvestigation(requiresHistory: boolean): MemoryInvestigationResult {
  return { requiresHistory, referenceProductIds: [], lastSelectedProductIds: [], lastCartActionProductIds: [], confidence: requiresHistory ? 0.2 : 0.7 };
}

function requiresHistoryLookup(normalizedMessage: string): boolean {
  if (/(vua them|mon vua them|san pham vua them|o tren|de dung nhat|con lai|hai mon dau|2 mon dau|mon dau|cai thu hai|san pham thu hai|san pham con lai|phuong an mua cuoi|re hon|gia mem hon|tiet kiem hon|mau nao.*hon|lua chon khac|goi y them|xem them|them gi nua)/.test(stripVietnameseTone(normalizedMessage))) return true;
  return /(sản phẩm mới|mẫu mới|cái mới|vừa gợi ý|vừa đề xuất|vừa rồi|thêm hết|tất cả|mấy cái đó|các cái đó|sản phẩm khác|mẫu khác|cái khác|nó|đó|này|thêm máy|thêm nồi|thêm robot|thêm camera|thêm đèn|thêm quạt|thêm bếp|thêm lọc)/.test(normalizedMessage);
}

function detectResolvedReference(normalizedMessage: string): MemoryInvestigationResult['resolvedReference'] | undefined {
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  if (/vua them|mon vua them|san pham vua them|con lai|san pham con lai/.test(asciiMessage)) return 'previous_product';
  if (/o tren|de dung nhat|hai mon dau|2 mon dau|mon dau|cai thu hai|san pham thu hai/.test(asciiMessage)) return 'last_recommendation';
  if (/re hon|gia mem hon|tiet kiem hon|mau nao.*hon|lua chon khac|goi y them|xem them|them gi nua/.test(asciiMessage)) return 'another_option';
  if (/thêm hết|tất cả|cả \d|mấy cái đó|các cái đó/.test(normalizedMessage)) return 'all_last_recommendations';
  if (/sản phẩm khác|mẫu khác|cái khác|khác/.test(normalizedMessage)) return 'another_option';
  if (/sản phẩm mới|mẫu mới|cái mới/.test(normalizedMessage)) return 'new_product';
  if (/vừa gợi ý|vừa đề xuất|vừa rồi|thêm máy|thêm nồi|thêm robot|thêm camera|thêm đèn|thêm quạt|thêm bếp|thêm lọc/.test(normalizedMessage)) return 'last_recommendation';
  if (/nó|đó|này/.test(normalizedMessage)) return 'previous_product';
  return undefined;
}

function isLastCartItemReference(normalizedMessage: string): boolean {
  return /(vua them|mon vua them|san pham vua them|con lai)/.test(stripVietnameseTone(normalizedMessage));
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

function readProductIdsFromMetadata(value: unknown): string[] {
  const metadata = readAssistantMetadata(value);
  return metadata ? uniqueStrings([...readProductIdsFromBlocks(metadata), ...readTraceSelectedProductIds(metadata)]) : [];
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

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function stringifyValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function normalize(value: string): string {
  return repairVietnameseMojibake(value).toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function repairVietnameseMojibake(value: string): string {
  let current = value;
  for (let index = 0; index < 3 && /[\u00c3\u00c4\u00c6\u00ba\u00bb]/.test(current); index += 1) {
    try {
      const repaired = Buffer.from(current, 'latin1').toString('utf8');
      if (!repaired || repaired === current) break;
      current = repaired;
    } catch {
      break;
    }
  }
  return current;
}

function stripVietnameseTone(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}
