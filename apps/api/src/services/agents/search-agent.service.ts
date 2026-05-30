import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Product } from '../../models/catalog.models.js';
import type { SearchAgentCandidate, SearchAgentRequest, SearchAgentResult, SearchLane, SearchMatchType } from '../../models/agent-execution.models.js';
import { PrismaService } from '../prisma.service.js';

type SearchClient = {
  product: { findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>; findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null> };
  searchAgentInteraction?: { create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> };
  searchAgentMemory?: { upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>; findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>> };
};

@Injectable()
export class SearchAgentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService | { client: SearchClient },
  ) {}

  async runGoal(params: SearchAgentRequest): Promise<SearchAgentResult> {
    const limit = Math.max(1, Math.min(20, params.limit ?? 8));
    const normalizedQuery = normalize(params.query);
    if (!normalizedQuery && !params.filters?.productId) return this.withHistory(params, emptyResult(params.query, 'needs_clarification', 'Search query is empty.'));

    const products = await this.loadProducts(params.filters?.productId);
    const filtered = applyHardFilters(products, params.filters);
    const relatedFamily = params.filters?.productId ? undefined : detectRelatedProductFamily(normalizedQuery);
    const searchableProducts = relatedFamily ? filtered.filter((product) => productMatchesFamily(product, relatedFamily)) : filtered;
    const effectiveQuery = relatedFamily ? `${normalizedQuery} ${relatedFamily.expansion}` : normalizedQuery;
    const usedLanes = new Set<SearchLane>();
    const issues: SearchAgentResult['issues'] = [];
    if (params.filters && Object.keys(params.filters).length > 0) usedLanes.add('filter');
    if (relatedFamily) {
      issues.push({
        code: 'related_family_expanded',
        message: `Search query was expanded inside the ${relatedFamily.key} product family so fallback cannot jump to unrelated categories.`,
        recoverable: true,
      });
    }

    const exact = scoreExact(searchableProducts, normalizedQuery, params.filters?.productId);
    if (exact.length > 0) usedLanes.add('exact');

    const lexical = scoreLexical(searchableProducts, effectiveQuery);
    if (lexical.length > 0) usedLanes.add('lexical');

    let candidates = mergeCandidates([...exact, ...lexical]).slice(0, limit);
    let matchType: SearchMatchType = decideMatchType(candidates, exact.length > 0, usedLanes.has('filter'));

    candidates = verifyCandidates(candidates, searchableProducts, params.filters).slice(0, limit);
    const status = candidates.length > 0 ? 'completed' : 'no_results';
    if (status === 'no_results') {
      issues.push({ code: 'no_results', message: 'No product matched the query and hard filters.', recoverable: true });
      matchType = 'none';
    }

    return this.withHistory(params, {
      status,
      query: params.query,
      usedLanes: [...usedLanes],
      matchType,
      candidates,
      issues,
      handoff: buildHandoff({ query: params.query, matchType, candidates, issues }),
    });
  }

  async getMemoryContext(userId: string): Promise<{ near: string[]; midSummary?: string; farSignals: string[] }> {
    const rows = await this.client().searchAgentMemory?.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 12 }) ?? [];
    return {
      near: rows.filter((row) => row.tier === 'near').flatMap((row) => readString(row.summary) ? [readString(row.summary) as string] : []),
      midSummary: rows.find((row) => row.tier === 'mid')?.summary as string | undefined,
      farSignals: rows.filter((row) => row.tier === 'far').flatMap((row) => readString(row.summary) ? [readString(row.summary) as string] : []),
    };
  }

  private async loadProducts(productId: string | undefined): Promise<Product[]> {
    if (productId) {
      const product = await this.client().product.findUnique({ where: { id: productId } });
      return product ? [toProduct(product)] : [];
    }
    const rows = await this.client().product.findMany();
    return rows.map(toProduct);
  }

  private async withHistory(params: SearchAgentRequest, result: SearchAgentResult): Promise<SearchAgentResult> {
    if (!params.userId) return result;
    const client = this.client();
    const normalizedQuery = normalize(params.query);
    await client.searchAgentInteraction?.create({
      data: {
        userId: params.userId,
        requestId: params.requestId,
        query: params.query,
        normalizedQuery,
        filters: (params.filters ?? {}) as Prisma.InputJsonValue,
        usedLanes: result.usedLanes as Prisma.InputJsonValue,
        candidateProductIds: result.candidates.map((item) => item.productId) as Prisma.InputJsonValue,
        selectedProductIds: result.candidates.slice(0, 3).map((item) => item.productId) as Prisma.InputJsonValue,
        facts: result.candidates.map((item) => ({ productId: item.productId, confidence: item.confidence, matchType: result.matchType })) as Prisma.InputJsonValue,
        issues: result.issues as unknown as Prisma.InputJsonValue,
        status: result.status,
      },
    });
    await client.searchAgentMemory?.upsert({
      where: { userId_tier_key: { userId: params.userId, tier: 'near', key: `search:${params.requestId}` } },
      update: {
        value: { query: params.query, matchType: result.matchType, productIds: result.candidates.map((item) => item.productId) } as Prisma.InputJsonValue,
        summary: `Search ${result.matchType}: ${params.query} -> ${result.candidates.slice(0, 3).map((item) => item.productId).join(', ') || 'no_results'}`,
        tokenEstimate: estimateTokens(params.query),
      },
      create: {
        userId: params.userId,
        tier: 'near',
        key: `search:${params.requestId}`,
        value: { query: params.query, matchType: result.matchType, productIds: result.candidates.map((item) => item.productId) } as Prisma.InputJsonValue,
        summary: `Search ${result.matchType}: ${params.query} -> ${result.candidates.slice(0, 3).map((item) => item.productId).join(', ') || 'no_results'}`,
        tokenEstimate: estimateTokens(params.query),
      },
    });
    return result;
  }

  private client(): SearchClient {
    return this.prisma.client as unknown as SearchClient;
  }

}

