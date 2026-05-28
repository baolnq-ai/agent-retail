import { Injectable } from '@nestjs/common';
import type {
  HistoryAgentRequest,
  HistoryAgentResult,
  HistoryAmbiguityType,
  HistoryNextAgentHint,
  HistoryRailConsistencyResult,
  HistoryResolvedReference,
  StorageMemoryAgentIndexSignal,
  StorageMemoryContextResult,
} from '../../models/agent-execution.models.js';
import { StorageMemoryAgentService } from './storage-memory-agent.service.js';

@Injectable()
export class HistoryAgentService {
  constructor(private readonly storageMemoryAgentService: StorageMemoryAgentService) {}

  async resolve(params: HistoryAgentRequest): Promise<HistoryAgentResult> {
    const ambiguity = classifyAmbiguity(params.message, params.ambiguityHint);
    if (!params.userId) return buildResult({ status: 'not_found', ambiguity, references: [], missingInfo: ['User is not authenticated, no private history can be read.'], message: params.message });

    const context = await this.storageMemoryAgentService.getContext({
      userId: params.userId,
      message: params.message,
      requestId: params.requestId,
      need: 'near_mid_far',
      tokenBudget: params.contextBudget ?? 1800,
      sourceAgents: sourceAgentsFor(params.allowedSources),
    });
    const references = resolveReferences({ message: params.message, ambiguity, context });
    const status = decideStatus(references, ambiguity, context);
    const missingInfo = buildMissingInfo(references, status, ambiguity);

    return buildResult({ status, ambiguity, references, missingInfo, message: params.message });
  }

  validateRailConsistency(params: { history: HistoryAgentResult; textProductIds?: string[]; railProductIds?: string[] }): HistoryRailConsistencyResult {
    const mustMentionProductIds = params.history.handoff.mustMentionProductIds;
    const mentioned = params.textProductIds ?? [];
    const rail = params.railProductIds ?? [];
    const allowed = new Set([...mustMentionProductIds, ...rail]);
    const unexpectedProductIds = [...new Set([...mentioned, ...rail].filter((productId) => !allowed.has(productId)))];
    const complaints = [
      ...mustMentionProductIds.filter((productId) => !mentioned.includes(productId) && !rail.includes(productId)).map((productId) => `Missing referenced product ${productId}.`),
      ...unexpectedProductIds.map((productId) => `Unexpected product ${productId} is outside history/search/recommendation contract.`),
    ];
    return { pass: complaints.length === 0, complaints, mustMentionProductIds, unexpectedProductIds };
  }
}

function classifyAmbiguity(message: string, hint: HistoryAgentRequest['ambiguityHint']): HistoryAgentResult['ambiguity'] {
  if (hint?.type) return { phrase: hint.phrase, type: hint.type, confidence: 0.9 };
  const normalized = stripVietnamese(message);
  const ordinalPhrase = extractOrdinalPhrase(normalized);
  if (ordinalPhrase) return { phrase: ordinalPhrase.phrase, type: 'ordinal', confidence: 0.86 };
  if (/(vua de xuat|vua goi y|san pham vua|mau vua)/.test(normalized)) return { phrase: 'vua de xuat', type: 'previous_recommendation', confidence: 0.9 };
  if (/(vua tim|ket qua tim|tim luc nay)/.test(normalized)) return { phrase: 'vua tim', type: 'previous_search', confidence: 0.86 };
  if (/(trong gio|gio hang|da them|moi them|vua them|mon vua them|san pham vua them|con lai)/.test(normalized) && /(cai do|san pham do|no|mau do|mon|san pham|con lai|vua them)/.test(normalized)) return { phrase: 'cart reference', type: 'cart_item', confidence: 0.82 };
  if (/(cai do|cai nay|mau do|san pham do|no|hang do|loai do|vay)/.test(normalized)) return { phrase: 'pronoun reference', type: 'pronoun', confidence: 0.78 };
  return { phrase: undefined, type: 'general_context', confidence: 0.45 };
}

