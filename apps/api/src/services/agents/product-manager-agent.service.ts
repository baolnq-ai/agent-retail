import { Injectable } from '@nestjs/common';
import type { Cart } from '../../models/commerce.models.js';
import type { Product } from '../../models/catalog.models.js';
import type { MemoryInvestigationResult, ProductManagerResult, UserAnalysis } from '../../models/agent-execution.models.js';
import { CatalogService } from '../catalog.service.js';

@Injectable()
export class ProductManagerAgentService {
  constructor(private readonly catalogService: CatalogService) {}

  async resolveProducts(params: { message: string; analysis: UserAnalysis; memoryInvestigation: MemoryInvestigationResult; cart: Cart; allProducts: Product[] }): Promise<ProductManagerResult> {
    const query = buildRetrievalQuery(params.message, params.analysis, params.memoryInvestigation);
    const explicitProducts = productsFromIds(extractProductIds(params.message), params.allProducts);
    if (explicitProducts.length > 0) {
      const selectedProducts = ensureProductSelection(selectProductsForRequest(params.message, explicitProducts, params.analysis), explicitProducts, params.message, params.analysis);
      return {
        mode: params.analysis.retrievalMode === 'none' ? 'fresh' : params.analysis.retrievalMode,
        query,
        candidates: explicitProducts,
        selectedProducts,
        excludedProductIds: [],
        evidence: explicitProducts.map((product) => `Explicit product id resolved: ${product.id}`),
        confidence: 0.96,
      };
    }
    const cartHistoryProductIds = productIdsForCartHistoryAction(params.analysis, params.memoryInvestigation, params.cart);
    if (params.analysis.intent === 'cart_action' && cartHistoryProductIds.length > 0) {
      const selectedProducts = productsFromIds(cartHistoryProductIds, params.allProducts);
      return {
        mode: 'recent',
        query,
        candidates: selectedProducts,
        selectedProducts: ensureProductSelection(selectProductsForRequest(params.message, selectedProducts, params.analysis), selectedProducts, params.message, params.analysis),
        excludedProductIds: [],
        evidence: selectedProducts.map((product) => `Cart/history resolved: ${product.title}`),
        confidence: selectedProducts.length > 0 ? Math.max(params.memoryInvestigation.confidence, 0.76) : 0.25,
      };
    }

    if (params.analysis.retrievalMode === 'none') {
      return { mode: 'none', query, candidates: [], selectedProducts: [], excludedProductIds: [], evidence: ['Không cần truy xuất sản phẩm.'], confidence: 0.8 };
    }

    if (params.analysis.retrievalMode === 'recent') {
      const selectedProducts = productsFromIds(params.analysis.references.resolvedProductIds ?? params.memoryInvestigation.referenceProductIds, params.allProducts);
      return {
        mode: 'recent',
        query,
        candidates: selectedProducts,
        selectedProducts: ensureProductSelection(selectProductsForRequest(params.message, selectedProducts, params.analysis), selectedProducts, params.message, params.analysis),
        excludedProductIds: [],
        evidence: selectedProducts.map((product) => `Memory resolved: ${product.title}`),
        confidence: selectedProducts.length > 0 ? params.memoryInvestigation.confidence : 0.25,
      };
    }

    const relatedFamily = detectRelatedProductFamily(params.message);
    const searchQuery = relatedFamily ? `${query} ${relatedFamily.expansion}` : query;
    const searchedProducts = await this.catalogService.searchProducts(searchQuery);
    const excludedProductIds = buildExcludedProductIds(params.analysis, params.memoryInvestigation, params.cart);
    const familyScopedProducts = relatedFamily ? searchedProducts.filter((product) => productMatchesFamily(product, relatedFamily)) : searchedProducts;
    const candidates = params.analysis.retrievalMode === 'alternatives'
      ? familyScopedProducts.filter((product) => !excludedProductIds.includes(product.id))
      : familyScopedProducts;
    const cappedCandidates = candidates.slice(0, 8);
    const selectedProducts = ensureProductSelection(selectProductsForRequest(params.message, cappedCandidates, params.analysis), cappedCandidates, params.message, params.analysis);

    return {
      mode: params.analysis.retrievalMode,
      query,
      candidates: cappedCandidates,
      selectedProducts,
      excludedProductIds,
      evidence: [
        `Query: ${searchQuery}`,
        relatedFamily ? `Related family: ${relatedFamily.key}` : '',
        `Candidates: ${cappedCandidates.length}`,
        selectedProducts.length ? `Selected: ${selectedProducts.map((product) => product.title).join(', ')}` : 'Không chọn được sản phẩm phù hợp.',
      ].filter(Boolean),
      confidence: selectedProducts.length > 0 ? 0.78 : 0.3,
    };
  }
}

