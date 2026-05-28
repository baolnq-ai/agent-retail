import { Injectable } from '@nestjs/common';
import type { Cart } from '../../models/commerce.models.js';
import type { KnowledgeDocument, Product } from '../../models/catalog.models.js';
import type { CartManagerResult, ProductManagerResult, RecommendationAgentResult, UserAnalysis } from '../../models/agent-execution.models.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';
import { PromptSettingsService } from '../prompt-settings.service.js';

@Injectable()
export class RecommendationAgentService {
  constructor(
    private readonly modelGatewayService?: ModelGatewayService,
    private readonly agentHistoryService?: AgentHistoryService,
    private readonly promptSettingsService?: PromptSettingsService,
  ) {}

  async planPresentation(params: {
    userId?: string;
    message: string;
    analysis: UserAnalysis;
    productManagerResult: ProductManagerResult;
    cartManagerResult: CartManagerResult;
    knowledge: KnowledgeDocument[];
    cart: Cart;
  }): Promise<RecommendationAgentResult> {
    const fallback = buildRulePresentation(params);
    if (!this.modelGatewayService || process.env.AGENT_LLM_RECOMMENDATION !== '1') return { ...fallback, decisionSource: 'fallback' };
    const history = await this.agentHistoryService?.getHistory(params.userId, 'recommendation-agent');
    try {
      const response = await this.modelGatewayService.chat({
        maxTokens: 360,
        temperature: 0,
        messages: [
          { role: 'system', content: await this.promptSettingsService?.getContent('recommendation-system') || 'Bạn là recommendation-agent. Trả JSON thuần, không markdown. Quyết định sản phẩm nào được phép hiển thị ở product_list và sales-agent được phép nhắc. Không chọn productId ngoài danh sách allowedProductIds.' },
          { role: 'user', content: buildRecommendationPrompt(params, fallback, history?.summary) },
        ],
      });
      const result = readRecommendationResult(response.content, params, fallback);
      await this.agentHistoryService?.appendHistory(params.userId, 'recommendation-agent', {
        status: result.status === 'approved' ? 'completed' : 'skipped',
        inputSummary: `${params.analysis.intent}/${params.productManagerResult.mode}`,
        outputSummary: `${result.presentationIntent}: ${result.products.map((product) => product.title).join(', ') || 'no products'}`,
        complaints: result.complaints,
        source: 'llm',
      });
      return { ...result, decisionSource: 'llm' };
    } catch (error) {
      await this.agentHistoryService?.appendHistory(params.userId, 'recommendation-agent', {
        status: 'error',
        inputSummary: `${params.analysis.intent}/${params.productManagerResult.mode}`,
        outputSummary: fallback.displayReason,
        complaints: [error instanceof Error ? error.message.slice(0, 180) : 'LLM recommendation failed'],
        source: 'fallback',
      });
      return { ...fallback, decisionSource: 'fallback' };
    }
  }
}

