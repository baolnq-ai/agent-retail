import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AgentOrchestratorService, detectSalesIntent, type SalesAgentIntent } from './agent-orchestrator.service.js';
import type { KnowledgeDocument, Product } from '../models/catalog.models.js';
import type { AgentChatRequest, AgentChatResponse, AgentMessageBlock, AgentTrace, AgentTraceAgent, AgentTraceGraphEdge, AgentTraceNode } from '../models/agent.models.js';
import { CatalogService } from './catalog.service.js';
import { CommerceService } from './commerce.service.js';
import type { Cart } from '../models/commerce.models.js';
import { ChatMemoryService, type ChatMemoryContext } from './chat-memory.service.js';
import { KnowledgeService } from './knowledge.service.js';
import { ModelGatewayService } from './model-gateway.service.js';
import { AgentTraceService } from './agent-trace.service.js';
import type { AgentPipelineEvent, CartToolResult, MemoryAgentResult, ProductManagerResult, RecommendationAgentResult, UserAnalysis } from '../models/agent-execution.models.js';
import { CartManagerAgentService } from './agents/cart-manager-agent.service.js';
import { MemoryAgentService } from './agents/memory-agent.service.js';
import { ProductManagerAgentService } from './agents/product-manager-agent.service.js';
import { RecommendationAgentService } from './agents/recommendation-agent.service.js';
import { SalesEvaluatorAgentService } from './agents/sales-evaluator-agent.service.js';
import { UserAnalysisAgentService } from './agents/user-analysis-agent.service.js';

export type AgentStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; content: string }
  | { type: 'final'; response: AgentChatResponse }
  | { type: 'error'; message: string };

interface PreparedChat {
  messageId: string;
  requestMessage: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  products: Product[];
  selectedProducts: Product[];
  recommendationResult: RecommendationAgentResult;
  knowledge: KnowledgeDocument[];
  cart: Cart;
  actionResult?: string;
  actionResults: string[];
  actionTraceItems: AgentTrace['cart']['actions'];
  pipelineEvents: AgentPipelineEvent[];
  toolResults: CartToolResult[];
  userAnalysis: UserAnalysis;
  userId?: string;
  cartId: string;
  diagnostics: {
    embeddingDimensions: number;
    rerankTopScore: number;
    contextDocuments: number;
  };
  trace: AgentTrace;
}

