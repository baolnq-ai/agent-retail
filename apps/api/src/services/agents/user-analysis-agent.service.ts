import { Injectable } from '@nestjs/common';
import type { MemoryInvestigationResult, PendingCartPlan, RetrievalMode, UserAnalysis } from '../../models/agent-execution.models.js';
import { detectSalesIntent } from '../agent-orchestrator.service.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';

@Injectable()
export class UserAnalysisAgentService {
  constructor(
    private readonly modelGatewayService?: ModelGatewayService,
    private readonly agentHistoryService?: AgentHistoryService,
  ) {}

  async analyze(params: { userId?: string; message: string; pendingPlan?: PendingCartPlan; memoryInvestigation?: MemoryInvestigationResult }): Promise<UserAnalysis> {
    const fallback = buildRuleAnalysis(params);
    if (!this.modelGatewayService) return { ...fallback, decisionSource: 'fallback' };
    const history = await this.agentHistoryService?.getHistory(params.userId, 'user-analysis-agent');
    try {
      const response = await this.modelGatewayService.chat({
        maxTokens: 360,
        temperature: 0,
        messages: [
          { role: 'system', content: 'Bạn là user-analysis-agent. Trả về JSON thuần, không markdown. Nhiệm vụ: phân tích intent, cartOperation, retrievalMode, references, constraints cho chatbot bán hàng. Dùng preSignal như gợi ý, nhưng quyết định theo ngữ cảnh user và memory.' },
          { role: 'user', content: buildAnalysisPrompt(params, fallback, history?.summary) },
        ],
      });
      const analysis = readUserAnalysis(response.content, fallback);
      await this.agentHistoryService?.appendHistory(params.userId, 'user-analysis-agent', {
        status: 'completed',
        inputSummary: params.message.slice(0, 180),
        outputSummary: `${analysis.intent}/${analysis.retrievalMode}${analysis.cartOperation ? `/${analysis.cartOperation}` : ''}`,
        complaints: [],
        source: 'llm',
      });
      return { ...analysis, decisionSource: 'llm' };
    } catch (error) {
      await this.agentHistoryService?.appendHistory(params.userId, 'user-analysis-agent', {
        status: 'error',
        inputSummary: params.message.slice(0, 180),
        outputSummary: `${fallback.intent}/${fallback.retrievalMode}`,
        complaints: [error instanceof Error ? error.message.slice(0, 180) : 'LLM analysis failed'],
        source: 'fallback',
      });
      return { ...fallback, decisionSource: 'fallback' };
    }
  }
}

function buildRuleAnalysis(params: { message: string; pendingPlan?: PendingCartPlan; memoryInvestigation?: MemoryInvestigationResult }): UserAnalysis {
    const normalizedMessage = normalize(params.message);
    if (params.pendingPlan && /^(đúng|dung|ok|okay|ừ|uh|xác nhận|xac nhan|chốt|chot)$/i.test(normalizedMessage.trim())) {
      return baseAnalysis('confirm_pending', 0.98, 'none', false);
    }
    if (params.pendingPlan && /^(không|khong|huỷ|hủy|huy|thôi|thoi|cancel)$/i.test(normalizedMessage.trim())) {
      return baseAnalysis('cancel_pending', 0.98, 'none', false);
    }

    const references = detectReferences(normalizedMessage, params.memoryInvestigation);
    const detectedIntent = detectSalesIntent(params.message);
    const cartOperation = detectedIntent === 'cart_status' ? undefined : detectCartOperation(normalizedMessage, references);
    const intent = cartOperation ? 'cart_action' : references.anotherOption ? 'recommend' : detectedIntent;
    const retrievalMode = detectRetrievalMode(intent, references, params.memoryInvestigation);
    const analysis = baseAnalysis(intent, cartOperation ? 0.9 : 0.78, retrievalMode, shouldShowProducts(intent, retrievalMode, cartOperation));
    analysis.cartOperation = cartOperation;
    analysis.quantity = detectQuantity(normalizedMessage, cartOperation);
    analysis.references = references;
    analysis.constraints = detectConstraints(normalizedMessage);
    if (params.memoryInvestigation?.requiresHistory && params.memoryInvestigation.confidence < 0.5 && (cartOperation || references.demonstrative)) {
      analysis.needsClarification = 'Mình chưa xác định được bạn đang nói tới sản phẩm nào trong lịch sử chat.';
      analysis.confidence = Math.min(analysis.confidence, 0.45);
    }
    return analysis;
}