function applyHardFilters(products: Product[], filters: SearchAgentRequest['filters']): Product[] {
  return products
    .filter((product) => !filters?.category || includesNormalized(product.category, filters.category))
    .filter((product) => !filters?.brand || includesNormalized(product.brand, filters.brand))
    .filter((product) => filters?.budgetMin === undefined || product.price >= filters.budgetMin)
    .filter((product) => filters?.budgetMax === undefined || product.price <= filters.budgetMax)
    .filter((product) => !filters?.requireInStock || product.inventory > 0)
    .filter((product) => matchesAttributes(product, filters?.attributes));
}

function scoreExact(products: Product[], normalizedQuery: string, productId: string | undefined): SearchAgentCandidate[] {
  return products.flatMap((product) => {
    const normalizedTitle = normalize(product.title);
    const matchedFields: string[] = [];
    if (productId && product.id === productId) matchedFields.push('id');
    if (normalizedQuery && normalizedTitle === normalizedQuery) matchedFields.push('title');
    if (normalizedQuery && normalize(product.id) === normalizedQuery) matchedFields.push('id');
    if (matchedFields.length === 0) return [];
    return [candidate(product, 100, 0.98, matchedFields, [`exact:${matchedFields.join('+')}`])];
  });
}

function scoreLexical(products: Product[], normalizedQuery: string): SearchAgentCandidate[] {
  const tokens = queryTokens(normalizedQuery);
  if (tokens.length === 0) return [];
  return products
    .map((product) => {
      const fields = productFields(product);
      const matchedFields = Object.entries(fields).flatMap(([field, value]) => tokens.some((token) => value.includes(token)) ? [field] : []);
      const tokenHits = tokens.filter((token) => Object.values(fields).some((value) => value.includes(token))).length;
      const phraseBoost = fields.title.includes(normalizedQuery) ? 12 : fields.description.includes(normalizedQuery) ? 5 : 0;
      const score = tokenHits * 8 + phraseBoost;
      return { product, matchedFields: [...new Set(matchedFields)], score };
    })
    .filter((item) => item.score >= 8)
    .map((item) => candidate(item.product, item.score, Math.min(0.92, 0.45 + item.score / 60), item.matchedFields, [`lexical:tokens=${item.score}`]));
}

function mergeCandidates(candidates: SearchAgentCandidate[]): SearchAgentCandidate[] {
  const byId = new Map<string, SearchAgentCandidate>();
  for (const item of candidates) {
    const existing = byId.get(item.productId);
    if (!existing || item.score > existing.score) {
      byId.set(item.productId, existing ? {
        ...item,
        matchedFields: [...new Set([...existing.matchedFields, ...item.matchedFields])],
        evidence: [...new Set([...existing.evidence, ...item.evidence])],
      } : item);
    }
  }
  return [...byId.values()].sort((left, right) => right.score - left.score || right.confidence - left.confidence);
}

function verifyCandidates(candidates: SearchAgentCandidate[], allowedProducts: Product[], filters: SearchAgentRequest['filters']): SearchAgentCandidate[] {
  const allowed = new Set(allowedProducts.map((product) => product.id));
  return candidates
    .filter((item) => allowed.has(item.productId))
    .filter((item) => !filters?.requireInStock || item.evidence.some((evidence) => !evidence.includes('inventory=0')));
}