function resolveReferences(params: { message: string; ambiguity: HistoryAgentResult['ambiguity']; context: StorageMemoryContextResult }): HistoryResolvedReference[] {
  if (params.ambiguity.type === 'ordinal') return resolveOrdinal(params);
  if (params.ambiguity.type === 'previous_recommendation') return resolveProductSet(params, params.context.references.lastRecommendationIds, 'recommendation_set', 'recommendation');
  if (params.ambiguity.type === 'previous_search') return resolveProductSet(params, productIdsFromAgent(params.context.agentIndexes, /search-agent/), 'search_result', 'search');
  if (params.ambiguity.type === 'cart_item') return resolveProductSet(params, params.context.references.lastCartProductIds, 'cart_item', 'cart');
  if (params.ambiguity.type === 'pronoun') return resolvePronoun(params);
  if (params.context.brief && params.context.evidence.length > 0) {
    return [{
      refType: 'conversation_topic',
      phrase: params.ambiguity.phrase ?? 'recent context',
      sourceAgent: 'memory',
      confidence: 0.55,
      evidence: evidenceFromContext(params.context).slice(0, 3),
    }];
  }
  return [];
}

function resolveOrdinal(params: { message: string; ambiguity: HistoryAgentResult['ambiguity']; context: StorageMemoryContextResult }): HistoryResolvedReference[] {
  const ordinal = extractOrdinalPhrase(stripVietnamese(params.message))?.index ?? 0;
  const candidates = params.context.references.lastRecommendationIds.length
    ? params.context.references.lastRecommendationIds
    : params.context.references.lastProductIds;
  const productId = candidates[ordinal < 0 ? candidates.length - 1 : ordinal];
  if (!productId) return [];
  return [{
    refType: 'product',
    phrase: params.ambiguity.phrase ?? `ordinal:${ordinal + 1}`,
    productId,
    productIds: [productId],
    sourceAgent: 'recommendation',
    confidence: 0.88,
    evidence: evidenceForProduct(params.context, productId),
  }];
}

function resolvePronoun(params: { message: string; ambiguity: HistoryAgentResult['ambiguity']; context: StorageMemoryContextResult }): HistoryResolvedReference[] {
  const productIds = params.context.references.lastProductIds;
  if (productIds.length === 1) return resolveProductSet(params, productIds, 'product', sourceForProduct(params.context, productIds[0]));
  if (productIds.length > 1 && /(tat ca|them het|cac cai do|may cai do)/.test(stripVietnamese(params.message))) {
    return resolveProductSet(params, productIds, 'recommendation_set', 'recommendation');
  }
  if (productIds.length > 1) return [];
  return [];
}

function resolveProductSet(
  params: { ambiguity: HistoryAgentResult['ambiguity']; context: StorageMemoryContextResult },
  productIds: string[],
  refType: HistoryResolvedReference['refType'],
  sourceAgent: HistoryResolvedReference['sourceAgent'],
): HistoryResolvedReference[] {
  const uniqueProductIds = [...new Set(productIds)].slice(0, 8);
  if (uniqueProductIds.length === 0) return [];
  if (uniqueProductIds.length === 1) {
    const productId = uniqueProductIds[0];
    return [{
      refType: refType === 'recommendation_set' || refType === 'search_result' ? 'product' : refType,
      phrase: params.ambiguity.phrase ?? 'history reference',
      productId,
      productIds: [productId],
      sourceAgent,
      confidence: 0.88,
      evidence: evidenceForProduct(params.context, productId),
    }];
  }
  return [{
    refType,
    phrase: params.ambiguity.phrase ?? 'history reference',
    productIds: uniqueProductIds,
    sourceAgent,
    confidence: 0.82,
    evidence: evidenceFromContext(params.context).slice(0, 6),
  }];
}