function buildAnalysisPrompt(params: { message: string; pendingPlan?: PendingCartPlan; memoryInvestigation?: MemoryInvestigationResult }, fallback: UserAnalysis, historySummary: string | undefined): string {
  return JSON.stringify({
    outputSchema: {
      intent: 'recommend|compare|product_detail|policy|cart_action|cart_status|confirm_pending|cancel_pending|smalltalk',
      cartOperation: 'clear|add|remove|set_quantity|increment_quantity|decrement_quantity|undefined',
      retrievalMode: 'none|recent|fresh|alternatives',
      shouldShowProducts: 'boolean',
      quantity: 'optional quantity object',
      references: 'object with productName/ordinal/demonstrative/useLastRecommendation/useCurrentCartItem/newProduct/previousProduct/anotherOption/allLastRecommendations/resolvedProductIds',
      constraints: 'object with budgetMax/budgetMin/category/roomSize/brand',
      confidence: '0..1',
      needsClarification: 'optional string',
    },
    message: params.message,
    pendingPlan: params.pendingPlan ? { id: params.pendingPlan.id, operations: params.pendingPlan.operations, resolvedProductIds: params.pendingPlan.resolvedProductIds } : undefined,
    memoryInvestigation: params.memoryInvestigation,
    agentHistory: historySummary,
    preSignal: fallback,
    rules: [
      'Nếu khách nói xem/coi/mở/kiểm tra giỏ hàng hoặc hỏi giỏ hàng đang có gì thì intent=cart_status, cartOperation=undefined, retrievalMode=none, shouldShowProducts=false.',
      'Nếu khách nói cho nhiều sản phẩm hơn/xem thêm/gợi ý thêm thì intent=recommend và retrievalMode=alternatives.',
      'Nếu khách nói thêm/mua/bỏ vào giỏ và memory đã resolve product ids thì intent=cart_action, cartOperation=add, retrievalMode=recent.',
      'Nếu hỏi chính sách thuần thì không show products.',
      'Chỉ hỏi lại khi thật sự thiếu target hoặc thiếu điều kiện quan trọng.',
    ],
  });
}

function readUserAnalysis(content: string, fallback: UserAnalysis): UserAnalysis {
  const parsed = JSON.parse(stripJsonFence(content)) as Partial<UserAnalysis>;
  const intent = isIntent(parsed.intent) ? parsed.intent : fallback.intent;
  const retrievalMode = isRetrievalMode(parsed.retrievalMode) ? parsed.retrievalMode : fallback.retrievalMode;
  const cartOperation = isCartOperation(parsed.cartOperation) ? parsed.cartOperation : undefined;
  return {
    ...fallback,
    ...parsed,
    intent,
    retrievalMode,
    cartOperation,
    shouldShowProducts: typeof parsed.shouldShowProducts === 'boolean' ? parsed.shouldShowProducts : fallback.shouldShowProducts,
    references: typeof parsed.references === 'object' && parsed.references ? parsed.references : fallback.references,
    constraints: typeof parsed.constraints === 'object' && parsed.constraints ? parsed.constraints : fallback.constraints,
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : fallback.confidence,
  };
}

function stripJsonFence(content: string): string {
  return content.replace(/```json|```/gi, '').trim();
}

function isIntent(value: unknown): value is UserAnalysis['intent'] {
  return value === 'recommend' || value === 'compare' || value === 'product_detail' || value === 'policy' || value === 'cart_action' || value === 'cart_status' || value === 'confirm_pending' || value === 'cancel_pending' || value === 'smalltalk';
}

function isRetrievalMode(value: unknown): value is RetrievalMode {
  return value === 'none' || value === 'recent' || value === 'fresh' || value === 'alternatives';
}

