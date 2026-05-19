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
    if (params.analysis.retrievalMode === 'none') {
      return { mode: 'none', query, candidates: [], selectedProducts: [], excludedProductIds: [], evidence: ['Không cần truy xuất sản phẩm.'], confidence: 0.8 };
    }

    if (params.analysis.retrievalMode === 'recent') {
      const selectedProducts = productsFromIds(params.analysis.references.resolvedProductIds ?? params.memoryInvestigation.referenceProductIds, params.allProducts);
      return {
        mode: 'recent',
        query,
        candidates: selectedProducts,
        selectedProducts: selectProductsForRequest(params.message, selectedProducts, params.analysis),
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
    const selectedProducts = selectProductsForRequest(params.message, cappedCandidates, params.analysis);

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

function selectProductsForRequest(message: string, products: Product[], analysis: UserAnalysis): Product[] {
  if (!analysis.shouldShowProducts && analysis.retrievalMode !== 'recent') return [];
  const normalizedMessage = normalize(message);
  const requestedCount = parseRequestedCount(normalizedMessage);
  const limit = requestedCount ?? (analysis.references.allLastRecommendations ? products.length : analysis.intent === 'compare' || wantsMultipleProducts(normalizedMessage) ? 2 : 1);
  return products.slice(0, Math.min(limit, products.length));
}

function parseRequestedCount(normalizedMessage: string): number | undefined {
  const numericMatch = normalizedMessage.match(/(?:tìm|gợi ý|đề xuất|cho|lấy)?\s*(\d+)\s*(?:sản phẩm|món|cái|lựa chọn)?/);
  if (numericMatch) return Math.min(6, Math.max(1, Number.parseInt(numericMatch[1], 10)));
  if (/một|1 cái|1 sản phẩm/.test(normalizedMessage)) return 1;
  if (/hai|2 cái|2 sản phẩm/.test(normalizedMessage)) return 2;
  if (/ba|3 cái|3 sản phẩm/.test(normalizedMessage)) return 3;
  return undefined;
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

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}