function buildRetrievalQuery(message: string, analysis: UserAnalysis, memoryInvestigation: MemoryInvestigationResult): string {
  if (analysis.intent === 'cart_action' && analysis.references.productName) return analysis.references.productName;
  if (analysis.retrievalMode === 'alternatives') return `${message} lựa chọn khác`;
  if (analysis.retrievalMode === 'recent' && memoryInvestigation.summary) return `${message}\n${memoryInvestigation.summary}`;
  return message;
}

function buildExcludedProductIds(analysis: UserAnalysis, memoryInvestigation: MemoryInvestigationResult, cart: Cart): string[] {
  if (analysis.retrievalMode !== 'alternatives') return [];
  return uniqueStrings([
    ...cart.items.map((item) => item.productId),
    ...memoryInvestigation.lastSelectedProductIds,
  ]);
}

function productIdsForCartHistoryAction(analysis: UserAnalysis, memoryInvestigation: MemoryInvestigationResult, cart: Cart): string[] {
  if (analysis.intent !== 'cart_action') return [];
  if (analysis.references.resolvedProductIds?.length) return analysis.references.resolvedProductIds;
  if (analysis.cartOperation === 'remove' && (analysis.references.useCurrentCartItem || analysis.references.demonstrative) && cart.items.length === 1) return [cart.items[0].productId];
  if (analysis.cartOperation === 'add' && memoryInvestigation.referenceProductIds.length) return memoryInvestigation.referenceProductIds;
  if (analysis.cartOperation === 'add' && memoryInvestigation.lastSelectedProductIds.length) return memoryInvestigation.lastSelectedProductIds;
  if (analysis.cartOperation === 'remove' && memoryInvestigation.lastCartActionProductIds.length) return memoryInvestigation.lastCartActionProductIds;
  return [];
}

function selectProductsForRequest(message: string, products: Product[], analysis: UserAnalysis): Product[] {
  if (!analysis.shouldShowProducts && analysis.retrievalMode !== 'recent') return [];
  const normalizedMessage = normalize(message);
  const requestedCount = analysis.intent === 'cart_action' && !analysis.references.allLastRecommendations ? 1 : parseRequestedCount(normalizedMessage);
  const limit = requestedCount ?? resolveDefaultProductLimit(normalizedMessage, products, analysis);
  return products.slice(0, Math.min(limit, products.length));
}

function ensureProductSelection(selectedProducts: Product[], candidates: Product[], message: string, analysis: UserAnalysis): Product[] {
  if (selectedProducts.length > 0 || candidates.length === 0) return selectedProducts;
  if (!isProductIntent(analysis.intent)) return selectedProducts;
  const normalizedMessage = normalize(message);
  const limit = Math.min(resolveDefaultProductLimit(normalizedMessage, candidates, analysis), candidates.length);
  return candidates.slice(0, Math.max(1, limit));
}

function isProductIntent(intent: UserAnalysis['intent']): boolean {
  return intent === 'recommend' || intent === 'compare' || intent === 'product_detail';
}

function resolveDefaultProductLimit(normalizedMessage: string, products: Product[], analysis: UserAnalysis): number {
  if (analysis.references.allLastRecommendations) return products.length;
  if (analysis.intent === 'compare') return 2;
  if (wantsMoreProducts(normalizedMessage)) return 4;
  if (wantsMultipleProducts(normalizedMessage)) return 2;
  return 1;
}

function parseRequestedCount(normalizedMessage: string): number | undefined {
  if (/\b\d+(?:[,.]\d+)?\s*(?:triệu|tr|k|nghìn|ngàn|đ|vnd|vnđ)\b/.test(normalizedMessage)) {
    const explicitCount = normalizedMessage.match(/(?:tìm|gợi ý|đề xuất|cho|lấy)\s*(\d+)\s*(?:sản phẩm|món|cái|lựa chọn)/);
    return explicitCount ? Math.min(6, Math.max(1, Number.parseInt(explicitCount[1], 10))) : undefined;
  }
  const numericMatch = normalizedMessage.match(/(?:tìm|gợi ý|đề xuất|cho|lấy)\s*(\d+)\s*(?:sản phẩm|món|cái|lựa chọn)|(\d+)\s*(?:sản phẩm|món|cái|lựa chọn)/);
  if (numericMatch) return Math.min(6, Math.max(1, Number.parseInt(numericMatch[1] ?? numericMatch[2], 10)));
  if (/một|1 cái|1 sản phẩm/.test(normalizedMessage)) return 1;
  if (/hai|2 cái|2 sản phẩm/.test(normalizedMessage)) return 2;
  if (/ba|3 cái|3 sản phẩm/.test(normalizedMessage)) return 3;
  return undefined;
}

function wantsMoreProducts(normalizedMessage: string): boolean {
  return /cho nhiều|nhiều hơn|xem thêm|gợi ý thêm|thêm lựa chọn|thêm gợi ý/.test(normalizedMessage);
}