@Injectable()
export class AgentService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly knowledgeService: KnowledgeService,
    private readonly commerceService: CommerceService,
    private readonly modelGatewayService: ModelGatewayService,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly agentTraceService: AgentTraceService,
    private readonly memoryAgentService: MemoryAgentService,
    private readonly productManagerAgentService: ProductManagerAgentService,
    private readonly recommendationAgentService: RecommendationAgentService,
    private readonly salesEvaluatorAgentService: SalesEvaluatorAgentService,
    private readonly userAnalysisAgentService: UserAnalysisAgentService,
    private readonly cartManagerAgentService: CartManagerAgentService,
  ) {}

  async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    const prepared = await this.prepareChat(request);
    const modelResponse = await this.modelGatewayService.chat({
      messages: prepared.messages,
      maxTokens: 260,
      temperature: 0.1,
    });

    const content = await this.reviseSalesContent(prepared, cleanAssistantText(modelResponse.content, mergeProducts(prepared.products, prepared.recommendationResult.products)));
    const response = this.buildResponse(prepared, content, modelResponse.model);
    await this.chatMemoryService.saveTurn({
      userId: prepared.userId,
      cartId: prepared.cartId,
      userMessage: prepared.requestMessage,
      assistantResponse: response,
      products: prepared.selectedProducts,
    });
    return response;
  }

  async *chatStream(request: AgentChatRequest): AsyncGenerator<AgentStreamEvent> {
    yield { type: 'status', message: 'Đang phân tích nhu cầu' };
    const prepared = await this.prepareChat(request, (message) => ({ type: 'status', message }));
    let content = '';
    let model = '';

    yield { type: 'status', message: 'Đang gọi LLM và stream token' };
    for await (const chunk of this.modelGatewayService.streamChat({
      messages: prepared.messages,
      maxTokens: 260,
      temperature: 0.1,
    })) {
      content += chunk.content;
      model = chunk.model ?? model;
      yield { type: 'token', content: chunk.content };
    }

    const cleanedContent = cleanAssistantText(content, mergeProducts(prepared.products, prepared.recommendationResult.products));
    const response = this.buildResponse(prepared, cleanedContent, model || 'streaming-model');
    await this.chatMemoryService.saveTurn({
      userId: prepared.userId,
      cartId: prepared.cartId,
      userMessage: prepared.requestMessage,
      assistantResponse: response,
      products: prepared.selectedProducts,
    });
    yield { type: 'final', response };
  }

  private async prepareChat(
    request: AgentChatRequest,
    createStatus?: (message: string) => AgentStreamEvent,
  ): Promise<PreparedChat> {
    const message = request.message.trim();
    const userId = request.user?.id;
    createStatus?.('Đang điều tra lịch sử và ngữ cảnh');
    const [memoryContext, initialCart, allProducts] = await Promise.all([
      this.chatMemoryService.getContext(userId),
      userId ? this.commerceService.getCurrentCart(userId) : Promise.resolve(emptyAccountCart()),
      this.catalogService.listProducts(),
    ]);
    const memoryInvestigation = await this.memoryAgentService.investigate({ userId, message });
    const userAnalysis = await this.userAnalysisAgentService.analyze({ userId, message, pendingPlan: memoryContext.pendingCartPlan, memoryInvestigation });
    createStatus?.('Đang tìm sản phẩm và chính sách phù hợp');
    const [productManagerResult, knowledge] = await Promise.all([
      this.productManagerAgentService.resolveProducts({ message, analysis: userAnalysis, memoryInvestigation, cart: initialCart, allProducts }),
      this.knowledgeService.searchKnowledge(message),
    ]);
    const orchestrationPlan = this.agentOrchestratorService.plan({ message, memory: memoryContext, cart: initialCart, candidates: productManagerResult.candidates });
    const actionProducts = mergeProducts(productManagerResult.candidates, productsFromCart(initialCart, allProducts));
    const cartId = initialCart.id;
    const intent = userAnalysis.intent === 'confirm_pending' || userAnalysis.intent === 'cancel_pending' ? 'cart_action' : userAnalysis.intent;
    const products = productManagerResult.candidates;
    const selectedProducts = productManagerResult.selectedProducts;
    const cartManagerResult = await this.cartManagerAgentService.run({
      message,
      userId,
      cart: initialCart,
      analysis: userAnalysis,
      products: actionProducts,
      selectedProducts,
      memoryContext,
    });
    const cart = cartManagerResult.cart;
    const recommendationResult = await this.recommendationAgentService.planPresentation({
      userId,
      message,
      analysis: userAnalysis,
      productManagerResult,
      cartManagerResult,
      knowledge,
      cart,
    });
    const actionResults = cartManagerResult.actionResults;
    const actionTraceItems = cartManagerResult.traceActions;
    const toolResults = cartManagerResult.toolResults;
    const pipelineEvents = [
      buildPipelineEvent('memory-agent', 'lookup', 'completed', `Loaded ${memoryContext.recentTurns.length} recent turns and ${memoryContext.preferences.length} preference keys.`),
      buildPipelineEvent('memory-agent', 'investigate', memoryInvestigation.confidence >= 0.5 ? 'completed' : 'skipped', memoryInvestigation.summary ? `Resolved history context: ${memoryInvestigation.summary.slice(0, 120)}` : `Reference products: ${memoryInvestigation.referenceProductIds.length}.`),
      buildPipelineEvent('user-analysis-agent', 'analyze', 'completed', `Intent ${userAnalysis.intent}${userAnalysis.cartOperation ? `, cart op ${userAnalysis.cartOperation}` : ''}, retrieval ${userAnalysis.retrievalMode}.`),
      buildPipelineEvent('product-manager-agent', 'lookup', productManagerResult.confidence >= 0.5 ? 'completed' : 'skipped', `Mode ${productManagerResult.mode}, candidates ${productManagerResult.candidates.length}, selected ${productManagerResult.selectedProducts.length}.`),
      buildPipelineEvent('recommendation-agent', 'handoff', recommendationResult.status === 'approved' ? 'completed' : 'skipped', `${recommendationResult.status}: ${recommendationResult.displayReason}`),
      ...cartManagerResult.pipeline,
    ];
    const actionResult = actionResults.join('\n');
    const contextDocuments = buildContextDocuments(selectedProducts, knowledge);
    const traceErrors: AgentTrace['errors'] = [];

    createStatus?.('Đang gọi embedding thật');
    const embeddings = await this.modelGatewayService.embed([message, ...contextDocuments]);

    createStatus?.('Đang rerank bằng model rerank thật');
    let reranked: Array<{ document: string; score: number }> = [];
    let fallbackRanking: 'lexical' | undefined;
    try {
      reranked = (await this.modelGatewayService.rerank(message, contextDocuments))
        .filter((item) => item.index >= 0 && item.index < contextDocuments.length);
      if (reranked.length === 0 && contextDocuments.length > 0) {
        fallbackRanking = 'lexical';
        traceErrors.push({ source: 'rerank', message: 'rerank returned no valid documents' });
      }
    } catch (error) {
      fallbackRanking = 'lexical';
      traceErrors.push({ source: 'rerank', message: error instanceof Error ? error.message : 'rerank failed' });
    }
    traceErrors.push(...cartManagerResult.errors);
    const rankedDocuments = reranked.length ? reranked.map((item) => item.document) : contextDocuments;
    const selectedContext = rankedDocuments.slice(0, 5).join('\n---\n');
    const messageId = randomUUID();
    const traceAgents = buildRuntimeAgents(orchestrationPlan.agents, recommendationResult, actionTraceItems);
    const trace = buildTrace({
      messageId,
      intent,
      agents: traceAgents,
      memoryContext,
      lexicalProducts: products,
      selectedProducts,
      recommendationResult,
      contextDocumentCount: contextDocuments.length,
      rerankScores: reranked.slice(0, 5).map((item) => item.score),
      fallbackRanking,
      memoryInvestigation,
      productManagerResult,
      actionTraceItems,
      cartBefore: initialCart,
      cartAfter: cart,
      actionResult,
      pipelineEvents,
      toolResults,
      pendingPlan: cartManagerResult.pendingPlan,
      traceErrors,
    });

    return {
      messageId,
      requestMessage: message,
      products,
      selectedProducts,
      recommendationResult,
      knowledge,
      cart,
      actionResult,
      actionResults,
      actionTraceItems,
      pipelineEvents,
      toolResults,
      userAnalysis,
      userId,
      cartId: cart.id,
      diagnostics: {
        embeddingDimensions: embeddings[0]?.length ?? 0,
        rerankTopScore: reranked[0]?.score ?? 0,
        contextDocuments: contextDocuments.length,
      },
      trace,
      messages: [
        {
          role: 'system',
          content: [
            'Bạn là nhân viên tư vấn bán hàng tiếng Việt cho website RetailHome.',
            'Chỉ dùng catalog/chính sách/giỏ hàng được cung cấp. Không bịa thông tin ngoài context.',
            'Không hiển thị mã sản phẩm nội bộ, không nhắc PRODUCT ID, không trả markdown phức tạp.',
            'Trả lời tự nhiên trong 3-5 câu ngắn. Recommendation-agent handoff là hợp đồng bắt buộc cho cả text và khung đề xuất.',
            'Chỉ nhắc đúng sản phẩm trong handoff phải nhắc; không nhắc sản phẩm nằm ngoài handoff.',
            'Nếu handoff shouldShowProducts=false, không được nói “gửi sản phẩm bên dưới” hoặc hứa có khung đề xuất.',
            'Nếu handoff presentationIntent=compare, nói rõ khung đề xuất là đúng các sản phẩm đang so sánh.',
            'Nếu không có sản phẩm được handoff, nói rõ chưa tìm thấy sản phẩm phù hợp và hỏi khách có muốn nới điều kiện không.',
            'Ưu tiên trả lời đúng nhu cầu mới nhất của khách; giỏ hàng chỉ là ngữ cảnh phụ trừ khi khách hỏi hoặc thao tác giỏ hàng.',
            'Nếu context có kết quả thao tác giỏ hàng, chỉ xác nhận đúng thao tác đã thực thi thật; không được nói đã thêm/xoá/cập nhật nếu tool result không có thao tác đó.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Nhu cầu khách: ${message}`,
            `Orchestrator agents: ${orchestrationPlan.agents.join(' → ')}`,
            `User-analysis-agent: intent=${userAnalysis.intent}${userAnalysis.cartOperation ? `, cartOperation=${userAnalysis.cartOperation}` : ''}, retrieval=${userAnalysis.retrievalMode}`,
            memoryInvestigation.referenceProductIds.length ? `Memory-agent resolved product references: ${memoryInvestigation.referenceProductIds.join(', ')}` : '',
            userAnalysis.needsClarification ? `Memory-agent clarification needed: ${userAnalysis.needsClarification}` : '',
            orchestrationPlan.memoryBrief ? `Memory-agent brief:\n${orchestrationPlan.memoryBrief}` : '',
            memoryContext.rollingSummary ? `Tóm tắt dài hạn:\n${memoryContext.rollingSummary}` : '',
            memoryContext.recentTurns.length ? `Lịch sử gần đây:\n${buildMemoryTurns(memoryContext.recentTurns)}` : '',
            memoryContext.preferences.length ? `Sở thích đã ghi nhận:\n${buildPreferenceContext(memoryContext.preferences)}` : '',
            actionResults.length ? `Kết quả thao tác đã thực thi thật:\n${actionResults.join('\n')}` : '',
            buildRecommendationInstruction(recommendationResult),
            recommendationResult.products.length ? `Sản phẩm được phép nhắc và đang hiển thị ở khung đề xuất (${recommendationResult.products.length} sản phẩm):\n${buildSelectedProductContext(recommendationResult.products)}` : 'Không có sản phẩm nào được phép nhắc hoặc hiển thị ở khung đề xuất.',
            `Context RAG/chính sách đã xếp hạng:\n${selectedContext}`,
            shouldIncludeCartContext(message, actionResult) ? `Giỏ hàng hiện tại:\n${buildCartContext(cart, products)}` : '',
          ].filter(Boolean).join('\n\n'),
        },
      ],
    };
  }

  private async reviseSalesContent(prepared: PreparedChat, content: string): Promise<string> {
    const completedCartAction = hasCompletedCartAction(prepared.toolResults);
    const evaluation = await this.salesEvaluatorAgentService.evaluate({
      userId: prepared.userId,
      message: prepared.requestMessage,
      draft: content,
      recommendationResult: prepared.recommendationResult,
      completedCartAction,
      actionResult: prepared.actionResult,
    });
    if (evaluation.pass) return content;

    const revision = await this.modelGatewayService.chat({
      maxTokens: 240,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Bạn là sales-agent. Viết lại câu trả lời tiếng Việt tự nhiên, không markdown phức tạp, không lộ chỉ dẫn nội bộ, chỉ nhắc đúng sản phẩm trong product rail.' },
        { role: 'user', content: buildSalesRevisionPrompt(prepared, content, evaluation.complaints, evaluation.revisedInstruction) },
      ],
    });
    const revisedContent = cleanAssistantText(revision.content, mergeProducts(prepared.products, prepared.recommendationResult.products));
    const secondEvaluation = await this.salesEvaluatorAgentService.evaluate({
      userId: prepared.userId,
      message: prepared.requestMessage,
      draft: revisedContent,
      recommendationResult: prepared.recommendationResult,
      completedCartAction,
      actionResult: prepared.actionResult,
    });
    return secondEvaluation.pass ? revisedContent : content;
  }

  private buildResponse(prepared: PreparedChat, content: string, model: string): AgentChatResponse {
    const completedCartAction = hasCompletedCartAction(prepared.toolResults);
    const blockedCartAction = Boolean(prepared.userAnalysis.cartOperation && prepared.actionResult && !completedCartAction);
    const recommendedProducts = prepared.recommendationResult.shouldShowProducts && !blockedCartAction ? prepared.recommendationResult.products : [];
    const rawFinalContent = blockedCartAction ? prepared.actionResult ?? content : prepared.actionResult && completedCartAction ? `${prepared.actionResult}\n${content}` : content;
    const finalContent = sanitizeRecommendationLeakage(rawFinalContent, recommendedProducts);
    const trace: AgentTrace = { ...prepared.trace, llm: { ...prepared.trace.llm, model } };
    const blocks: AgentMessageBlock[] = [
      { type: 'text', version: 1, content: finalContent },
      { type: 'product_list', version: 1, items: recommendedProducts },
      { type: 'policy_answer', version: 1, items: shouldShowPolicy(prepared.requestMessage) ? prepared.knowledge.slice(0, 2) : [] },
      { type: 'cart_summary', version: 1, cart: prepared.cart },
      { type: 'quick_replies', version: 1, items: buildQuickReplies(normalizeQuickReplyIntent(prepared.userAnalysis.intent), recommendedProducts, prepared.knowledge, prepared.actionResult !== undefined) },
    ];

    const response = {
      messageId: prepared.messageId,
      model,
      blocks,
      diagnostics: prepared.diagnostics,
      trace,
    };
    this.agentTraceService.record(trace);
    return response;
  }
}