function isCartOperation(value: unknown): value is UserAnalysis['cartOperation'] {
  return value === 'clear' || value === 'add' || value === 'remove' || value === 'set_quantity' || value === 'increment_quantity' || value === 'decrement_quantity';
}

function baseAnalysis(intent: UserAnalysis['intent'], confidence: number, retrievalMode: RetrievalMode, shouldShowProducts: boolean): UserAnalysis {
  return {
    intent,
    retrievalMode,
    shouldShowProducts,
    references: {},
    constraints: {},
    confidence,
  };
}

function detectCartOperation(normalizedMessage: string, references: UserAnalysis['references']): UserAnalysis['cartOperation'] | undefined {
  const mentionsCart = /giỏ|cart|sản phẩm|món|cái|này|đó|thứ|số/.test(normalizedMessage);
  const hasResolvedHistoryTarget = Boolean(references.resolvedProductIds?.length);
  if (/(xóa|xoá|dọn|clear|empty).*(hết|toàn bộ|giỏ|cart)|(?:giỏ|cart).*(xóa|xoá|dọn|clear|empty)/.test(normalizedMessage)) return 'clear';
  if (/(giảm|bớt|decrease|trừ)/.test(normalizedMessage) && mentionsCart) return 'decrement_quantity';
  if (/(tăng|thêm số lượng|increase|cộng)/.test(normalizedMessage) && mentionsCart) return 'increment_quantity';
  if (/(sửa|đổi|cập nhật|update|set).*(số lượng|quantity|thành)|(?:số lượng|quantity).*(thành|là|=)/.test(normalizedMessage)) return 'set_quantity';
  if (/(xóa|xoá|gỡ|remove).*(khỏi giỏ|giỏ|cart|sản phẩm|món|này)/.test(normalizedMessage)) return 'remove';
  if (/(thêm|add|mua|bỏ).*(giỏ|cart)|mua/.test(normalizedMessage)) return 'add';
  if (hasResolvedHistoryTarget && /^(thêm|add|lấy|chọn|mua)\b/.test(normalizedMessage)) return 'add';
  return undefined;
}

function detectQuantity(normalizedMessage: string, operation: UserAnalysis['cartOperation']): UserAnalysis['quantity'] | undefined {
  if (!operation) return undefined;
  const number = parseVietnameseNumber(normalizedMessage);
  const targetMatch = normalizedMessage.match(/(?:thành|là|=|số lượng)\s*(\d+)/);
  if (operation === 'set_quantity') {
    const targetQuantity = targetMatch ? Number.parseInt(targetMatch[1], 10) : number ?? 1;
    return { targetQuantity: Math.max(0, targetQuantity), mentionedQuantity: number, implicitOne: number === undefined };
  }
  if (operation === 'increment_quantity' || operation === 'decrement_quantity') {
    const delta = Math.max(1, number ?? 1);
    return { delta, mentionedQuantity: number, implicitOne: number === undefined };
  }
  const quantity = Math.max(1, number ?? 1);
  return { targetQuantity: quantity, mentionedQuantity: number, implicitOne: number === undefined };
}

function detectReferences(normalizedMessage: string, memoryInvestigation: MemoryInvestigationResult | undefined): UserAnalysis['references'] {
  const references: UserAnalysis['references'] = {};
  const ordinal = parseOrdinal(normalizedMessage);
  if (ordinal) references.ordinal = ordinal;
  if (/này|đó|vừa rồi|trên|đang chọn/.test(normalizedMessage)) references.demonstrative = true;
  if (/vừa đề xuất|đã gợi ý|recommend|gợi ý/.test(normalizedMessage)) references.useLastRecommendation = true;
  if (/trong giỏ|giỏ hàng|cart/.test(normalizedMessage)) references.useCurrentCartItem = true;
  if (/sản phẩm mới|mẫu mới|cái mới/.test(normalizedMessage)) references.newProduct = true;
  if (/vừa rồi|trước đó|lúc nãy/.test(normalizedMessage)) references.previousProduct = true;
  if (/sản phẩm khác|mẫu khác|cái khác|khác|nhiều sản phẩm hơn|thêm lựa chọn|thêm gợi ý|gợi ý thêm|xem thêm/.test(normalizedMessage)) references.anotherOption = true;
  if (/thêm hết|tất cả|cả \d|mấy cái đó|các cái đó/.test(normalizedMessage)) references.allLastRecommendations = true;
  if (memoryInvestigation?.referenceProductIds.length) references.resolvedProductIds = memoryInvestigation.referenceProductIds;
  const productNameMatch = normalizedMessage.match(/(?:sản phẩm|món|máy|nồi|robot|camera|đèn|quạt|lọc|bếp)\s+(.+?)(?:\s+(?:trong giỏ|lên|thành|vào giỏ|ra khỏi|đi|$))/);
  if (productNameMatch && !references.newProduct && !references.anotherOption) references.productName = productNameMatch[0].trim();
  return references;
}

