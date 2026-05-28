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

    const searchedProducts = await this.catalogService.searchProducts(query);
    const excludedProductIds = buildExcludedProductIds(params.analysis, params.memoryInvestigation, params.cart);
    const candidates = params.analysis.retrievalMode === 'alternatives'
      ? searchedProducts.filter((product) => !excludedProductIds.includes(product.id))
      : searchedProducts;
    const cappedCandidates = candidates.slice(0, 8);
    const selectedProducts = ensureProductSelection(selectProductsForRequest(params.message, cappedCandidates, params.analysis), cappedCandidates, params.message, params.analysis);

    return {
      mode: params.analysis.retrievalMode,
      query,
      candidates: cappedCandidates,
      selectedProducts,
      excludedProductIds,
      evidence: [
        `Query: ${query}`,
        `Candidates: ${cappedCandidates.length}`,
        selectedProducts.length ? `Selected: ${selectedProducts.map((product) => product.title).join(', ')}` : 'Không chọn được sản phẩm phù hợp.',
      ],
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

function extractProductIds(value: string): string[] {
  return uniqueStrings(value.match(/prod_[a-z0-9_]+/gi)?.map((productId) => productId.toLocaleLowerCase('vi-VN')) ?? []);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}