function decideStatus(references: HistoryResolvedReference[], ambiguity: HistoryAgentResult['ambiguity'], context: StorageMemoryContextResult): HistoryAgentResult['status'] {
  if (ambiguity.type === 'pronoun' && references.length === 0 && context.references.lastProductIds.length > 1) return 'ambiguous';
  if (references.length === 0) return context.evidence.length > 0 ? 'partial' : 'not_found';
  if (ambiguity.type === 'pronoun' && context.references.lastProductIds.length > 1 && !references.some((ref) => ref.refType === 'recommendation_set')) return 'ambiguous';
  return references.some((ref) => ref.confidence >= 0.75) ? 'resolved' : 'partial';
}

function buildMissingInfo(references: HistoryResolvedReference[], status: HistoryAgentResult['status'], ambiguity: HistoryAgentResult['ambiguity']): string[] {
  if (status === 'not_found') return ['No safe memory evidence found for the referenced phrase.'];
  if (status === 'ambiguous') return ['More than one recent product could match the pronoun. Lead should ask a short clarification or call Search/Recommendation with candidate ids.'];
  const missing = references.flatMap((reference) => reference.productId || reference.productIds?.length ? [] : ['Product id is missing from history evidence.']);
  if (ambiguity.type === 'general_context') missing.push('No concrete ambiguous product reference was detected.');
  return [...new Set(missing)];
}

function buildResult(params: {
  status: HistoryAgentResult['status'];
  ambiguity: HistoryAgentResult['ambiguity'];
  references: HistoryResolvedReference[];
  missingInfo: string[];
  message: string;
}): HistoryAgentResult {
  const productIds = [...new Set(params.references.flatMap((reference) => reference.productId ? [reference.productId] : reference.productIds ?? []))];
  const nextAgentHints = buildNextAgentHints(params.message, productIds, params.status);
  return {
    status: params.status,
    ambiguity: params.ambiguity,
    resolvedReferences: params.references,
    missingInfo: params.missingInfo,
    nextAgentHints,
    handoff: {
      agentMessage: buildAgentMessage(params.status, productIds, params.missingInfo),
      leadInstruction: productIds.length
        ? 'Use these product ids as compact refs. Call Search for authoritative product facts before final answer if details are needed.'
        : 'History did not resolve a product id. Ask a concise clarification or call Search only if the user gave enough new keywords.',
      allowedClaims: productIds.length ? [`History resolved product ids: ${productIds.join(', ')}`] : ['No product id was resolved from history.'],
      forbiddenClaims: ['Do not invent product names, prices, stock, warranties or policies from history memory alone.', 'Do not expose debug logs, secrets or another user memory.'],
      mustMentionProductIds: productIds,
      mustNotMentionProductIds: [],
    },
  };
}

function buildNextAgentHints(message: string, productIds: string[], status: HistoryAgentResult['status']): HistoryNextAgentHint[] {
  const normalized = stripVietnamese(message);
  if (status === 'not_found' || status === 'ambiguous') return [{ agent: 'lead', reason: 'History is not confident enough; ask clarification or gather more context.', inputHint: { productIds } }];
  const hints: HistoryNextAgentHint[] = [];
  if (/(them|mua|bo vao gio)/.test(normalized)) hints.push({ agent: 'cart', reason: 'User likely wants a cart action on resolved product ids.', inputHint: { productIds } });
  if (/(re hon|giong|khac|tuong tu|de xuat them)/.test(normalized)) hints.push({ agent: 'recommendation', reason: 'User asks for alternatives or companion recommendations.', inputHint: { seedProductIds: productIds } });
  if (/(chi tiet|bao hanh|thong so|gia|ton kho|co nen mua)/.test(normalized)) hints.push({ agent: 'search', reason: 'Authoritative product facts are needed before final answer.', inputHint: { productIds } });
  hints.push({ agent: 'sales', reason: 'Compose final user-facing answer using resolved refs and verified facts.', inputHint: { mustMentionProductIds: productIds } });
  return dedupeHints(hints);
}