type ChatIntent = SalesAgentIntent;

function normalizeQuickReplyIntent(intent: UserAnalysis['intent']): SalesAgentIntent {
  return intent === 'confirm_pending' || intent === 'cancel_pending' ? 'cart_action' : intent;
}

function hasCompletedCartAction(toolResults: CartToolResult[]): boolean {
  return toolResults.some((toolResult) => toolResult.status === 'completed' && toolResult.productIds.length > 0);
}

function sanitizeRecommendationLeakage(content: string, recommendedProducts: Product[]): string {
  const leakageIndex = content.search(/Recommendation-agent handoff|status=|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=/i);
  const visibleText = leakageIndex >= 0 ? content.slice(0, leakageIndex).trim() : content.trim();
  if (visibleText) return visibleText;
  if (recommendedProducts.length > 0) return `Mình đã chọn ${recommendedProducts.length} sản phẩm phù hợp và gửi đúng các sản phẩm đó ở khung gợi ý bên dưới.`;
  return 'Mình chưa có sản phẩm phù hợp để hiển thị trong khung gợi ý. Bạn có thể nói rõ thêm nhu cầu hoặc nới điều kiện tìm kiếm nhé.';
}

function detectChatIntent(message: string): ChatIntent {
  return detectSalesIntent(message);
}