function decideMatchType(candidates: SearchAgentCandidate[], exactFound: boolean, filtered: boolean): SearchMatchType {
  if (exactFound) return 'exact';
  if (candidates.some((item) => item.confidence >= 0.78)) return 'strong_lexical';
  if (filtered && candidates.length > 0) return 'filtered';
  return candidates.length > 0 ? 'strong_lexical' : 'none';
}

function buildHandoff(params: { query: string; matchType: SearchMatchType; candidates: SearchAgentCandidate[]; issues: SearchAgentResult['issues'] }): SearchAgentResult['handoff'] {
  const ids = params.candidates.map((item) => item.productId);
  if (ids.length === 0) {
    return {
      agentMessage: `No products found for "${params.query}".`,
      leadInstruction: 'Ask for a clearer product name, category, budget or requirement.',
      allowedClaims: ['No matching product was found.'],
      forbiddenClaims: ['Do not invent products.'],
    };
  }
  return {
    agentMessage: `Search returned ${ids.length} candidate(s): ${ids.join(', ')}.`,
    leadInstruction: 'Use returned product ids only. Call Recommendation only if ranking/personalization is needed.',
    allowedClaims: [`Candidate product ids: ${ids.join(', ')}`],
    forbiddenClaims: ['Do not mention products outside returned ids.'],
  };
}

function emptyResult(query: string, status: SearchAgentResult['status'], message: string): SearchAgentResult {
  return {
    status,
    query,
    usedLanes: [],
    matchType: 'none',
    candidates: [],
    issues: [{ code: status, message, recoverable: true }],
    handoff: {
      agentMessage: message,
      leadInstruction: 'Ask for a clearer search query.',
      allowedClaims: [message],
      forbiddenClaims: ['Do not invent products.'],
    },
  };
}

function candidate(product: Product, score: number, confidence: number, matchedFields: string[], evidence: string[]): SearchAgentCandidate {
  return {
    productId: product.id,
    score,
    confidence,
    matchedFields,
    evidence: [...evidence, `product:${product.id}`, `inventory=${product.inventory}`, `price=${product.price}`],
  };
}

function matchesAttributes(product: Product, attributes: Record<string, string | number | boolean> | undefined): boolean {
  if (!attributes) return true;
  return Object.entries(attributes).every(([key, value]) => includesNormalized(String(product.attributes[key] ?? ''), String(value)));
}

function productFields(product: Product): Record<string, string> {
  return {
    id: stripVietnamese(normalize(product.id)),
    title: stripVietnamese(normalize(product.title)),
    brand: stripVietnamese(normalize(product.brand)),
    category: stripVietnamese(normalize(product.category)),
    description: stripVietnamese(normalize(product.description)),
    attributes: stripVietnamese(normalize(Object.values(product.attributes).join(' '))),
  };
}

function productSearchText(product: Product): string {
  return [
    product.title,
    product.brand,
    product.category,
    product.description,
    Object.entries(product.attributes).map(([key, value]) => `${key}: ${value}`).join('; '),
  ].filter(Boolean).join('\n');
}