function evidenceForProduct(context: StorageMemoryContextResult, productId: string): HistoryResolvedReference['evidence'] {
  const indexes = context.agentIndexes.filter((item) => item.productIds.includes(productId));
  if (indexes.length > 0) {
    return indexes.slice(0, 4).map((item) => ({
      source: item.sourceAgent,
      sourceId: item.sourceId,
      summary: item.summary,
      createdAt: item.createdAt,
    }));
  }
  return evidenceFromContext(context).slice(0, 4);
}

function evidenceFromContext(context: StorageMemoryContextResult): HistoryResolvedReference['evidence'] {
  return [
    ...context.agentIndexes.map((item) => ({ source: item.sourceAgent, sourceId: item.sourceId, summary: item.summary, createdAt: item.createdAt })),
    ...context.near.map((item) => ({ source: item.key, sourceId: item.id, summary: item.summary, createdAt: item.updatedAt })),
    ...context.midSummaries.map((item) => ({ source: item.key, sourceId: item.id, summary: item.summary, createdAt: item.updatedAt })),
  ].slice(0, 8);
}

function sourceForProduct(context: StorageMemoryContextResult, productId: string): HistoryResolvedReference['sourceAgent'] {
  const source = context.agentIndexes.find((item) => item.productIds.includes(productId))?.sourceAgent;
  if (source?.includes('cart')) return 'cart';
  if (source?.includes('search')) return 'search';
  if (source?.includes('recommendation')) return 'recommendation';
  return 'memory';
}

function productIdsFromAgent(indexes: StorageMemoryAgentIndexSignal[], pattern: RegExp): string[] {
  return [...new Set(indexes.filter((item) => pattern.test(item.sourceAgent)).flatMap((item) => item.productIds))];
}

function sourceAgentsFor(allowedSources: HistoryAgentRequest['allowedSources']): string[] | undefined {
  if (!allowedSources?.length) return undefined;
  const agents: string[] = [];
  if (allowedSources.includes('cart_history')) agents.push('cart-agent');
  if (allowedSources.includes('search_history')) agents.push('search-agent');
  if (allowedSources.includes('recommendation_history')) agents.push('recommendation-agent');
  return agents.length ? agents : undefined;
}

function extractOrdinalPhrase(normalized: string): { phrase: string; index: number } | undefined {
  const words: Array<[RegExp, number, string]> = [
    [/(cai|mau|san pham)?\s*(dau tien|thu nhat|so 1)\b/, 0, 'first'],
    [/(cai|mau|san pham)?\s*(thu hai|so 2)\b/, 1, 'second'],
    [/(cai|mau|san pham)?\s*(thu ba|so 3)\b/, 2, 'third'],
    [/(cai|mau|san pham)?\s*(cuoi|cuoi cung)\b/, -1, 'last'],
  ];
  for (const [pattern, index, phrase] of words) {
    if (pattern.test(normalized)) return { phrase, index };
  }
  const numeric = normalized.match(/(?:cai|mau|san pham)?\s*(?:thu|so)\s*(\d+)/);
  if (numeric?.[1]) return { phrase: numeric[0], index: Math.max(0, Number(numeric[1]) - 1) };
  return undefined;
}

function dedupeHints(hints: HistoryNextAgentHint[]): HistoryNextAgentHint[] {
  const seen = new Set<string>();
  return hints.filter((hint) => {
    if (seen.has(hint.agent)) return false;
    seen.add(hint.agent);
    return true;
  });
}

function buildAgentMessage(status: HistoryAgentResult['status'], productIds: string[], missingInfo: string[]): string {
  if (productIds.length) return `Resolved history refs: ${productIds.join(', ')}.`;
  if (status === 'ambiguous') return `History is ambiguous: ${missingInfo.join(' ')}`;
  return 'History could not resolve a product reference with safe evidence.';
}

function stripVietnamese(value: string): string {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}