function shouldShowPolicy(message: string): boolean {
  const normalizedMessage = normalize(message);
  return /đổi trả|hoàn tiền|bảo hành|vận chuyển|chính sách/.test(normalizedMessage);
}

function isPolicyOnlyRequest(normalizedMessage: string): boolean {
  return shouldShowPolicy(normalizedMessage) && !/sản phẩm|máy|nồi|robot|camera|đèn|quạt|lọc|bếp|mua|tư vấn/.test(normalizedMessage);
}

function emptyAccountCart(): Cart {
  return { id: 'account-required', version: 0, items: [], subtotal: 0, grandTotal: 0, status: 'active' };
}

function mergeProducts(left: Product[], right: Product[]): Product[] {
  const productById = new Map(left.map((product) => [product.id, product]));
  for (const product of right) productById.set(product.id, product);
  return Array.from(productById.values());
}

function productsFromCart(cart: Cart, products: Product[]): Product[] {
  const productIds = new Set(cart.items.map((item) => item.productId));
  return products.filter((product) => productIds.has(product.id));
}

function buildContextDocuments(products: Product[], knowledge: KnowledgeDocument[]): string[] {
  const productDocuments = products.map((product) => buildProductDocument(product));
  const knowledgeDocuments = knowledge.map((document) => `Chính sách: ${document.title} | ${document.content}`);
  return [...productDocuments, ...knowledgeDocuments];
}