function detectRetrievalMode(intent: UserAnalysis['intent'], references: UserAnalysis['references'], memoryInvestigation: MemoryInvestigationResult | undefined): RetrievalMode {
  if (references.anotherOption) return 'alternatives';
  if (references.resolvedProductIds?.length && (references.newProduct || references.previousProduct || references.allLastRecommendations || references.useLastRecommendation)) return 'recent';
  if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') return 'fresh';
  if (memoryInvestigation?.resolvedReference && memoryInvestigation.referenceProductIds.length > 0) return 'recent';
  return 'none';
}

function shouldShowProducts(intent: UserAnalysis['intent'], retrievalMode: RetrievalMode, cartOperation: UserAnalysis['cartOperation']): boolean {
  if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') return retrievalMode !== 'none';
  return cartOperation === 'add' && retrievalMode === 'recent';
}

function detectConstraints(normalizedMessage: string): UserAnalysis['constraints'] {
  const constraints: UserAnalysis['constraints'] = {};
  const under = normalizedMessage.match(/(?:dưới|duoi|không quá|toi da|tối đa)\s*(\d+(?:[,.]\d+)?)\s*(triệu|tr|k|nghìn|ngàn)?/);
  const over = normalizedMessage.match(/(?:trên|tren|hơn|hon|từ)\s*(\d+(?:[,.]\d+)?)\s*(triệu|tr|k|nghìn|ngàn)?/);
  if (under) constraints.budgetMax = parseMoney(under[1], under[2]);
  if (over) constraints.budgetMin = parseMoney(over[1], over[2]);
  const roomSize = normalizedMessage.match(/(\d+)\s*m2/);
  if (roomSize) constraints.roomSize = `${roomSize[1]}m2`;
  for (const category of ['máy lọc', 'robot', 'camera', 'đèn', 'quạt', 'nồi', 'bếp']) {
    if (normalizedMessage.includes(category)) constraints.category = category;
  }
  return constraints;
}

function parseMoney(value: string, unit: string | undefined): number {
  const number = Number.parseFloat(value.replace(',', '.'));
  if (/triệu|tr/.test(unit ?? '')) return number * 1_000_000;
  if (/k|nghìn|ngàn/.test(unit ?? '')) return number * 1_000;
  return number;
}

function parseOrdinal(normalizedMessage: string): number | undefined {
  if (/đầu tiên|thứ nhất|số 1|cái 1/.test(normalizedMessage)) return 1;
  if (/thứ hai|số 2|cái 2/.test(normalizedMessage)) return 2;
  if (/thứ ba|số 3|cái 3/.test(normalizedMessage)) return 3;
  const match = normalizedMessage.match(/(?:thứ|số|cái)\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseVietnameseNumber(normalizedMessage: string): number | undefined {
  const match = normalizedMessage.match(/\b(\d+)\b/);
  if (match) return Number.parseInt(match[1], 10);
  if (/không|zero/.test(normalizedMessage)) return 0;
  if (/một|mot/.test(normalizedMessage)) return 1;
  if (/hai/.test(normalizedMessage)) return 2;
  if (/ba/.test(normalizedMessage)) return 3;
  if (/bốn|bon|tư/.test(normalizedMessage)) return 4;
  if (/năm|nam/.test(normalizedMessage)) return 5;
  return undefined;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}