function queryTokens(value: string): string[] {
  return stripVietnamese(value).split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set(['san', 'pham', 'cai', 'mau', 'cho', 'toi', 'minh', 'muon', 'can', 'tim', 'kiem', 'co', 'khong', 'duoi', 'tren', 'tam', 'khoang', 'trieu', 'tr']);

type RelatedProductFamily = {
  key: 'air_purifier' | 'air_cooling' | 'rice_cooker' | 'air_fryer' | 'vacuum' | 'camera' | 'health_scale' | 'personal_care' | 'blender';
  expansion: string;
  intentPattern: RegExp;
  productPattern: RegExp;
};

function detectRelatedProductFamily(normalizedQuery: string): RelatedProductFamily | undefined {
  const asciiQuery = stripVietnamese(normalizedQuery);
  return PRODUCT_FAMILIES.find((family) => family.intentPattern.test(asciiQuery));
}

function productMatchesFamily(product: Product, family: RelatedProductFamily): boolean {
  return family.productPattern.test(stripVietnamese(normalize(productSearchText(product))));
}

const PRODUCT_FAMILIES: RelatedProductFamily[] = [
  {
    key: 'rice_cooker',
    expansion: 'noi com dien rice cooker nau com bep dien',
    intentPattern: /\b(noi com|rice cooker)\b/,
    productPattern: /\b(noi com|rice cooker)\b/,
  },
  {
    key: 'air_fryer',
    expansion: 'noi chien lo chien khong dau air fryer chien nuong nha bep cua kinh',
    intentPattern: /\b(noi chien|lo chien|air fryer)\b/,
    productPattern: /\b(noi chien|lo chien|air fryer)\b/,
  },
  {
    key: 'air_cooling',
    expansion: 'quat dieu hoa quat lam mat lam mat phong',
    intentPattern: /\b(may lanh|dieu hoa|air conditioner|cooling|lam mat|quat dieu hoa|quat lam mat|quat|nong|oi buc|oi nong|bi nong|bi oi|mua nong|tiet kiem dien)\b/,
    productPattern: /\b(quat|quat dieu hoa|quat lam mat|lam mat bay hoi|cooling|cool|30 lit|40 lit|45 lit|50 lit|remote|dao gio)\b/,
  },
  {
    key: 'vacuum',
    expansion: 'may hut bui robot hut bui hut bui cam tay ve sinh nha cua lau nha',
    intentPattern: /\b(hut bui|hut bui cam tay|robot hut|lau nha|vacuum|nha sach|lam sach nha|lam sach san|don nha|don dep|san nha|san gach|nen nha|long thu cung|toc rung|meo|thu cung|ve sinh nha)\b/,
    productPattern: /\b(hut bui|hut bui cam tay|robot hut|ve sinh|lau nha|vacuum)\b/,
  },
  {
    key: 'air_purifier',
    expansion: 'may loc khong khi may loc kk loc bui hepa pm2 5 phong ngu phong khach tre so sinh',
    intentPattern: /\b(may loc|loc kk|may loc kk|loc khong khi|air purifier|bui|min|pm2|di ung|khong khi|mui|tre so sinh|be so sinh|em be|nom am|phong kin|phong ngu)\b/,
    productPattern: /\b(may loc|loc khong khi|loc khi|khong khi|hepa|pm2|air purifier)\b/,
  },
  {
    key: 'camera',
    expansion: 'camera wifi an ninh quan sat trong nha cam bien cua bao qua dien thoai nha thue it khoan duc',
    intentPattern: /\b(camera|quan sat|an ninh|smart home|bao dong|canh bao|bao qua dien thoai|bao ve dien thoai|cua ra vao|cam bien|cam bien cua|qua app|dien thoai|it khoan duc|nha thue)\b/,
    productPattern: /\b(camera|wifi|an ninh|cam bien cua|cam bien|bao dong|doorbell|chuong hinh|aqara|tp-link|tapo|ezviz|imou|homekit|zigbee|matter|thread)\b/,
  },
  {
    key: 'health_scale',
    expansion: 'can suc khoe can thong minh theo doi co the',
    intentPattern: /\b(can suc khoe|can thong minh|body composition|scale|nguoi lon tuoi|suc khoe|chu to|it thao tac|de dung)\b/,
    productPattern: /\b(can suc khoe|can thong minh|body composition|scale)\b/,
  },
  {
    key: 'personal_care',
    expansion: 'cham soc ca nhan may say toc ban chai dien can suc khoe qua tang bo me nho gon di cong tac',
    intentPattern: /\b(cham soc ca nhan|bo me|qua tang nho gon|qua gia dung|do gia dung huu dung|goi y qua|goi y mon|nen mua gi|mua gi|cong tac|du lich|may say toc|say toc|ban chai dien)\b/,
    productPattern: /\b(cham soc ca nhan|may say toc|say toc|ban chai|can suc khoe|can thong minh|body composition|oral|beurer|dyson|philips hp|panasonic eh)\b/,
  },
  {
    key: 'blender',
    expansion: 'may xay sinh to may ep xay da nha bep blender',
    intentPattern: /\b(may xay|may ep|xay sinh to|xay da|sinh to|blender)\b/,
    productPattern: /\b(may xay|may ep|xay sinh to|xay da|sinh to|blender)\b/,
  },
];

function includesNormalized(value: string, expected: string): boolean {
  return normalize(value).includes(normalize(expected));
}

function toProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    title: String(row.title),
    brand: String(row.brand),
    category: String(row.category),
    price: Number(row.price),
    currency: 'VND',
    inventory: Number(row.inventory),
    attributes: row.attributes && typeof row.attributes === 'object' ? row.attributes as Record<string, string> : {},
    description: String(row.description),
  };
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function stripVietnamese(value: string): string {
  return normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd');
}