function buildSelectedProductContext(products: Product[]): string {
  return products.map(buildProductDocument).join('\n');
}

function buildRecommendationInstruction(result: RecommendationAgentResult): string {
  if (!result.shouldShowProducts) return `Chỉ dẫn nội bộ: không có khung đề xuất sản phẩm cho câu trả lời này. Lý do: ${result.displayReason}`;
  const productNames = result.products.map((product) => product.title).join(', ');
  const compareInstruction = result.presentationIntent === 'compare' ? ' Hãy nói rõ đây là đúng các sản phẩm đang so sánh.' : '';
  return `Chỉ dẫn nội bộ: khung đề xuất đang hiển thị ${result.products.length} sản phẩm: ${productNames}. Chỉ được nhắc các sản phẩm này, không nhắc sản phẩm khác.${compareInstruction}`;
}

function buildSalesRevisionPrompt(prepared: PreparedChat, draft: string, complaints: string[], revisedInstruction: string | undefined): string {
  return JSON.stringify({
    userMessage: prepared.requestMessage,
    oldDraft: draft,
    complaints,
    revisedInstruction,
    productRail: prepared.recommendationResult.products.map((product) => ({ title: product.title, price: product.price, category: product.category, brand: product.brand })),
    shouldShowProducts: prepared.recommendationResult.shouldShowProducts,
    presentationIntent: prepared.recommendationResult.presentationIntent,
    actionResult: prepared.actionResult,
    rule: 'Viết lại câu trả lời cuối cùng cho khách. Không nhắc internal handoff/debug. Nếu productRail có sản phẩm, chỉ nhắc đúng những sản phẩm đó.',
  });
}