function buildRulePresentation(params: {
  analysis: UserAnalysis;
  productManagerResult: ProductManagerResult;
  cartManagerResult: CartManagerResult;
  knowledge: KnowledgeDocument[];
  cart: Cart;
}): RecommendationAgentResult {
    const completedCartAction = params.cartManagerResult.toolResults.some((toolResult) => toolResult.status === 'completed' && toolResult.productIds.length > 0);
    const blockedCartAction = Boolean(params.analysis.cartOperation && params.cartManagerResult.actionResults.length > 0 && !completedCartAction);

    if (blockedCartAction) {
      return blocked('Thao tác giỏ hàng chưa hoàn tất nên không hiển thị đề xuất mới.', params.productManagerResult);
    }

    if (params.analysis.intent === 'policy' || params.analysis.intent === 'cart_status' || params.analysis.intent === 'smalltalk' || params.analysis.intent === 'confirm_pending' || params.analysis.intent === 'cancel_pending') {
      return approved([], 'none', 'Ngữ cảnh không cần khung đề xuất sản phẩm.', params.productManagerResult);
    }

    if (params.analysis.intent === 'cart_action') {
      if (!completedCartAction) return approved([], 'none', 'Cart-agent không có thao tác sản phẩm đã hoàn tất.', params.productManagerResult);
      const products = productsFromIds(params.cartManagerResult.toolResults.flatMap((toolResult) => toolResult.productIds), params.productManagerResult.candidates);
      return approved(products, products.length ? 'cart_target' : 'none', products.length ? 'Hiển thị đúng sản phẩm vừa được cart-agent thao tác.' : 'Cart-agent không trả về sản phẩm để hiển thị.', params.productManagerResult);
    }

    if (params.analysis.intent === 'compare') {
      const products = params.productManagerResult.selectedProducts.slice(0, 2);
      if (products.length < 2) return blocked('So sánh cần tối thiểu 2 sản phẩm đã chọn; không render rail khi thiếu dữ liệu.', params.productManagerResult);
      return approved(products, 'compare', 'Hiển thị đúng 2 sản phẩm đang được so sánh.', params.productManagerResult);
    }

    if (params.analysis.intent === 'recommend' || params.analysis.intent === 'product_detail') {
      const limit = params.analysis.intent === 'product_detail' ? 1 : resolveRecommendationLimit(params.analysis, params.productManagerResult);
      const products = params.productManagerResult.selectedProducts.slice(0, limit);
      if (!params.analysis.shouldShowProducts || products.length === 0 || params.productManagerResult.confidence < 0.5) {
        return blocked('Product-manager chưa chọn được sản phẩm đủ tin cậy để hiển thị.', params.productManagerResult);
      }
      return approved(products, params.analysis.intent === 'product_detail' ? 'detail' : 'recommend', 'Hiển thị đúng danh sách product-manager chọn cho nhu cầu hiện tại.', params.productManagerResult);
    }

    return approved([], 'none', 'Không có ngữ cảnh đề xuất sản phẩm.', params.productManagerResult);
}

function resolveRecommendationLimit(analysis: UserAnalysis, productManagerResult: ProductManagerResult): number {
  if (productManagerResult.mode === 'alternatives' || analysis.references.anotherOption || analysis.references.allLastRecommendations) return 4;
  return 3;
}

function buildRecommendationPrompt(params: {
  message: string;
  analysis: UserAnalysis;
  productManagerResult: ProductManagerResult;
  cartManagerResult: CartManagerResult;
}, fallback: RecommendationAgentResult, historySummary: string | undefined): string {
  const allowedProducts = params.productManagerResult.candidates.map((product) => ({ id: product.id, title: product.title, price: product.price, category: product.category, brand: product.brand }));
  return JSON.stringify({
    outputSchema: {
      shouldShowProducts: 'boolean',
      productIds: 'array of product ids from allowedProductIds only',
      presentationIntent: 'recommend|compare|detail|cart_target|none',
      displayReason: 'Vietnamese short reason',
      status: 'approved|needs_revision|blocked',
      complaints: 'string[]',
    },
    message: params.message,
    analysis: params.analysis,
    productManager: {
      mode: params.productManagerResult.mode,
      confidence: params.productManagerResult.confidence,
      selectedProductIds: params.productManagerResult.selectedProducts.map((product) => product.id),
      candidates: allowedProducts,
      evidence: params.productManagerResult.evidence,
    },
    cartToolResults: params.cartManagerResult.toolResults,
    agentHistory: historySummary,
    prePlan: {
      shouldShowProducts: fallback.shouldShowProducts,
      productIds: fallback.products.map((product) => product.id),
      presentationIntent: fallback.presentationIntent,
      displayReason: fallback.displayReason,
      status: fallback.status,
      complaints: fallback.complaints,
    },
    rules: [
      'Nếu intent là compare, chỉ show đúng 2 sản phẩm đang so sánh; thiếu 2 thì blocked.',
      'Nếu policy/cart_status/smalltalk thì không show products.',
      'Nếu recommend hoặc product_detail thì cards phải là đúng sản phẩm sales-agent sẽ nhắc.',
      'Không chọn quá 3 sản phẩm cho recommend, 1 cho detail, 2 cho compare.',
    ],
  });
}

