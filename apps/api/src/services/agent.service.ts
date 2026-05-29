import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AgentOrchestratorService, detectSalesIntent, type SalesAgentIntent } from './agent-orchestrator.service.js';
import type { KnowledgeDocument, Product } from '../models/catalog.models.js';
import type { AgentChatRequest, AgentChatResponse, AgentMessageBlock, AgentTrace, AgentTraceAgent, AgentTraceGraphEdge, AgentTraceNode } from '../models/agent.models.js';
import { CatalogService } from './catalog.service.js';
import { CommerceService } from './commerce.service.js';
import type { Cart } from '../models/commerce.models.js';
import { ChatMemoryService, type ChatMemoryContext } from './chat-memory.service.js';
import { ModelGatewayService } from './model-gateway.service.js';
import { PromptSettingsService } from './prompt-settings.service.js';
import { AgentTraceService } from './agent-trace.service.js';
import type { AgentPipelineEvent, AgentQualityGateResult, CartToolResult, MemoryAgentResult, ProductManagerResult, RecommendationAgentResult, UserAnalysis } from '../models/agent-execution.models.js';
import type { PipelineV2Agent } from '../models/agent-pipeline-v2.models.js';
import { AgentQualityGateService } from './agents/agent-quality-gate.service.js';
import { BusinessRagAgentService } from './agents/business-rag-agent.service.js';
import { CartSqlRagAgentService } from './agents/cart-sql-rag-agent.service.js';
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
    private readonly commerceService: CommerceService,
    private readonly modelGatewayService: ModelGatewayService,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly agentTraceService: AgentTraceService,
    private readonly agentQualityGateService: AgentQualityGateService,
    private readonly businessRagAgentService: BusinessRagAgentService,
    private readonly memoryAgentService: MemoryAgentService,
    private readonly productManagerAgentService: ProductManagerAgentService,
    private readonly recommendationAgentService: RecommendationAgentService,
    private readonly salesEvaluatorAgentService: SalesEvaluatorAgentService,
    private readonly userAnalysisAgentService: UserAnalysisAgentService,
    private readonly cartSqlRagAgentService: CartSqlRagAgentService,
    private readonly promptSettingsService: PromptSettingsService,
  ) {}

  async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    const prepared = await this.prepareChat(request);
    const modelResponse = await this.modelGatewayService.chat({
      messages: prepared.messages,
      maxTokens: 220,
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
    const pendingStatuses: AgentStreamEvent[] = [];
    let wakeStatusLoop: (() => void) | undefined;
    let prepared: PreparedChat | undefined;
    let prepareError: unknown;
    let isPrepareDone = false;

    const preparePromise = this.prepareChat(request, (message) => {
      pendingStatuses.push({ type: 'status', message });
      wakeStatusLoop?.();
      wakeStatusLoop = undefined;
    }).then((value) => {
      prepared = value;
      isPrepareDone = true;
      wakeStatusLoop?.();
      wakeStatusLoop = undefined;
    }).catch((error) => {
      prepareError = error;
      isPrepareDone = true;
      wakeStatusLoop?.();
      wakeStatusLoop = undefined;
    });

    while (!isPrepareDone || pendingStatuses.length) {
      while (pendingStatuses.length) {
        const event = pendingStatuses.shift();
        if (event) yield event;
      }
      if (isPrepareDone) break;
      await new Promise<void>((resolve) => {
        wakeStatusLoop = resolve;
      });
    }
    await preparePromise;
    if (prepareError) throw prepareError;
    if (!prepared) throw new Error('Chat preparation failed');
    let content = '';
    let model = '';

    yield { type: 'status', message: statusForDraft(prepared.userAnalysis) };
    for await (const chunk of this.modelGatewayService.streamChat({
      messages: prepared.messages,
      maxTokens: 220,
      temperature: 0.1,
    })) {
      content += chunk.content;
      model = chunk.model ?? model;
    }

    const cleanedContent = cleanAssistantText(content, mergeProducts(prepared.products, prepared.recommendationResult.products));
    const revisedContent = await this.reviseSalesContent(prepared, cleanedContent);
    const finalContent = alignContentWithProductRail(revisedContent, prepared.recommendationResult.products, prepared.requestMessage);
    const response = this.buildResponse(prepared, finalContent, model || 'streaming-model');
    const responseTextBlock = response.blocks.find((block) => block.type === 'text');
    const displayContent = responseTextBlock?.type === 'text' ? responseTextBlock.content : finalContent;
    yield { type: 'status', message: 'Đang gửi câu trả lời' };
    for await (const contentChunk of streamTextChunks(displayContent)) {
      yield { type: 'token', content: contentChunk };
    }
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
    createStatus?: (message: string) => void,
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
    const gateEvents: AgentPipelineEvent[] = [];
    const gateErrors: AgentTrace['errors'] = [];
    const memoryGate = await this.evaluateAgentOutput({
      userId,
      agent: 'memory-agent',
      job: 'memory investigation',
      message,
      inputSummary: `requiresHistory=${memoryInvestigation.requiresHistory}`,
      output: memoryInvestigation,
      contract: [
        'Nếu requiresHistory=true và confidence thấp thì phải clarify thay vì đoán product reference.',
        'resolvedReference chỉ được dùng khi evidence/history đủ hỗ trợ.',
      ],
      allowedData: { recentTurns: memoryContext.recentTurns.length, preferences: memoryContext.preferences.map((preference) => preference.key) },
    });
    gateEvents.push(buildQualityGateEvent('memory-agent', memoryGate));
    if (!memoryGate.pass && memoryGate.severity === 'block') gateErrors.push({ source: 'memory-agent-quality-gate', message: memoryGate.complaints.join('; ') });

    const userAnalysis = await this.userAnalysisAgentService.analyze({ userId, message, pendingPlan: memoryContext.pendingCartPlan, memoryInvestigation });
    const analysisGate = await this.evaluateAgentOutput({
      userId,
      agent: 'user-analysis-agent',
      job: 'intent analysis',
      message,
      inputSummary: message,
      output: userAnalysis,
      contract: [
        'cart_status không được có cartOperation.',
        'cart_action phải có cartOperation rõ ràng.',
        'policy/smalltalk/cart_status phải retrievalMode=none và shouldShowProducts=false.',
        'Câu hỏi ngoài phạm vi retail phải refuse hoặc định hướng lại, không trả lời chủ đề ngoài.',
      ],
      allowedData: { memoryInvestigation },
    });
    gateEvents.push(buildQualityGateEvent('user-analysis-agent', analysisGate));
    if (!analysisGate.pass && analysisGate.severity === 'block') gateErrors.push({ source: 'user-analysis-agent-quality-gate', message: analysisGate.complaints.join('; ') });
    createStatus?.(statusForResolution(userAnalysis));
    const [productManagerResult, businessRagResult] = await Promise.all([
      this.productManagerAgentService.resolveProducts({ message, analysis: userAnalysis, memoryInvestigation, cart: initialCart, allProducts }),
      this.businessRagAgentService.retrieve({ message, analysis: userAnalysis, enabled: shouldSearchKnowledge(userAnalysis, message) }),
    ]);
    const knowledge = businessRagResult.documents;
    const productGate = await this.evaluateAgentOutput({
      userId,
      agent: 'product-manager-agent',
      job: 'product resolution',
      message,
      inputSummary: `${userAnalysis.intent}/${userAnalysis.retrievalMode}`,
      output: summarizeProductManagerResult(productManagerResult),
      contract: [
        'selectedProducts phải nằm trong candidates.',
        'Nếu retrievalMode=none thì candidates và selectedProducts phải rỗng.',
        'Nếu intent recommend/compare/product_detail và đủ điều kiện thì selectedProducts không được rỗng.',
      ],
      allowedData: { analysis: userAnalysis },
    });
    gateEvents.push(buildQualityGateEvent('product-manager-agent', productGate));
    if (!productGate.pass && productGate.severity === 'block') gateErrors.push({ source: 'product-manager-agent-quality-gate', message: productGate.complaints.join('; ') });
    const orchestrationPlan = this.agentOrchestratorService.plan({ message, memory: memoryContext, cart: initialCart, candidates: productManagerResult.candidates });
    const actionProducts = mergeProducts(productManagerResult.candidates, productsFromCart(initialCart, allProducts));
    const cartId = initialCart.id;
    const intent = userAnalysis.intent === 'confirm_pending' || userAnalysis.intent === 'cancel_pending' ? 'cart_action' : userAnalysis.intent;
    const products = productManagerResult.candidates;
    const selectedProducts = productManagerResult.selectedProducts;
    const cartManagerResult = await this.cartSqlRagAgentService.runGoal({
      message,
      userId,
      cart: initialCart,
      analysis: userAnalysis,
      products: actionProducts,
      selectedProducts,
      memoryContext,
    });
    const cartGate = await this.evaluateAgentOutput({
      userId,
      agent: 'cart-manager-agent',
      job: 'cart plan and tool result',
      message,
      inputSummary: `${userAnalysis.intent}/${userAnalysis.cartOperation ?? 'none'}`,
      output: cartManagerResult,
      contract: [
        'cart_status chỉ đọc trạng thái giỏ, không được yêu cầu target sản phẩm.',
        'Không claim thao tác giỏ thành công nếu toolResults không completed.',
        'clarification chỉ dùng khi cart_action thiếu target, không dùng cho cart_status.',
      ],
      allowedData: { analysis: userAnalysis, initialCart },
    });
    gateEvents.push(buildQualityGateEvent('cart-manager-agent', cartGate));
    if (!cartGate.pass && cartGate.severity === 'block') gateErrors.push({ source: 'cart-manager-agent-quality-gate', message: cartGate.complaints.join('; ') });

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
    const recommendationGate = await this.evaluateAgentOutput({
      userId,
      agent: 'recommendation-agent',
      job: 'presentation handoff',
      message,
      inputSummary: `${userAnalysis.intent}/${productManagerResult.mode}`,
      output: summarizeRecommendationResult(recommendationResult),
      contract: [
        'Nếu shouldShowProducts=false thì products phải rỗng.',
        'products hiển thị phải nằm trong candidates/selectedProducts/tool result được phép.',
        'presentationIntent phải khớp intent user-analysis.',
      ],
      allowedData: { selectedProductIds: productManagerResult.selectedProducts.map((product) => product.id), candidateIds: productManagerResult.candidates.map((product) => product.id), toolResults: cartManagerResult.toolResults },
    });
    gateEvents.push(buildQualityGateEvent('recommendation-agent', recommendationGate));
    if (!recommendationGate.pass && recommendationGate.severity === 'block') gateErrors.push({ source: 'recommendation-agent-quality-gate', message: recommendationGate.complaints.join('; ') });

    const actionResults = cartManagerResult.actionResults;
    const actionTraceItems = cartManagerResult.traceActions;
    const toolResults = cartManagerResult.toolResults;
    const pipelineEvents = [
      buildPipelineEvent('memory-agent', 'lookup', 'completed', `Loaded ${memoryContext.recentTurns.length} recent turns and ${memoryContext.preferences.length} preference keys.`),
      buildPipelineEvent('memory-agent', 'investigate', memoryInvestigation.confidence >= 0.5 ? 'completed' : 'skipped', memoryInvestigation.summary ? `Resolved history context: ${memoryInvestigation.summary.slice(0, 120)}` : `Reference products: ${memoryInvestigation.referenceProductIds.length}.`),
      buildPipelineEvent('user-analysis-agent', 'analyze', 'completed', `Intent ${userAnalysis.intent}${userAnalysis.cartOperation ? `, cart op ${userAnalysis.cartOperation}` : ''}, retrieval ${userAnalysis.retrievalMode}.`),
      buildPipelineEvent('product-manager-agent', 'lookup', productManagerResult.confidence >= 0.5 ? 'completed' : 'skipped', `Mode ${productManagerResult.mode}, candidates ${productManagerResult.candidates.length}, selected ${productManagerResult.selectedProducts.length}.`),
      ...businessRagResult.pipeline,
      buildPipelineEvent('recommendation-agent', 'handoff', recommendationResult.status === 'approved' ? 'completed' : 'skipped', `${recommendationResult.status}: ${recommendationResult.displayReason}`),
      ...gateEvents,
      ...cartManagerResult.pipeline,
    ];
    const actionResult = actionResults.join('\n');
    const contextDocuments = buildContextDocuments(selectedProducts, knowledge);
    const traceErrors: AgentTrace['errors'] = [];

    if (contextDocuments.length) createStatus?.(statusForGrounding(userAnalysis));
    if (contextDocuments.length) createStatus?.('Đang kiểm tra nguồn phù hợp');
    const fallbackRanking: 'keyword' | 'rag_rerank' | undefined = knowledge.length ? 'rag_rerank' : contextDocuments.length ? 'keyword' : undefined;
    traceErrors.push(...gateErrors, ...cartManagerResult.errors);
    const selectedContext = contextDocuments.slice(0, 5).join('\n---\n');
    const messageId = randomUUID();
    const traceAgents = buildRuntimeAgents(orchestrationPlan.agents, recommendationResult, actionTraceItems, intent, contextDocuments.length, gateEvents, orchestrationPlan.pipelineAgents);
    const trace = buildTrace({
      messageId,
      intent,
      agents: traceAgents,
      memoryContext,
      lexicalProducts: products,
      selectedProducts,
      recommendationResult,
      contextDocumentCount: contextDocuments.length,
      rerankScores: businessRagResult.diagnostics.rerankTopScore ? [businessRagResult.diagnostics.rerankTopScore] : [],
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
        embeddingDimensions: businessRagResult.diagnostics.embeddingDimensions,
        rerankTopScore: businessRagResult.diagnostics.rerankTopScore,
        contextDocuments: contextDocuments.length,
      },
      trace,
      messages: [
        {
          role: 'system',
          content: await this.promptSettingsService.getContent('sales-system') || [
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
            `Context RAG/chính sách đã kiểm tra:\n${selectedContext}`,
            shouldIncludeCartContext(message, actionResult) ? `Giỏ hàng hiện tại:\n${buildCartContext(cart, products)}` : '',
          ].filter(Boolean).join('\n\n'),
        },
      ],
    };
  }

  private async evaluateAgentOutput(params: { userId?: string; agent: AgentTraceAgent; job: string; message: string; inputSummary: string; output: unknown; contract: string[]; allowedData?: unknown }): Promise<AgentQualityGateResult> {
    return this.agentQualityGateService.evaluate({
      userId: params.userId,
      agent: params.agent,
      job: params.job,
      userMessage: params.message,
      inputSummary: params.inputSummary,
      output: params.output,
      contract: params.contract,
      allowedData: params.allowedData,
    });
  }

  private async reviseSalesContent(prepared: PreparedChat, content: string): Promise<string> {
    if (isClearlyOutOfScope(prepared.requestMessage)) {
      return 'Mình chỉ hỗ trợ tư vấn sản phẩm, chính sách, tài khoản và giỏ hàng của RetailHome. Bạn cần mình hỗ trợ phần nào trong cửa hàng?';
    }
    const completedCartAction = hasCompletedCartAction(prepared.toolResults);
    const evaluation = await this.salesEvaluatorAgentService.evaluate({
      userId: prepared.userId,
      message: prepared.requestMessage,
      draft: content,
      recommendationResult: prepared.recommendationResult,
      completedCartAction,
      actionResult: prepared.actionResult,
    });
    prepared.pipelineEvents.push(buildQualityGateEvent('sales-evaluator-agent', evaluation));
    if (evaluation.pass) return content;

    const revision = await this.modelGatewayService.chat({
      maxTokens: 240,
      temperature: 0,
      messages: [
        { role: 'system', content: await this.promptSettingsService.getContent('sales-revision-system') || 'Bạn là sales-agent. Viết lại câu trả lời tiếng Việt tự nhiên, không markdown phức tạp, không lộ chỉ dẫn nội bộ, chỉ nhắc đúng sản phẩm trong product rail. Nếu câu hỏi ngoài phạm vi RetailHome thì từ chối ngắn gọn và hướng khách về sản phẩm/chính sách/giỏ hàng.' },
        { role: 'user', content: buildSalesRevisionPrompt(prepared, content, evaluation.complaints, evaluation.revisedInstruction) },
      ],
    });
    prepared.pipelineEvents.push(buildPipelineEvent('sales-agent', 'revise', 'completed', `Revised draft from evaluator complaints: ${evaluation.complaints.join('; ').slice(0, 160)}`));
    const revisedContent = cleanAssistantText(revision.content, mergeProducts(prepared.products, prepared.recommendationResult.products));
    const secondEvaluation = await this.salesEvaluatorAgentService.evaluate({
      userId: prepared.userId,
      message: prepared.requestMessage,
      draft: revisedContent,
      recommendationResult: prepared.recommendationResult,
      completedCartAction,
      actionResult: prepared.actionResult,
    });
    prepared.pipelineEvents.push(buildQualityGateEvent('sales-evaluator-agent', secondEvaluation));
    if (secondEvaluation.pass) return revisedContent;
    return secondEvaluation.safeResponse ?? evaluation.safeResponse ?? buildSafeFinalResponse(prepared, secondEvaluation.complaints);
  }

  private buildResponse(prepared: PreparedChat, content: string, model: string): AgentChatResponse {
    const completedCartAction = hasCompletedCartAction(prepared.toolResults);
    const blockedCartAction = Boolean(prepared.userAnalysis.cartOperation && prepared.actionResult && !completedCartAction);
    const recommendedProducts = resolveDisplayProducts(prepared, blockedCartAction);
    const safeActionResult = prepared.actionResult ? sanitizeCartActionResult(prepared.actionResult, mergeProducts(mergeProducts(prepared.products, prepared.selectedProducts), recommendedProducts)) : undefined;
    const rawFinalContent = blockedCartAction ? safeActionResult ?? content : safeActionResult && completedCartAction ? `${safeActionResult}\n${content}` : content;
    const finalContent = sanitizeRecommendationLeakage(alignContentWithProductRail(rawFinalContent, recommendedProducts, prepared.requestMessage), recommendedProducts);
    const trace: AgentTrace = { ...prepared.trace, llm: { ...prepared.trace.llm, model } };
    const blocks: AgentMessageBlock[] = [
      { type: 'text', version: 1, content: finalContent },
      { type: 'product_list', version: 1, items: recommendedProducts },
      { type: 'policy_answer', version: 1, items: prepared.userAnalysis.intent === 'policy' || shouldShowPolicy(prepared.requestMessage) ? prepared.knowledge.slice(0, 2) : [] },
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

function resolveDisplayProducts(prepared: PreparedChat, blockedCartAction: boolean): Product[] {
  if (blockedCartAction) return [];
  if (prepared.recommendationResult.shouldShowProducts && prepared.recommendationResult.products.length > 0) {
    return prepared.recommendationResult.products;
  }
  if (!['recommend', 'compare', 'product_detail'].includes(prepared.userAnalysis.intent)) return [];
  if (prepared.selectedProducts.length === 0) return [];
  const limit = prepared.userAnalysis.intent === 'compare' ? 2 : prepared.userAnalysis.intent === 'product_detail' ? 1 : 3;
  return prepared.selectedProducts.slice(0, limit);
}

function sanitizeCartActionResult(actionResult: string, products: Product[]): string {
  let text = cleanAssistantText(actionResult, products);
  if (/^Cart mutation rejected:\s*product_not_found\.?/i.test(text)) return 'Mình chưa tìm thấy sản phẩm đó để thao tác trong giỏ hàng.';
  text = text
    .replace(/^Added product .+ to cart\./i, 'Mình đã thêm sản phẩm vào giỏ hàng.')
    .replace(/^Removed product .+ from cart\./i, 'Mình đã xoá sản phẩm khỏi giỏ hàng.')
    .replace(/^Decreased product .+ quantity to \d+\./i, 'Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.')
    .replace(/^Increased product .+ quantity to \d+\./i, 'Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.')
    .replace(/^Set product .+ quantity to \d+\./i, 'Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.');
  return text.replace(/prod_[a-z0-9_]+/gi, 'sản phẩm này').trim();
}

function sanitizeRecommendationLeakage(content: string, recommendedProducts: Product[]): string {
  const leakageIndex = content.search(/Recommendation-agent|Chỉ dẫn nội bộ|status=|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=/i);
  const visibleText = leakageIndex >= 0 ? content.slice(0, leakageIndex).trim() : content.trim();
  if (visibleText) return visibleText;
  if (recommendedProducts.length > 0) return `Mình đã chọn ${recommendedProducts.length} sản phẩm phù hợp và gửi đúng các sản phẩm đó ở khung gợi ý bên dưới.`;
  return 'Mình chưa có sản phẩm phù hợp để hiển thị trong khung gợi ý. Bạn có thể nói rõ thêm nhu cầu hoặc nới điều kiện tìm kiếm nhé.';
}

function alignContentWithProductRail(content: string, recommendedProducts: Product[], sourceMessage = ''): string {
  if (recommendedProducts.length === 0) return content;
  const normalizedContent = normalize(content);
  const normalizedMessage = normalize(sourceMessage);
  const contradictsVisibleRail = /chưa thể trả lời chắc chắn|chưa đủ dữ liệu|chưa đủ chắc chắn|chưa có sản phẩm|chưa có gợi ý|chưa có .*phù hợp|không có sản phẩm|không .*phù hợp|chưa tìm thấy|chọn lại sản phẩm trong khung gợi ý/.test(normalizedContent);
  const mentionsVisibleProduct = recommendedProducts.some((product) => normalizedContent.includes(normalize(product.title)) || normalizedContent.includes(normalize(product.brand)));
  const asksGenericClarification = /cho mình biết thêm|cho tôi biết thêm|nói thêm|ngân sách|tư vấn chính xác|nhu cầu cụ thể|lọc tiếp/.test(normalizedContent);
  if (!contradictsVisibleRail && (mentionsVisibleProduct || !asksGenericClarification)) return content;

  const productNames = recommendedProducts.slice(0, 4).map((product) => product.title);
  if (/(máy lạnh|may lanh|air conditioner|điều hòa treo tường|dieu hoa treo tuong)/.test(normalizedMessage)
    && recommendedProducts.some((product) => /quạt|quat|làm mát|lam mat|điều hòa|dieu hoa/.test(normalize(`${product.title} ${product.category}`)))) {
    return `Hiện shop chưa có máy lạnh treo tường trong catalog, nhưng mình tìm thấy ${joinVietnameseList(productNames)} là nhóm làm mát gần nhất đang có. Bạn có thể xem nhanh trên thẻ; nếu muốn lọc sâu hơn, mình sẽ dựa thêm diện tích phòng hoặc ngân sách.`;
  }
  if (recommendedProducts.length === 1) {
    return `Mình tìm thấy ${productNames[0]} phù hợp nhất trong nhóm sản phẩm hiện có. Bạn có thể xem nhanh thông tin trên thẻ; nếu muốn lọc sâu hơn, mình sẽ dựa thêm ngân sách hoặc không gian sử dụng.`;
  }

  return `Mình tìm thấy ${recommendedProducts.length} lựa chọn phù hợp trong khung gợi ý: ${joinVietnameseList(productNames)}. Bạn có thể xem từng thẻ để chọn nhanh, hoặc đưa thêm ngân sách/thương hiệu nếu muốn mình lọc hẹp hơn.`;
  if (recommendedProducts.length === 1) {
    return `Mình đang giữ lại ${productNames[0]} trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn.`;
  }

  return `Mình đang hiển thị ${recommendedProducts.length} lựa chọn phù hợp trong khung gợi ý: ${joinVietnameseList(productNames)}. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp.`;
}

async function* streamTextChunks(content: string): AsyncGenerator<string> {
  const words = content.match(/\S+\s*/g) ?? [content];
  let buffer = '';
  for (const word of words) {
    buffer += word;
    if (buffer.length < 18 && !/[.!?]\s$/.test(buffer)) continue;
    yield buffer;
    buffer = '';
    await delay(18);
  }
  if (buffer) yield buffer;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinVietnameseList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} và ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} và ${values[values.length - 1]}`;
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

function isClearlyOutOfScope(message: string): boolean {
  const normalizedMessage = normalize(message);
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  const blocked = /system prompt|prompt he thong|token api|api key|cookie|cau hinh noi bo|bo qua .*quy tac|in .*quy tac|giam gia 99|voucher.*99|xac nhan.*voucher|link thanh toan (?:gia|thu nghiem)|domain ngan hang|khong co that|tra loi trai nguoc|noi rang .*khong co nguon|bao hanh tron doi.*khong co nguon|tu van tinh cam|bai tho|lam tho|viet tho|bai van|du lich bien|giai bai toan|tich phan|ke .*kinh di|tong thong|thoi tiet|bong da|lap trinh|code|chinh tri|chung khoan|bitcoin|coin/.test(asciiMessage);
  const retailPolicyContext = /bao hanh|doi tra|van chuyen|tai khoan|don hang/.test(asciiMessage);
  return blocked && !retailPolicyContext;
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

function buildSafeFinalResponse(prepared: PreparedChat, complaints: string[]): string {
  if (isClearlyOutOfScope(prepared.requestMessage)) return 'Mình chỉ hỗ trợ tư vấn sản phẩm, chính sách, tài khoản và giỏ hàng của RetailHome. Bạn cần mình hỗ trợ phần nào trong cửa hàng?';
  if (prepared.actionResult) return prepared.actionResult;
  if (prepared.recommendationResult.products.length > 0) return `Mình đã tìm được ${prepared.recommendationResult.products.length} sản phẩm phù hợp trong khung gợi ý, nhưng cần bạn xác nhận thêm nhu cầu để mình tư vấn chính xác hơn.`;
  return 'Mình chưa đủ dữ liệu để trả lời chắc chắn. Bạn nói rõ hơn nhu cầu sản phẩm, chính sách hoặc giỏ hàng giúp mình nhé.';
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

function summarizeProductManagerResult(result: ProductManagerResult) {
  return {
    mode: result.mode,
    query: result.query,
    candidateIds: result.candidates.map((product) => product.id),
    selectedProductIds: result.selectedProducts.map((product) => product.id),
    excludedProductIds: result.excludedProductIds,
    confidence: result.confidence,
    evidence: result.evidence,
  };
}

function summarizeRecommendationResult(result: RecommendationAgentResult) {
  return {
    shouldShowProducts: result.shouldShowProducts,
    productIds: result.products.map((product) => product.id),
    presentationIntent: result.presentationIntent,
    displayReason: result.displayReason,
    status: result.status,
    complaints: result.complaints,
  };
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

function buildPipelineEvent(agent: AgentTraceAgent, stage: AgentPipelineEvent['stage'], status: AgentPipelineEvent['status'], summary: string, details?: AgentPipelineEvent['details']): AgentPipelineEvent {
  return { timestamp: new Date().toISOString(), agent, stage, status, summary, details };
}

function buildQualityGateEvent(agent: AgentTraceAgent, result: AgentQualityGateResult): AgentPipelineEvent {
  return buildPipelineEvent(agent, 'evaluate', result.pass ? 'completed' : result.severity === 'block' ? 'error' : 'skipped', result.pass ? 'Quality gate passed.' : `Quality gate ${result.outcome}: ${result.complaints.join('; ').slice(0, 180)}`, {
    outcome: result.outcome,
    severity: result.severity,
    complaints: result.complaints.slice(0, 3),
    source: result.source,
  });
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
  fallbackRanking?: 'keyword' | 'rag_rerank';
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
  const graphEdges = buildTraceGraphEdges(nodes, params.agents.includes('cart-manager-agent') || params.actionTraceItems.length > 0);
  const playbackEvents = buildTracePlaybackEvents(graphEdges);
  return {
    traceId: randomUUID(),
    messageId: params.messageId,
    timestamp: new Date().toISOString(),
    intent: params.intent,
    agents: buildAgentOrder(params.agents),
    edges: buildAgentEdges(params.agents),
    nodes,
    graphEdges,
    playbackEvents,
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

function buildRuntimeAgents(
  agents: AgentTraceAgent[],
  recommendationResult: RecommendationAgentResult,
  actionTraceItems: AgentTrace['cart']['actions'],
  intent: SalesAgentIntent,
  contextDocumentCount: number,
  gateEvents: AgentPipelineEvent[],
  pipelineAgents: PipelineV2Agent[] = [],
): AgentTraceAgent[] {
  const next = new Set<AgentTraceAgent>(pipelineAgents);
  next.add('lead-agent');
  next.add('storage-memory-agent');
  if (agents.includes('memory-agent')) next.add('history-agent');
  if (agents.includes('product-manager-agent') || recommendationResult.products.length > 0 || ['recommend', 'compare', 'product_detail'].includes(intent)) next.add('search-agent');
  if (recommendationResult.products.length > 0 || ['recommend', 'compare', 'product_detail'].includes(intent)) next.add('recommendation-agent');
  if (contextDocumentCount > 0 || intent === 'policy') next.add('rag-agent');
  if (actionTraceItems.length > 0 || intent === 'cart_action' || intent === 'cart_status') next.add('cart-agent');
  if (intent === 'policy') next.add('customer-support-agent');
  if (gateEvents.length > 0) next.add('security-agent');
  next.add('sales-agent');
  return buildAgentOrder([...next]);
}

function buildAgentOrder(agents: AgentTraceAgent[]): AgentTraceAgent[] {
  const order: AgentTraceAgent[] = [
    'lead-agent',
    'storage-memory-agent',
    'history-agent',
    'search-agent',
    'recommendation-agent',
    'rag-agent',
    'cart-agent',
    'security-agent',
    'customer-support-agent',
    'sales-agent',
    'memory-agent',
    'user-analysis-agent',
    'product-manager-agent',
    'retrieval-agent',
    'cart-manager-agent',
    'sales-evaluator-agent',
  ];
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
    { id: 'pipeline-executor', label: 'Pipeline executor', kind: 'service', status: 'completed', detail: 'ExecutionPlan', order: 0, shortCode: 'FLOW' },
    { id: 'session-context', label: 'Session context', kind: 'text', status: 'completed', detail: `${params.memoryContext.recentTurns.length} turns, ${params.memoryContext.preferences.length} prefs, ${params.contextDocumentCount} docs`, order: 1, shortCode: 'CTX' },
    { id: 'task-context', label: 'Task workspace', kind: 'text', status: 'completed', detail: 'shared task refs and agent results', order: 2, shortCode: 'TASK' },
    ...agentNodes,
    { id: 'postgres-db', label: 'Postgres DB', kind: 'db', status: 'completed', detail: 'app data', order: 10, shortCode: 'PG' },
    { id: 'qdrant-db', label: 'Qdrant DB', kind: 'vector_db', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: `${params.contextDocumentCount} context docs`, order: 11, shortCode: 'VDB' },
    { id: 'memory-db', label: 'DB chat history', kind: 'db', status: 'completed', detail: `${params.memoryContext.recentTurns.length} recent turns`, order: 20 },
    { id: 'memory-preferences', label: 'DB preferences', kind: 'db', status: 'completed', detail: `${params.memoryContext.preferences.length} keys`, order: 21 },
    { id: 'memory-wiki', label: 'Wiki memory graph', kind: 'text', status: params.memoryInvestigation.visitedNodes.length ? 'completed' : 'skipped', detail: `${params.memoryInvestigation.visitedNodes.length} nodes`, order: 22 },
    { id: 'memory-result', label: 'Memory result', kind: 'text', status: params.memoryInvestigation.confidence >= 0.5 ? 'completed' : 'skipped', detail: `${params.memoryInvestigation.referenceProductIds.length} product refs`, order: 23 },
    { id: 'analysis-result', label: 'Intent result', kind: 'text', status: 'completed', detail: params.intent, order: 24 },
    { id: 'product-db', label: 'Product database', kind: 'db', status: params.productManagerResult.mode === 'none' ? 'skipped' : 'completed', detail: `${params.productManagerResult.candidates.length} candidates`, order: 30 },
    { id: 'product-result', label: 'Product result', kind: 'text', status: params.productManagerResult.confidence >= 0.5 ? 'completed' : 'skipped', detail: `${params.productManagerResult.selectedProducts.length} selected`, order: 31 },
    { id: 'recommendation-result', label: 'Recommendation result', kind: 'text', status: params.recommendationResult.status === 'approved' ? 'completed' : 'skipped', detail: `${params.recommendationResult.products.length} display`, order: 32 },
    { id: 'keyword-selector', label: 'Keyword selector', kind: 'service', status: params.productManagerResult.selectedProducts.length ? 'completed' : 'skipped', detail: params.productManagerResult.mode, order: 33 },
    { id: 'knowledge-db', label: 'Knowledge DB', kind: 'db', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: 'policy/faq', order: 40 },
    { id: 'rag-context', label: 'Prompt context', kind: 'text', status: params.contextDocumentCount ? 'completed' : 'skipped', detail: `${params.contextDocumentCount} docs`, order: 41 },
    { id: 'cart-state', label: 'Cart DB state', kind: 'db', status: 'completed', detail: `${params.cartBefore.items.length} → ${params.cartAfter.items.length} lines`, order: 50 },
    ...actionNodes,
    { id: 'security-result', label: 'Security result', kind: 'text', status: params.agents.includes('security-agent') ? 'completed' : 'skipped', detail: 'guardrail', order: 70, shortCode: 'SEC' },
    { id: 'support-case', label: 'Support case', kind: 'service', status: params.agents.includes('customer-support-agent') ? 'completed' : 'skipped', detail: 'support handoff', order: 71, shortCode: 'SUP' },
    { id: 'llm-service', label: 'LLM service', kind: 'llm', status: 'completed', detail: 'model gateway', order: 79, shortCode: 'LLM' },
    { id: 'llm-call', label: 'LLM call', kind: 'llm', status: 'completed', detail: 'sales response', order: 80, shortCode: 'LLM' },
    { id: 'assistant-response', label: 'Assistant response', kind: 'text', status: 'completed', detail: 'frontend blocks', order: 90 },
  ];
}

function buildTraceGraphEdges(nodes: AgentTraceNode[], hasCartAction: boolean): AgentTraceGraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: AgentTraceGraphEdge[] = [
    { from: 'user-message', to: 'pipeline-executor', status: 'completed', order: -48, label: 'receive', direction: 'call' },
    { from: 'pipeline-executor', to: 'session-context', status: 'completed', order: -47.6, label: 'load session', direction: 'data' },
    { from: 'session-context', to: 'task-context', status: 'completed', order: -47, label: 'seed task', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -46, label: 'session context', direction: 'data' },
    { from: 'lead-agent', to: 'storage-memory-agent', status: 'completed', order: -28, label: 'context check', direction: 'call' },
    { from: 'task-context', to: 'storage-memory-agent', status: 'completed', order: -27.8, label: 'read task context', direction: 'data' },
    { from: 'storage-memory-agent', to: 'postgres-db', status: 'completed', order: -27, label: 'read memory', direction: 'call' },
    { from: 'postgres-db', to: 'storage-memory-agent', status: 'completed', order: -26, label: 'memory rows', direction: 'return' },
    { from: 'storage-memory-agent', to: 'history-agent', status: 'completed', order: -25, label: 'resolve history', direction: 'data' },
    { from: 'storage-memory-agent', to: 'task-context', status: 'completed', order: -24.8, label: 'memory brief', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -24.6, label: 'memory return', direction: 'return' },
    { from: 'lead-agent', to: 'user-analysis-agent', status: 'completed', order: -24.4, label: 'analyze intent', direction: 'call' },
    { from: 'task-context', to: 'user-analysis-agent', status: 'completed', order: -24.3, label: 'read task context', direction: 'data' },
    { from: 'lead-agent', to: 'search-agent', status: 'completed', order: -24, label: 'product search', direction: 'call' },
    { from: 'task-context', to: 'search-agent', status: 'completed', order: -23.8, label: 'read task context', direction: 'data' },
    { from: 'search-agent', to: 'postgres-db', status: 'completed', order: -23, label: 'exact search', direction: 'call' },
    { from: 'postgres-db', to: 'search-agent', status: 'completed', order: -22.8, label: 'candidate rows', direction: 'return' },
    { from: 'search-agent', to: 'task-context', status: 'completed', order: -22.6, label: 'search result', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -22.4, label: 'search return', direction: 'return' },
    { from: 'lead-agent', to: 'recommendation-agent', status: 'completed', order: -22, label: 'recommend from search result', direction: 'call' },
    { from: 'task-context', to: 'recommendation-agent', status: 'completed', order: -21.8, label: 'read task context', direction: 'data' },
    { from: 'lead-agent', to: 'rag-agent', status: 'completed', order: -21, label: 'grounding need', direction: 'call' },
    { from: 'task-context', to: 'rag-agent', status: 'completed', order: -20.8, label: 'read task context', direction: 'data' },
    { from: 'recommendation-agent', to: 'task-context', status: 'completed', order: -20.7, label: 'display contract', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -20.6, label: 'recommendation return', direction: 'return' },
    { from: 'rag-agent', to: 'qdrant-db', status: 'completed', order: -20, label: 'business vector search', direction: 'call' },
    { from: 'qdrant-db', to: 'rag-agent', status: 'completed', order: -19, label: 'reranked docs', direction: 'return' },
    { from: 'rag-agent', to: 'task-context', status: 'completed', order: -18.8, label: 'grounded context', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -18.6, label: 'rag return', direction: 'return' },
    { from: 'lead-agent', to: 'cart-agent', status: 'completed', order: -18, label: 'cart task', direction: 'call' },
    { from: 'task-context', to: 'cart-agent', status: 'completed', order: -17.8, label: 'read task context', direction: 'data' },
    { from: 'cart-agent', to: 'postgres-db', status: 'completed', order: -17, label: 'cart sql rag', direction: 'write' },
    { from: 'postgres-db', to: 'cart-agent', status: 'completed', order: -16.8, label: 'cart rows', direction: 'return' },
    { from: 'cart-agent', to: 'task-context', status: 'completed', order: -16.6, label: 'cart result', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -16.4, label: 'cart return', direction: 'return' },
    { from: 'lead-agent', to: 'security-agent', status: 'completed', order: -16, label: 'guardrail', direction: 'guard' },
    { from: 'task-context', to: 'security-agent', status: 'completed', order: -15.8, label: 'read task context', direction: 'data' },
    { from: 'security-agent', to: 'security-result', status: 'completed', order: -15, label: 'risk decision', direction: 'return' },
    { from: 'security-result', to: 'task-context', status: 'completed', order: -14.8, label: 'guard result', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -14.6, label: 'security return', direction: 'return' },
    { from: 'lead-agent', to: 'customer-support-agent', status: 'completed', order: -14, label: 'support route', direction: 'call' },
    { from: 'task-context', to: 'customer-support-agent', status: 'completed', order: -13.8, label: 'read task context', direction: 'data' },
    { from: 'customer-support-agent', to: 'support-case', status: 'completed', order: -13, label: 'case state', direction: 'write' },
    { from: 'support-case', to: 'task-context', status: 'completed', order: -12.8, label: 'support result', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -12.6, label: 'support return', direction: 'return' },
    { from: 'lead-agent', to: 'sales-agent', status: 'completed', order: -12, label: 'answer brief', direction: 'data' },
    { from: 'task-context', to: 'sales-agent', status: 'completed', order: -11.8, label: 'prompt context', direction: 'data' },
    { from: 'sales-agent', to: 'llm-service', status: 'completed', order: -11, label: 'compose', direction: 'call' },
    { from: 'llm-service', to: 'sales-agent', status: 'completed', order: -10, label: 'draft', direction: 'return' },
    { from: 'sales-agent', to: 'task-context', status: 'completed', order: -9.8, label: 'final draft', direction: 'write' },
    { from: 'task-context', to: 'session-context', status: 'completed', order: -9.7, label: 'persist context', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: -9.6, label: 'final answer ready', direction: 'return' },
    { from: 'lead-agent', to: 'assistant-response', status: 'completed', order: -9, label: 'final blocks', direction: 'return' },
    { from: 'lead-agent', to: 'memory-agent', status: 'completed', order: 1, label: 'gọi điều tra', direction: 'call' },
    { from: 'memory-agent', to: 'memory-db', status: 'completed', order: 2, label: 'đọc history', direction: 'call' },
    { from: 'memory-db', to: 'memory-agent', status: 'completed', order: 3, label: 'trả turns', direction: 'return' },
    { from: 'memory-agent', to: 'memory-preferences', status: 'completed', order: 4, label: 'đọc cache', direction: 'call' },
    { from: 'memory-preferences', to: 'memory-wiki', status: 'completed', order: 5, label: 'seed nodes', direction: 'data' },
    { from: 'memory-wiki', to: 'memory-result', status: 'completed', order: 6, label: 'resolve refs', direction: 'return' },
    { from: 'memory-result', to: 'user-analysis-agent', status: 'completed', order: 7, label: 'context', direction: 'data' },
    { from: 'lead-agent', to: 'user-analysis-agent', status: 'completed', order: 8, label: 'analyze', direction: 'call' },
    { from: 'user-analysis-agent', to: 'analysis-result', status: 'completed', order: 9, label: 'intent', direction: 'return' },
    { from: 'analysis-result', to: 'task-context', status: 'completed', order: 9.2, label: 'write analysis', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: 9.4, label: 'analysis return', direction: 'return' },
    { from: 'analysis-result', to: 'product-manager-agent', status: 'completed', order: 10, label: 'yêu cầu sản phẩm', direction: 'call' },
    { from: 'memory-result', to: 'product-manager-agent', status: 'completed', order: 11, label: 'product refs', direction: 'data' },
    { from: 'product-manager-agent', to: 'product-db', status: 'completed', order: 12, label: 'search/resolve', direction: 'call' },
    { from: 'product-db', to: 'keyword-selector', status: 'completed', order: 13, label: 'facet candidates', direction: 'data' },
    { from: 'keyword-selector', to: 'product-result', status: 'completed', order: 14, label: 'selected', direction: 'return' },
    { from: 'product-result', to: 'recommendation-agent', status: 'completed', order: 15, label: 'presentation plan', direction: 'data' },
    { from: 'recommendation-agent', to: 'recommendation-result', status: 'completed', order: 16, label: 'handoff', direction: 'return' },
    { from: 'recommendation-result', to: 'retrieval-agent', status: 'completed', order: 17, label: 'grounding', direction: 'data' },
    { from: 'retrieval-agent', to: 'knowledge-db', status: 'completed', order: 18, label: 'policy lookup', direction: 'call' },
    { from: 'knowledge-db', to: 'rag-context', status: 'completed', order: 19, label: 'docs', direction: 'data' },
    { from: 'recommendation-result', to: 'rag-context', status: 'completed', order: 20, label: 'product docs', direction: 'data' },
    { from: 'rag-context', to: 'sales-agent', status: 'completed', order: 22, label: 'prompt sections', direction: 'data' },
    { from: 'sales-agent', to: 'llm-call', status: 'completed', order: 23, label: 'gọi model', direction: 'call' },
    { from: 'llm-call', to: 'sales-agent', status: 'completed', order: 24, label: 'tokens', direction: 'return' },
    { from: 'sales-agent', to: 'task-context', status: 'completed', order: 24.5, label: 'draft blocks', direction: 'write' },
    { from: 'task-context', to: 'session-context', status: 'completed', order: 24.7, label: 'persist context', direction: 'write' },
    { from: 'task-context', to: 'lead-agent', status: 'completed', order: 24.8, label: 'final answer ready', direction: 'return' },
    { from: 'lead-agent', to: 'assistant-response', status: 'completed', order: 25, label: 'blocks', direction: 'return' },
  ];
  if (hasCartAction) {
    edges.push(
      { from: 'product-result', to: 'cart-manager-agent', status: 'completed', order: 30, label: 'targets', direction: 'data' },
      { from: 'cart-manager-agent', to: 'cart-state', status: 'completed', order: 31, label: 'đọc giỏ', direction: 'call' },
      { from: 'cart-state', to: 'cart-manager-agent', status: 'completed', order: 32, label: 'cart hiện tại', direction: 'return' },
      { from: 'cart-manager-agent', to: 'cart-tool-1', status: 'completed', order: 33, label: 'execute', direction: 'call' },
      { from: 'cart-tool-1', to: 'cart-state', status: 'completed', order: 34, label: 'write cart', direction: 'data' },
      { from: 'cart-state', to: 'task-context', status: 'completed', order: 35, label: 'tool result', direction: 'write' },
      { from: 'task-context', to: 'lead-agent', status: 'completed', order: 35.2, label: 'cart tool return', direction: 'return' },
    );
  }
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}

function buildTracePlaybackEvents(graphEdges: AgentTraceGraphEdge[]): NonNullable<AgentTrace['playbackEvents']> {
  return graphEdges
    .filter((edge) => edge.status !== 'skipped')
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((edge, index) => ({
      id: `live_${index}_${compactTraceId(edge.from)}_${compactTraceId(edge.to)}`,
      from: edge.from,
      to: edge.to,
      order: edge.order ?? index,
      direction: edge.direction ?? 'call',
      status: edge.status ?? 'completed',
      label: edge.label,
    }));
}

function compactTraceId(value: string): string {
  return value.toLocaleLowerCase('vi-VN').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'node';
}

function summarizeGraphNode(agent: AgentTraceAgent): string {
  if (agent === 'lead-agent') return 'Lead dieu phoi';
  if (agent === 'storage-memory-agent') return 'Bo nho tong';
  if (agent === 'history-agent') return 'Lich su';
  if (agent === 'search-agent') return 'Tim kiem';
  if (agent === 'cart-agent') return 'Gio hang';
  if (agent === 'rag-agent') return 'RAG';
  if (agent === 'security-agent') return 'Bao mat';
  if (agent === 'customer-support-agent') return 'Ho tro';
  if (agent === 'sales-agent') return 'Sales';
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
  if (agent === 'lead-agent') return `Dieu phoi intent ${intent}, chon agent can hoi va danh gia cau tra loi truoc khi tra frontend.`;
  if (agent === 'storage-memory-agent') return 'Quan ly bo nho tong, doc/ghi ngu canh on dinh va goi history khi cau hoi mo ho.';
  if (agent === 'history-agent') return 'Tra cuu lich su gan, trung han, dai han de resolve tham chieu trong hoi thoai.';
  if (agent === 'search-agent') return 'Tim san pham bang exact search, keyword facet va mo rong nhom lien quan.';
  if (agent === 'cart-agent') return 'SQL RAG cho gio hang: tu lap truy van, kiem loi, hop nhat ket qua va tra ve lead-agent.';
  if (agent === 'rag-agent') return 'Truy xuat tai lieu nghiep vu bang embedding, Qdrant va rerank truoc khi dua vao context.';
  if (agent === 'security-agent') return 'Kiem duyet input/output va chan rui ro truoc khi cau tra loi den nguoi dung.';
  if (agent === 'customer-support-agent') return 'Xu ly loi, doi tra, khieu nai va tao handoff ho tro khi can.';
  if (agent === 'sales-agent') return 'Bien brief cua lead-agent thanh cau tra loi ban hang tu nhien, khop san pham hien tren chat.';
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

function statusForResolution(analysis: UserAnalysis): string {
  if (analysis.intent === 'policy') return 'Đang tra cứu chính sách và hỗ trợ';
  if (analysis.intent === 'cart_status') return 'Đang đọc trạng thái giỏ hàng';
  if (analysis.intent === 'cart_action' || analysis.intent === 'confirm_pending' || analysis.intent === 'cancel_pending') return 'Đang kiểm tra thao tác giỏ hàng';
  if (analysis.intent === 'smalltalk') return 'Đang kiểm tra phạm vi hỗ trợ';
  if (analysis.intent === 'compare') return 'Đang chọn sản phẩm để so sánh';
  if (analysis.intent === 'product_detail') return 'Đang lấy chi tiết sản phẩm';
  return 'Đang tìm sản phẩm phù hợp';
}

function statusForGrounding(analysis: UserAnalysis): string {
  if (analysis.intent === 'policy') return 'Đang neo câu trả lời vào tài liệu chính sách';
  if (analysis.intent === 'cart_action' || analysis.intent === 'cart_status') return 'Đang xác minh dữ liệu giỏ hàng';
  if (analysis.intent === 'smalltalk') return 'Đang kiểm duyệt câu trả lời';
  return 'Đang kiểm tra nguồn sản phẩm';
}

function statusForDraft(analysis: UserAnalysis): string {
  if (analysis.intent === 'policy') return 'Đang soạn trả lời chính sách';
  if (analysis.intent === 'cart_action' || analysis.intent === 'cart_status' || analysis.intent === 'confirm_pending' || analysis.intent === 'cancel_pending') return 'Đang soạn cập nhật giỏ hàng';
  if (analysis.intent === 'smalltalk') return 'Đang soạn phản hồi phù hợp';
  if (analysis.intent === 'compare') return 'Đang soạn phần so sánh';
  return 'Đang soạn tư vấn sản phẩm';
}

function shouldSearchKnowledge(analysis: UserAnalysis, message: string): boolean {
  if (analysis.intent === 'policy') return true;
  if (analysis.intent === 'smalltalk' || analysis.intent === 'cart_status' || analysis.intent === 'cart_action' || analysis.intent === 'confirm_pending' || analysis.intent === 'cancel_pending') return false;
  return /cửa hàng|cua hang|retailhome|giới thiệu|gioi thieu|liên hệ|lien he|hotline|địa chỉ|dia chi|khuyến mãi|khuyen mai|ưu đãi|uu dai|voucher|hậu mãi|hau mai|bảo hành|bao hanh|đổi trả|doi tra|hoàn tiền|hoan tien|vận chuyển|van chuyen|chính sách|chinh sach|giao hàng|giao hang|thanh toán|thanh toan|trả góp|tra gop/.test(normalize(message));
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}

function stripVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