function buildProductDocument(product: Product): string {
  return [
    `Sản phẩm: ${product.title}`,
    `Thương hiệu: ${product.brand}`,
    `Danh mục: ${product.category}`,
    `Giá: ${formatVnd(product.price)}`,
    `Tồn kho: ${product.inventory}`,
    `Mô tả: ${product.description}`,
    `Thuộc tính: ${Object.entries(product.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
  ].join(' | ');
}

function buildMemoryTurns(turns: Array<{ role: string; content: string }>): string {
  return turns.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
}

function buildPreferenceContext(preferences: Array<{ key: string; value: unknown }>): string {
  return preferences.map((preference) => `${preference.key}: ${JSON.stringify(preference.value)}`).join('\n');
}

function shouldIncludeCartContext(message: string, actionResult: string | undefined): boolean {
  const intent = detectChatIntent(message);
  return actionResult !== undefined || intent === 'cart_action' || intent === 'cart_status';
}

function buildCartContext(cart: Cart, products: Product[]): string {
  if (cart.items.length === 0) return 'Giỏ hàng đang trống.';
  return cart.items
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return `${product?.title ?? 'Sản phẩm trong giỏ'}: ${item.quantity} x ${formatVnd(item.unitPrice)} = ${formatVnd(item.lineTotal)}`;
    })
    .join('\n');
}

function buildPipelineEvent(agent: AgentTraceAgent, stage: AgentPipelineEvent['stage'], status: AgentPipelineEvent['status'], summary: string): AgentPipelineEvent {
  return { timestamp: new Date().toISOString(), agent, stage, status, summary };
}

function buildTrace(params: {
  messageId: string;
  intent: SalesAgentIntent;
  agents: AgentTraceAgent[];
  memoryContext: ChatMemoryContext;
  lexicalProducts: Product[];
  selectedProducts: Product[];
  recommendationResult: RecommendationAgentResult;
  contextDocumentCount: number;
  rerankScores: number[];
  fallbackRanking?: 'lexical';
  memoryInvestigation: MemoryAgentResult;
  productManagerResult: ProductManagerResult;
  actionTraceItems: AgentTrace['cart']['actions'];
  cartBefore: Cart;
  cartAfter: Cart;
  actionResult?: string;
  pipelineEvents: AgentPipelineEvent[];
  toolResults: CartToolResult[];
  pendingPlan?: AgentTrace['pendingPlan'];
  traceErrors: AgentTrace['errors'];
}): AgentTrace {
  const steps = buildAgentOrder(params.agents).map((agent) => ({
    agent,
    status: params.agents.includes(agent) ? 'completed' as const : 'skipped' as const,
    summary: summarizeAgent(agent, params.intent),
  }));
  const nodes = buildTraceNodes(params);
  const graphEdges = buildTraceGraphEdges(nodes, params.actionTraceItems.length > 0);
  return {
    traceId: randomUUID(),
    messageId: params.messageId,
    timestamp: new Date().toISOString(),
    intent: params.intent,
    agents: buildAgentOrder(params.agents),
    edges: buildAgentEdges(params.agents),
    nodes,
    graphEdges,
    steps,
    events: buildTraceEvents(params.agents, params.intent, params.actionTraceItems, params.traceErrors),
    memory: {
      recentTurnCount: params.memoryContext.recentTurns.length,
      rollingSummaryLength: params.memoryContext.rollingSummary?.length ?? 0,
      recentRecommendationIds: params.memoryContext.recentRecommendationIds,
      preferenceKeys: params.memoryContext.preferences.map((preference) => preference.key),
    },
    retrieval: {
      lexicalCandidateIds: params.lexicalProducts.map((product) => product.id),
      selectedProductIds: params.recommendationResult.products.map((product) => product.id),
      contextDocumentCount: params.contextDocumentCount,
      rerankTopScores: params.rerankScores,
      fallbackRanking: params.fallbackRanking,
    },
    cart: {
      actionType: params.actionTraceItems.map((action) => action.type).join(' → ') || 'none',
      resolvedProductIds: params.actionTraceItems.flatMap((action) => action.productIds),
      beforeItemCount: params.cartBefore.items.length,
      afterItemCount: params.cartAfter.items.length,
      result: params.actionResult,
      actions: params.actionTraceItems,
    },
    llm: {
      model: 'pending',
      contextDocumentCount: params.contextDocumentCount,
      promptSections: ['orchestrator', 'memory', 'recommendation-handoff', 'rag-context', 'cart-if-needed'],
    },
    pipeline: params.pipelineEvents,
    toolResults: params.toolResults,
    pendingPlan: params.pendingPlan,
    errors: params.traceErrors,
  };
}

function buildRuntimeAgents(agents: AgentTraceAgent[], recommendationResult: RecommendationAgentResult, actionTraceItems: AgentTrace['cart']['actions']): AgentTraceAgent[] {
  const next = new Set(agents);
  next.add('recommendation-agent');
  if (recommendationResult.products.length > 0 && !next.has('retrieval-agent')) next.add('retrieval-agent');
  if (actionTraceItems.length > 0) next.add('cart-manager-agent');
  next.add('sales-agent');
  return buildAgentOrder([...next]);
}

function buildAgentOrder(agents: AgentTraceAgent[]): AgentTraceAgent[] {
  const order: AgentTraceAgent[] = ['memory-agent', 'user-analysis-agent', 'product-manager-agent', 'recommendation-agent', 'retrieval-agent', 'cart-manager-agent', 'sales-agent'];
  return order.filter((agent) => agents.includes(agent));
}

function buildTraceNodes(params: {
  intent: SalesAgentIntent;
  agents: AgentTraceAgent[];
  memoryContext: ChatMemoryContext;
  memoryInvestigation: MemoryAgentResult;
  productManagerResult: ProductManagerResult;
  contextDocumentCount: number;
  actionTraceItems: AgentTrace['cart']['actions'];
  cartBefore: Cart;
  cartAfter: Cart;
  recommendationResult: RecommendationAgentResult;
}): AgentTraceNode[] {
  const agentNodes: AgentTraceNode[] = buildAgentOrder(params.agents).map((agent, index) => ({
    id: agent,
    label: summarizeGraphNode(agent),
    kind: 'agent',
    status: 'completed',
    agentName: agent,
    order: index,
  }));
  const actionNodes: AgentTraceNode[] = params.actionTraceItems.map((action, index) => ({
    id: `cart-tool-${index + 1}`,
    label: `Tool ${action.type}`,
    kind: 'tool',
    status: action.status,
    detail: action.productIds.length ? action.productIds.join(', ') : action.result ?? action.error,
    order: 60 + index,
  }));
  return [
    { id: 'user-message', label: 'User message', kind: 'text', status: 'completed', detail: 'input', order: -1 },
    ...agentNodes,
    { id: 'memory-db', label: 'DB chat history', kind: 'db', status: 'completed', detail: `${params.memoryContext.recentTurns.length} recent turns`, order: 20 },
    { id: 'memory-preferences', label: 'DB preferences', kind: 'db', status: 'completed', detail: `${params.memoryContext.preferences.length} keys`, order: 21 },
    { id: 'memory-wiki', label: 'Wiki memory graph', kind: 'text', status: params.memoryInvestigation.visitedNodes.length ? 'completed' : 'skipped', detail: `${params.memoryInvestigation.visitedNodes.length} nodes`, order: 22 },
    { id: 'memory-result', label: 'Memory result', kind: 'text', status: params.memoryInvestigation.confidence >= 0.5 ? 'completed' : 'skipped', detail: `${params.memoryInvestigation.referenceProductIds.length} product refs`, order: 23 },
    { id: 'analysis-result', label: 'Intent result', kind: 'text', status: 'completed', detail: params.intent, order: 24 },
    { id: 'product-db', label: 'Product database', kind: 'db', status: params.productManagerResult.mode === 'none' ? 'skipped' : 'completed', detail: `${params.productManagerResult.candidates.length} candidates`, order: 30 },
    { id: 'product-result', label: 'Product result', kind: 'text', status: params.productManagerResult.confidence >= 0.5 ? 'completed' : 'skipped', detail: `${params.productManagerResult.selectedProducts.length} selected`, order: 31 },
    { id: 'recommendation-result', label: 'Recommendation result', kind: 'text', status: params.recommendationResult.status === 'approved' ? 'completed' : 'skipped', detail: `${params.recommendationResult.products.length} display`, order: 32 },
    { id: 'ranking-service', label: 'Ranking service', kind: 'service', status: params.productManagerResult.selectedProducts.length ? 'completed' : 'skipped', detail: params.productManagerResult.mode, order: 33 },
    { id: 'knowledge-db', label: 'Knowledge DB', kind: 'db', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: 'policy/faq', order: 40 },
    { id: 'rag-context', label: 'Prompt context', kind: 'text', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: `${params.contextDocumentCount} docs`, order: 41 },
    { id: 'embedding-tool', label: 'Embedding tool', kind: 'tool', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: 'real embedding', order: 42 },
    { id: 'rerank-tool', label: 'Rerank tool', kind: 'tool', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: 'real rerank', order: 43 },
    { id: 'cart-state', label: 'Cart DB state', kind: 'db', status: 'completed', detail: `${params.cartBefore.items.length} → ${params.cartAfter.items.length} lines`, order: 50 },
    ...actionNodes,
    { id: 'llm-call', label: 'LLM call', kind: 'tool', status: 'completed', detail: 'sales response', order: 80 },
    { id: 'assistant-response', label: 'Assistant response', kind: 'text', status: 'completed', detail: 'frontend blocks', order: 90 },
  ];
}

function buildTraceGraphEdges(nodes: AgentTraceNode[], hasCartAction: boolean): AgentTraceGraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: AgentTraceGraphEdge[] = [
    { from: 'user-message', to: 'memory-agent', status: 'completed', order: 1, label: 'gọi điều tra', direction: 'call' },
    { from: 'memory-agent', to: 'memory-db', status: 'completed', order: 2, label: 'đọc history', direction: 'call' },
    { from: 'memory-db', to: 'memory-agent', status: 'completed', order: 3, label: 'trả turns', direction: 'return' },
    { from: 'memory-agent', to: 'memory-preferences', status: 'completed', order: 4, label: 'đọc cache', direction: 'call' },
    { from: 'memory-preferences', to: 'memory-wiki', status: 'completed', order: 5, label: 'seed nodes', direction: 'data' },
    { from: 'memory-wiki', to: 'memory-result', status: 'completed', order: 6, label: 'resolve refs', direction: 'return' },
    { from: 'memory-result', to: 'user-analysis-agent', status: 'completed', order: 7, label: 'context', direction: 'data' },
    { from: 'user-message', to: 'user-analysis-agent', status: 'completed', order: 8, label: 'phân tích', direction: 'call' },
    { from: 'user-analysis-agent', to: 'analysis-result', status: 'completed', order: 9, label: 'intent', direction: 'return' },
    { from: 'analysis-result', to: 'product-manager-agent', status: 'completed', order: 10, label: 'yêu cầu sản phẩm', direction: 'call' },
    { from: 'memory-result', to: 'product-manager-agent', status: 'completed', order: 11, label: 'product refs', direction: 'data' },
    { from: 'product-manager-agent', to: 'product-db', status: 'completed', order: 12, label: 'search/resolve', direction: 'call' },
    { from: 'product-db', to: 'ranking-service', status: 'completed', order: 13, label: 'candidates', direction: 'data' },
    { from: 'ranking-service', to: 'product-result', status: 'completed', order: 14, label: 'selected', direction: 'return' },
    { from: 'product-result', to: 'recommendation-agent', status: 'completed', order: 15, label: 'presentation plan', direction: 'data' },
    { from: 'recommendation-agent', to: 'recommendation-result', status: 'completed', order: 16, label: 'handoff', direction: 'return' },
    { from: 'recommendation-result', to: 'retrieval-agent', status: 'completed', order: 17, label: 'grounding', direction: 'data' },
    { from: 'retrieval-agent', to: 'knowledge-db', status: 'completed', order: 18, label: 'policy lookup', direction: 'call' },
    { from: 'knowledge-db', to: 'rag-context', status: 'completed', order: 19, label: 'docs', direction: 'data' },
    { from: 'recommendation-result', to: 'rag-context', status: 'completed', order: 20, label: 'product docs', direction: 'data' },
    { from: 'rag-context', to: 'embedding-tool', status: 'completed', order: 19, label: 'embed', direction: 'call' },
    { from: 'embedding-tool', to: 'rerank-tool', status: 'completed', order: 20, label: 'vectors', direction: 'data' },
    { from: 'rerank-tool', to: 'rag-context', status: 'completed', order: 21, label: 'ranked context', direction: 'return' },
    { from: 'rag-context', to: 'sales-agent', status: 'completed', order: 22, label: 'prompt sections', direction: 'data' },
    { from: 'sales-agent', to: 'llm-call', status: 'completed', order: 23, label: 'gọi model', direction: 'call' },
    { from: 'llm-call', to: 'sales-agent', status: 'completed', order: 24, label: 'tokens', direction: 'return' },
    { from: 'sales-agent', to: 'assistant-response', status: 'completed', order: 25, label: 'blocks', direction: 'return' },
  ];
  if (hasCartAction) {
    edges.push(
      { from: 'product-result', to: 'cart-manager-agent', status: 'completed', order: 30, label: 'targets', direction: 'data' },
      { from: 'cart-manager-agent', to: 'cart-state', status: 'completed', order: 31, label: 'đọc giỏ', direction: 'call' },
      { from: 'cart-state', to: 'cart-manager-agent', status: 'completed', order: 32, label: 'cart hiện tại', direction: 'return' },
      { from: 'cart-manager-agent', to: 'cart-tool-1', status: 'completed', order: 33, label: 'execute', direction: 'call' },
      { from: 'cart-tool-1', to: 'cart-state', status: 'completed', order: 34, label: 'write cart', direction: 'data' },
      { from: 'cart-state', to: 'sales-agent', status: 'completed', order: 35, label: 'tool result', direction: 'data' },
    );
  }
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}

function summarizeGraphNode(agent: AgentTraceAgent): string {
  if (agent === 'memory-agent') return 'Bộ nhớ';
  if (agent === 'user-analysis-agent') return 'Phân tích user';
  if (agent === 'product-manager-agent') return 'Quản lý sản phẩm';
  if (agent === 'recommendation-agent') return 'Đề xuất hiển thị';
  if (agent === 'retrieval-agent') return 'Truy xuất';
  if (agent === 'cart-manager-agent') return 'Quản lý giỏ';
  return 'Tư vấn bán hàng';
}

function buildAgentEdges(agents: AgentTraceAgent[]): Array<{ from: AgentTraceAgent; to: AgentTraceAgent; status: 'completed'; order: number }> {
  const orderedAgents = buildAgentOrder(agents);
  return orderedAgents.slice(1).map((agent, index) => ({ from: orderedAgents[index], to: agent, status: 'completed', order: index + 1 }));
}

function buildTraceEvents(agents: AgentTraceAgent[], intent: SalesAgentIntent, cartActions: AgentTrace['cart']['actions'], errors: AgentTrace['errors']): AgentTrace['events'] {
  const now = Date.now();
  const baseEvents = buildAgentOrder(agents).map((agent, index) => ({
    timestamp: new Date(now + index * 10).toISOString(),
    agent,
    type: errors.some((error) => error.source.includes(agent.split('-')[0])) ? 'error' as const : 'completed' as const,
    summary: summarizeAgent(agent, intent),
  }));
  const cartEvents = cartActions.map((action, index) => ({
    timestamp: new Date(now + (baseEvents.length + index) * 10).toISOString(),
    agent: 'cart-manager-agent' as const,
    type: action.status === 'completed' ? 'tool_result' as const : 'error' as const,
    summary: action.result ?? action.error ?? action.type,
  }));
  return [...baseEvents, ...cartEvents];
}

function summarizeAgent(agent: AgentTraceAgent, intent: SalesAgentIntent): string {
  if (agent === 'memory-agent') return 'Đọc short-term turns, rolling summary và recent recommendations.';
  if (agent === 'user-analysis-agent') return `Phân loại intent: ${intent}.`;
  if (agent === 'product-manager-agent') return 'Quản lý truy vấn DB sản phẩm và chọn candidate đúng ngữ cảnh.';
  if (agent === 'recommendation-agent') return 'Quyết định sản phẩm nào được phép hiện ở khung đề xuất và handoff cho sales-agent.';
  if (agent === 'retrieval-agent') return 'Chuẩn bị context RAG từ sản phẩm/chính sách đã được chọn.';
  if (agent === 'cart-manager-agent') return 'Resolve và thực thi thao tác giỏ hàng nếu có.';
  return 'Tạo câu trả lời dựa trên selected products và context đã grounding.';
}

function buildQuickReplies(intent: ChatIntent, products: Product[], knowledge: KnowledgeDocument[], actionCompleted: boolean): string[] {
  const firstProduct = products[0]?.title;
  const secondProduct = products[1]?.title;
  const replies: string[] = [];
  if ((intent === 'recommend' || intent === 'compare' || intent === 'product_detail') && firstProduct && !actionCompleted) replies.push(`Thêm ${firstProduct} vào giỏ`);
  if (intent === 'recommend' && firstProduct && secondProduct) replies.push(`So sánh ${firstProduct} với ${secondProduct}`);
  if (intent === 'recommend' && replies.length < 3) replies.push('Cho nhiều sản phẩm hơn');
  if (intent === 'policy' && knowledge.length > 0) replies.push('Tôi muốn xem sản phẩm phù hợp');
  if (intent === 'cart_action' || intent === 'cart_status') replies.push('Xem giỏ hàng');
  if (replies.length < 2 && intent !== 'policy') replies.push('Tư vấn sản phẩm dưới 2 triệu');
  return replies.slice(0, 3);
}

function cleanAssistantText(value: string, products: Product[]): string {
  let text = value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  for (const product of products) {
    text = text.replaceAll(product.id, product.title);
  }
  text = text.replace(/prod_[a-z0-9_]+/gi, 'sản phẩm này');
  text = text.replace(/^['"]|['"]$/g, '').trim();

  return text || 'Mình đã tìm sản phẩm phù hợp trong catalog. Bạn có thể xem các gợi ý bên dưới và bấm Thêm giỏ để tiếp tục.';
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}