function readRecommendationResult(content: string, params: { productManagerResult: ProductManagerResult }, fallback: RecommendationAgentResult): RecommendationAgentResult {
  const parsed = JSON.parse(stripJsonFence(content)) as { shouldShowProducts?: unknown; productIds?: unknown; presentationIntent?: unknown; displayReason?: unknown; status?: unknown; complaints?: unknown };
  const allowedProducts = params.productManagerResult.candidates;
  const productIds = Array.isArray(parsed.productIds) ? parsed.productIds.filter((item): item is string => typeof item === 'string') : fallback.products.map((product) => product.id);
  const parsedProducts = productsFromIds(productIds, allowedProducts);
  if (productIds.length !== parsedProducts.length) throw new Error('recommendation-agent selected product outside allowed scope');
  const products = parsedProducts.length > 0 ? parsedProducts : fallback.products;
  const presentationIntent = isPresentationIntent(parsed.presentationIntent) ? parsed.presentationIntent : fallback.presentationIntent;
  const status = isRecommendationStatus(parsed.status) ? parsed.status : fallback.status;
  const effectiveStatus = fallback.shouldShowProducts && products.length > 0 ? 'approved' : status;
  const displayReason = typeof parsed.displayReason === 'string' ? parsed.displayReason : fallback.displayReason;
  const complaints = Array.isArray(parsed.complaints) ? parsed.complaints.filter((item): item is string => typeof item === 'string') : fallback.complaints;
  return {
    shouldShowProducts: fallback.shouldShowProducts ? products.length > 0 : typeof parsed.shouldShowProducts === 'boolean' ? parsed.shouldShowProducts && products.length > 0 : false,
    products,
    presentationIntent,
    displayReason,
    mustMentionProductIds: products.map((product) => product.id),
    mustNotMentionProductIds: allowedProducts.filter((product) => !products.some((item) => item.id === product.id)).map((product) => product.id),
    evidence: [displayReason, ...params.productManagerResult.evidence],
    status: effectiveStatus,
    complaints,
  };
}

function stripJsonFence(content: string): string {
  return content.replace(/```json|```/gi, '').trim();
}

function isPresentationIntent(value: unknown): value is RecommendationAgentResult['presentationIntent'] {
  return value === 'recommend' || value === 'compare' || value === 'detail' || value === 'cart_target' || value === 'none';
}

function isRecommendationStatus(value: unknown): value is RecommendationAgentResult['status'] {
  return value === 'approved' || value === 'needs_revision' || value === 'blocked';
}

function approved(products: Product[], presentationIntent: RecommendationAgentResult['presentationIntent'], displayReason: string, productManagerResult: ProductManagerResult): RecommendationAgentResult {
  return {
    shouldShowProducts: products.length > 0,
    products,
    presentationIntent,
    displayReason,
    mustMentionProductIds: products.map((product) => product.id),
    mustNotMentionProductIds: productManagerResult.candidates.filter((product) => !products.some((item) => item.id === product.id)).map((product) => product.id),
    evidence: [displayReason, ...productManagerResult.evidence],
    status: 'approved',
    complaints: [],
  };
}

function blocked(reason: string, productManagerResult: ProductManagerResult): RecommendationAgentResult {
  return {
    shouldShowProducts: false,
    products: [],
    presentationIntent: 'none',
    displayReason: reason,
    mustMentionProductIds: [],
    mustNotMentionProductIds: productManagerResult.candidates.map((product) => product.id),
    evidence: [reason, ...productManagerResult.evidence],
    status: 'blocked',
    complaints: [reason],
  };
}

function productsFromIds(productIds: string[], products: Product[]): Product[] {
  const uniqueIds = [...new Set(productIds)];
  const productById = new Map(products.map((product) => [product.id, product]));
  return uniqueIds.map((productId) => productById.get(productId)).filter((product): product is Product => product !== undefined);
}