function wantsMultipleProducts(normalizedMessage: string): boolean {
  return /cho nhiều|nhiều hơn|vài|một vài|các sản phẩm|danh sách|lựa chọn|sản phẩm khác/.test(normalizedMessage);
}

function productsFromIds(productIds: string[], products: Product[]): Product[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  return uniqueStrings(productIds).map((productId) => productById.get(productId)).filter((product): product is Product => product !== undefined);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

type RelatedProductFamily = {
  key: 'air_purifier' | 'air_cooling' | 'rice_cooker' | 'air_fryer' | 'vacuum' | 'camera' | 'health_scale' | 'personal_care' | 'blender';
  expansion: string;
  productPattern: RegExp;
  intentPattern: RegExp;
};

function detectRelatedProductFamily(message: string): RelatedProductFamily | undefined {
  const normalizedMessage = stripVietnamese(normalize(message));
  return PRODUCT_FAMILIES.find((family) => family.intentPattern.test(normalizedMessage));
}

function productMatchesFamily(product: Product, family: RelatedProductFamily): boolean {
  return family.productPattern.test(stripVietnamese(normalize(`${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`)));
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
    expansion: 'noi chien khong dau air fryer chien nuong nha bep',
    intentPattern: /\b(noi chien|air fryer)\b/,
    productPattern: /\b(noi chien|air fryer)\b/,
  },
  {
    key: 'air_cooling',
    expansion: 'quat dieu hoa quat lam mat lam mat phong',
    intentPattern: /\b(may lanh|dieu hoa|air conditioner|cooling|lam mat|quat|nong|oi|hoi bi|bi nong|bi oi|mua nong|tiet kiem dien)\b/,
    productPattern: /\b(quat|quat dieu hoa|quat lam mat|lam mat bay hoi|cooling|cool|30 lit|40 lit|45 lit|50 lit|remote|dao gio)\b/,
  },
  {
    key: 'vacuum',
    expansion: 'may hut bui robot hut bui ve sinh nha cua lau nha',
    intentPattern: /\b(hut bui|robot hut|lau nha|vacuum|nha sach|lam sach nha|lam sach san|don nha|don dep|san nha|san gach|nen nha|long thu cung|toc rung|meo|thu cung|ve sinh nha)\b/,
    productPattern: /\b(hut bui|robot hut|ve sinh|lau nha|vacuum)\b/,
  },
  {
    key: 'air_purifier',
    expansion: 'may loc khong khi loc bui hepa pm2 5 phong ngu phong khach',
    intentPattern: /\b(may loc|loc khong khi|air purifier|bui|min|pm2|di ung|khong khi|mui|tre so sinh|em be|nom am|phong kin|phong ngu)\b/,
    productPattern: /\b(may loc|loc khong khi|loc khi|khong khi|hepa|pm2|air purifier)\b/,
  },
  {
    key: 'camera',
    expansion: 'camera wifi an ninh quan sat trong nha',
    intentPattern: /\b(camera|quan sat|an ninh|smart home|bao dong|canh bao|cua ra vao|cam bien|qua app|dien thoai)\b/,
    productPattern: /\b(camera|wifi|an ninh|cam bien cua|bao dong|doorbell|chuong hinh|aqara|tp-link|tapo|ezviz|imou|homekit|zigbee|matter|thread)\b/,
  },
  {
    key: 'health_scale',
    expansion: 'can suc khoe can thong minh theo doi co the',
    intentPattern: /\b(can suc khoe|can thong minh|body composition|scale|nguoi lon tuoi|suc khoe|chu to|it thao tac|de dung)\b/,
    productPattern: /\b(can suc khoe|can thong minh|body composition|scale)\b/,
  },
  {
    key: 'personal_care',
    expansion: 'cham soc ca nhan may say toc ban chai dien can suc khoe qua tang bo me',
    intentPattern: /\b(cham soc ca nhan|bo me|qua tang nho gon|cong tac|du lich|may say toc|ban chai dien)\b/,
    productPattern: /\b(cham soc ca nhan|may say toc|say toc|ban chai|can suc khoe|can thong minh|body composition|oral|beurer|dyson|philips hp|panasonic eh)\b/,
  },
  {
    key: 'blender',
    expansion: 'may xay sinh to may ep xay da nha bep',
    intentPattern: /\b(may xay|may ep|xay sinh to|blender)\b/,
    productPattern: /\b(may xay|may ep|xay sinh to|blender)\b/,
  },
];

function extractProductIds(value: string): string[] {
  return uniqueStrings(value.match(/prod_[a-z0-9_]+/gi)?.map((productId) => productId.toLocaleLowerCase('vi-VN')) ?? []);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function stripVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
