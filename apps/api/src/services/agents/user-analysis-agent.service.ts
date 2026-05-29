import { Injectable } from '@nestjs/common';
import type { MemoryInvestigationResult, PendingCartPlan, RetrievalMode, UserAnalysis } from '../../models/agent-execution.models.js';
import { detectSalesIntent } from '../agent-orchestrator.service.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';
import { PromptSettingsService } from '../prompt-settings.service.js';

@Injectable()
export class UserAnalysisAgentService {
  constructor(
    private readonly modelGatewayService?: ModelGatewayService,
    private readonly agentHistoryService?: AgentHistoryService,
    private readonly promptSettingsService?: PromptSettingsService,
  ) {}

  async analyze(params: { userId?: string; message: string; pendingPlan?: PendingCartPlan; memoryInvestigation?: MemoryInvestigationResult }): Promise<UserAnalysis> {
    const fallback = buildRuleAnalysis(params);
    if (!this.modelGatewayService || process.env.AGENT_LLM_USER_ANALYSIS !== '1') return { ...fallback, decisionSource: 'fallback' };
    try {
      const response = await this.modelGatewayService.chat({
        maxTokens: 360,
        temperature: 0,
        messages: [
          { role: 'system', content: await this.promptSettingsService?.getContent('user-analysis-system') || 'Bạn là user-analysis-agent. Trả về JSON thuần, không markdown. Nhiệm vụ: phân tích intent, cartOperation, retrievalMode, references, constraints cho chatbot bán hàng. Dùng preSignal như gợi ý, nhưng quyết định theo ngữ cảnh user và memory.' },
          { role: 'user', content: buildAnalysisPrompt(params, fallback) },
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
    const asciiMessage = stripVietnameseTone(normalizedMessage).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (isUnsafeOrOutOfScopeMessage(asciiMessage)) {
      return baseAnalysis('smalltalk', 0.98, 'none', false);
    }
    if (params.pendingPlan && /^(dung|ok|okay|uh|u|xac nhan|chot)(?:\s|$)|(?:^|\s)(xac nhan|chot)(?:\s|$)/i.test(asciiMessage)) {
      return baseAnalysis('confirm_pending', 0.98, 'none', false);
    }
    if (params.pendingPlan && /^(khong|huy|thoi|cancel|bo qua)(?:\s|$)|(?:^|\s)(huy|cancel|bo qua)\s+(thao tac|yeu cau|plan)/i.test(asciiMessage)) {
      return baseAnalysis('cancel_pending', 0.98, 'none', false);
    }
    if (!params.pendingPlan && /(?:^|\s)(huy|cancel|bo qua)\s+(thao tac|yeu cau|plan|do)/i.test(asciiMessage)) {
      return baseAnalysis('cancel_pending', 0.9, 'none', false);
    }
    if (!params.pendingPlan && asciiMessage.length <= 24 && /^(dung|ok|okay|xac nhan|chot)(?:\s|$)|(?:^|\s)(xac nhan|chot)(?:\s|$)/i.test(asciiMessage)) {
      return baseAnalysis('confirm_pending', 0.9, 'none', false);
    }
    if (params.pendingPlan && /^(đúng|dung|ok|okay|ừ|uh|xác nhận|xac nhan|chốt|chot)$/i.test(normalizedMessage.trim())) {
      return baseAnalysis('confirm_pending', 0.98, 'none', false);
    }
    if (params.pendingPlan && /^(không|khong|huỷ|hủy|huy|thôi|thoi|cancel)$/i.test(normalizedMessage.trim())) {
      return baseAnalysis('cancel_pending', 0.98, 'none', false);
    }

    const references = detectReferences(normalizedMessage, params.memoryInvestigation);
    const detectedIntent = detectSalesIntent(params.message);
    const isDiscoveryRequest = isProductDiscoveryRequest(normalizedMessage);
    const cartOperation = detectedIntent === 'cart_status' || detectedIntent === 'policy' || detectedIntent === 'compare' || detectedIntent === 'smalltalk' || isDiscoveryRequest ? undefined : detectCartOperation(normalizedMessage, references);
    const canUseAlternativeIntent = detectedIntent !== 'policy' && detectedIntent !== 'cart_status';
    const intent = cartOperation ? 'cart_action' : references.anotherOption && canUseAlternativeIntent ? 'recommend' : detectedIntent === 'smalltalk' && isProductDiscoveryRequest(normalizedMessage) ? 'recommend' : detectedIntent;
    const retrievalMode = detectRetrievalMode(intent, references, params.memoryInvestigation, cartOperation);
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

function buildAnalysisPrompt(params: { message: string; pendingPlan?: PendingCartPlan; memoryInvestigation?: MemoryInvestigationResult }, fallback: UserAnalysis): string {
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
    preSignal: fallback,
    rules: [
      'Ưu tiên câu hỏi hiện tại. Không mượn intent/constraints từ lịch sử agent cũ nếu câu mới đã rõ.',
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
  const references = typeof parsed.references === 'object' && parsed.references ? { ...fallback.references, ...parsed.references } : fallback.references;
  const hasExplicitProductReference = Boolean(references.resolvedProductIds?.some((productId) => /^prod_/i.test(productId)));
  const parsedIntent = isIntent(parsed.intent) ? parsed.intent : fallback.intent;
  const mustKeepFallbackIntent = fallback.intent === 'cart_action' || fallback.intent === 'cart_status' || fallback.intent === 'policy' || (fallback.intent === 'smalltalk' && fallback.retrievalMode === 'none' && fallback.shouldShowProducts === false);
  const shouldKeepFallbackProductIntent = isProductIntent(fallback.intent) && (!isProductIntent(parsedIntent) || fallback.intent === 'compare' || fallback.intent === 'product_detail');
  const intent = mustKeepFallbackIntent ? fallback.intent : hasExplicitProductReference && parsedIntent === 'smalltalk' ? 'product_detail' : shouldKeepFallbackProductIntent ? fallback.intent : parsedIntent;
  const parsedRetrievalMode = isRetrievalMode(parsed.retrievalMode) ? parsed.retrievalMode : fallback.retrievalMode;
  const shouldKeepProductRetrieval = isProductIntent(fallback.intent) && parsedRetrievalMode === 'none';
  const retrievalMode = mustKeepFallbackIntent || shouldKeepProductRetrieval ? fallback.retrievalMode : (hasExplicitProductReference || shouldKeepFallbackProductIntent) && parsedRetrievalMode === 'none' ? fallback.retrievalMode === 'none' ? 'fresh' : fallback.retrievalMode : parsedRetrievalMode;
  const cartOperation = fallback.intent === 'cart_action' ? fallback.cartOperation : intent === 'cart_action' && isCartOperation(parsed.cartOperation) ? parsed.cartOperation : undefined;
  const constraints = typeof parsed.constraints === 'object' && parsed.constraints ? { ...parsed.constraints, ...fallback.constraints } : fallback.constraints;
  return {
    ...fallback,
    ...parsed,
    intent,
    retrievalMode,
    cartOperation,
    shouldShowProducts: mustKeepFallbackIntent ? fallback.shouldShowProducts : (hasExplicitProductReference || shouldKeepFallbackProductIntent || fallback.shouldShowProducts) && isProductIntent(intent) ? true : typeof parsed.shouldShowProducts === 'boolean' ? parsed.shouldShowProducts : fallback.shouldShowProducts,
    references,
    constraints,
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

function isProductIntent(intent: UserAnalysis['intent']): boolean {
  return intent === 'recommend' || intent === 'compare' || intent === 'product_detail';
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
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  const asciiMentionsCart = /vao gio|bo vao gio|gio hang|cart|san pham|mon|cai|nay|do|thu|so/.test(asciiMessage);
  const asciiHasResolvedHistoryTarget = Boolean(references.resolvedProductIds?.length);
  if (/(giam|bot|decrease|tru).*(ve\s+(?:so luong\s+)?0|xuong\s+(?:so luong\s+)?0|thanh\s+(?:so luong\s+)?0)/.test(asciiMessage) && asciiMentionsCart) return 'set_quantity';
  if (/(?:^|\s)(xoa|go|remove)(?:\s|$).*(khoi gio|ra khoi gio|san pham|mon|cai|nay|do|thu|vua them|con lai)/.test(asciiMessage)) return 'remove';
  if (/(xoa\s+(?:het|toan bo|sach)|don sach|clear|empty).*(gio|cart)|(?:gio hang|cart).*(xoa\s+(?:het|toan bo|sach)|don sach|clear|empty)/.test(asciiMessage)) return 'clear';
  if (/(them|add|mua|bo).*(vao gio|bo vao gio|gio hang|cart)/.test(asciiMessage)) return 'add';
  if (/(tang|giam|bot|sua|doi|cap nhat|update|set).*(len|xuong|ve|thanh)\s*\d/.test(asciiMessage) && asciiMentionsCart) return 'set_quantity';
  if (/(?:^|\s)(giam|bot|decrease|tru)(?:\s|$)/.test(asciiMessage) && asciiMentionsCart) return 'decrement_quantity';
  if (/(tang|them so luong|increase|cong)/.test(asciiMessage) && asciiMentionsCart) return 'increment_quantity';
  if (/(sua|doi|cap nhat|update|set).*(so luong|quantity|thanh)|(?:so luong|quantity).*(thanh|la|=)/.test(asciiMessage)) return 'set_quantity';
  if (/(xoa|go|remove).*(khoi gio|\bgio\b|gio hang|cart|san pham|mon|nay)/.test(asciiMessage)) return 'remove';
  if (/(them|add|mua|bo).*(vao gio|bo vao gio|gio hang|cart)/.test(asciiMessage)) return 'add';
  if (asciiHasResolvedHistoryTarget && /^(them|add|lay|chon|mua)\b/.test(asciiMessage)) return 'add';
  const mentionsCart = /vào giỏ|bỏ vào giỏ|giỏ hàng|cart|sản phẩm|món|cái|này|đó|thứ|số/.test(normalizedMessage);
  const hasResolvedHistoryTarget = Boolean(references.resolvedProductIds?.length);
  if (/(xóa|xoá|dọn|clear|empty).*(hết|toàn bộ|giỏ|cart)|(?:giỏ|cart).*(xóa|xoá|dọn|clear|empty)/.test(normalizedMessage)) return 'clear';
  if (/(giảm|bớt|decrease|trừ)/.test(normalizedMessage) && mentionsCart) return 'decrement_quantity';
  if (/(tăng|thêm số lượng|increase|cộng)/.test(normalizedMessage) && mentionsCart) return 'increment_quantity';
  if (/(sửa|đổi|cập nhật|update|set).*(số lượng|quantity|thành)|(?:số lượng|quantity).*(thành|là|=)/.test(normalizedMessage)) return 'set_quantity';
  if (/(xóa|xoá|gỡ|remove).*(khỏi giỏ|giỏ|cart|sản phẩm|món|này)/.test(normalizedMessage)) return 'remove';
  if (/(thêm|add|mua|bỏ).*(vào giỏ|bỏ vào giỏ|giỏ hàng|cart)/.test(normalizedMessage)) return 'add';
  if (hasResolvedHistoryTarget && /^(thêm|add|lấy|chọn|mua)\b/.test(normalizedMessage)) return 'add';
  return undefined;
}

function isProductDiscoveryRequest(normalizedMessage: string): boolean {
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  if (/prod_[a-z0-9_]+/.test(asciiMessage)) return false;
  if (/san pham\s+(nay|do|hien tai)?.*bao hanh|bao hanh.*san pham\s+(nay|do|hien tai)?/.test(asciiMessage)) return false;
  if (/abcxyz|\?\?\?|@@@|cai gi do|khong biet nha toi can gi|khong chu de|noi linh tinh/.test(asciiMessage) && !hasNoisyShoppingNeed(asciiMessage)) return false;
  if (isUnsafeOrOutOfScopeMessage(asciiMessage)) return false;
  const hasProductTerm = /\b(san pham|mon|do|do dien|do gia dung|qua|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|ve sinh|cam bien|bao dong|smart home|ban chai|cham soc ca nhan|lam mat|quat thap|dieu hoa|may lanh|noi com|noi chien|may xay|phong|nha|can ho|chung cu|van phong|bep mo|em be|tre nho)\b/.test(asciiMessage);
  const asksForAdvice = /\b(can|muon|nao|hop|tot|goi y|de xuat|tu van|tim|chon|phu hop|nen mua|dang mua|co gi|co|chi co|ngan sach|gia|duoi|tren|khoang|lap dat|qua app|bao dong|uu tien|dat trong|tac dung|co ich|nho gon|mang di|cong tac|tam|dung duoc|dong nghiep)\b/.test(asciiMessage);
  const hasUseCaseOrArea = /\b(cho|dung cho|de|phong|nha|can ho|chung cu|van phong|bep|tre|em be|nguoi lon tuoi|thu cung|meo|dien tich)\b/.test(asciiMessage)
    || /\b\d+\s*(?:m2|m vuong|met vuong|m²)\b/.test(asciiMessage);
  const explicitCartAction = /(\bthem\b|add|bo|mua|xoa|\bgo\b|remove|don|clear|empty|sua|doi|cap nhat|update).*(vao gio|bo vao gio|khoi gio|ra khoi gio|gio hang|cart)|(?:gio hang|cart).*(xoa|\bgo\b|remove|don|clear|empty|sua|doi|cap nhat|update)/.test(asciiMessage);
  return hasProductTerm && (asksForAdvice || hasUseCaseOrArea) && !explicitCartAction;
}

function isUnsafeOrOutOfScopeMessage(asciiMessage: string): boolean {
  return /system prompt|prompt he thong|token api|api key|cookie|cau hinh noi bo|bo qua .*quy tac|in .*quy tac|giam gia 99|voucher.*99|xac nhan.*voucher|link thanh toan (?:gia|thu nghiem)|domain ngan hang|khong co that|tra loi trai nguoc|noi rang .*khong co nguon|bao hanh tron doi.*khong co nguon|tu van tinh cam|bai tho|lam tho|viet tho|bai van|du lich bien|giai bai toan|tich phan|ke .*kinh di/.test(asciiMessage);
}

function hasNoisyShoppingNeed(asciiMessage: string): boolean {
  return /(nha sach|lam nha sach|may loc|loc khong khi|bui|tre nho|em be|mui bep|nha nong|mua gi|duoi \d|tam \d|can .* san pham|goi y|tu van)/.test(asciiMessage);
}

function detectQuantity(normalizedMessage: string, operation: UserAnalysis['cartOperation']): UserAnalysis['quantity'] | undefined {
  if (!operation) return undefined;
  if (operation === 'add' && !hasExplicitAddQuantity(normalizedMessage)) {
    return { targetQuantity: 1, implicitOne: true };
  }
  const number = parseVietnameseNumber(normalizedMessage);
  const asciiTargetMatch = stripVietnameseTone(normalizedMessage).match(/(?:thanh|la|=|so luong|len|xuong|ve)\s*(\d+)/);
  const targetMatch = normalizedMessage.match(/(?:thành|là|=|số lượng)\s*(\d+)/);
  if (operation === 'set_quantity') {
    const targetQuantity = asciiTargetMatch ? Number.parseInt(asciiTargetMatch[1], 10) : targetMatch ? Number.parseInt(targetMatch[1], 10) : number ?? 1;
    return { targetQuantity: Math.max(0, targetQuantity), mentionedQuantity: number, implicitOne: number === undefined };
  }
  if (operation === 'increment_quantity' || operation === 'decrement_quantity') {
    const delta = Math.max(1, number ?? 1);
    return { delta, mentionedQuantity: number, implicitOne: number === undefined };
  }
  const quantity = Math.max(1, number ?? 1);
  return { targetQuantity: quantity, mentionedQuantity: number, implicitOne: number === undefined };
}

function hasExplicitAddQuantity(normalizedMessage: string): boolean {
  return /(?:\d+|một|mot|hai|ba|bốn|bon|tư|năm|nam)\s*(?:cái|sản phẩm|món|chiếc|bộ)\b/.test(normalizedMessage);
}

function detectReferences(normalizedMessage: string, memoryInvestigation: MemoryInvestigationResult | undefined): UserAnalysis['references'] {
  const references: UserAnalysis['references'] = {};
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  const ordinal = parseOrdinal(normalizedMessage);
  if (ordinal) references.ordinal = ordinal;
  if (/nay|do|vua roi|o tren|dang chon|vua them|mon vua them|san pham vua them|con lai/.test(asciiMessage)) references.demonstrative = true;
  if (/trong gio|gio hang|cart|vua them|mon vua them|san pham vua them|con lai/.test(asciiMessage)) references.useCurrentCartItem = true;
  if (/vua them|mon vua them|san pham vua them/.test(asciiMessage) && memoryInvestigation?.lastCartActionProductIds.length) {
    references.resolvedProductIds = memoryInvestigation.lastCartActionProductIds;
  }
  if (/de dung nhat|lua chon de dung|o tren/.test(asciiMessage) && memoryInvestigation?.lastSelectedProductIds.length) {
    references.resolvedProductIds = memoryInvestigation.lastSelectedProductIds;
  }
  if (/này|đó|vừa rồi|trên|đang chọn/.test(normalizedMessage)) references.demonstrative = true;
  if (/vừa đề xuất|đã gợi ý|recommend|gợi ý/.test(normalizedMessage)) references.useLastRecommendation = true;
  if (/trong giỏ|giỏ hàng|cart/.test(normalizedMessage)) references.useCurrentCartItem = true;
  if (/sản phẩm mới|mẫu mới|cái mới/.test(normalizedMessage)) references.newProduct = true;
  if (/vừa rồi|trước đó|lúc nãy/.test(normalizedMessage)) references.previousProduct = true;
  if (/sản phẩm khác|mẫu khác|cái khác|khác|nhiều sản phẩm hơn|thêm lựa chọn|thêm gợi ý|gợi ý thêm|xem thêm/.test(normalizedMessage)) references.anotherOption = true;
  if (/khac nhau|khac biet|so sanh/.test(asciiMessage)) references.anotherOption = false;
  if (/thêm hết|tất cả|cả \d|mấy cái đó|các cái đó/.test(normalizedMessage)) references.allLastRecommendations = true;
  if (memoryInvestigation?.referenceProductIds.length && !references.resolvedProductIds?.length) references.resolvedProductIds = memoryInvestigation.referenceProductIds;
  const explicitProductIds = extractProductIds(normalizedMessage);
  if (explicitProductIds.length) references.resolvedProductIds = uniqueStrings([...(references.resolvedProductIds ?? []), ...explicitProductIds]);
  const productNameMatch = normalizedMessage.match(/(?:sản phẩm|món|máy|nồi|robot|camera|đèn|quạt|lọc|bếp)\s+(.+?)(?:\s+(?:trong giỏ|lên|thành|vào giỏ|ra khỏi|đi|$))/);
  if (productNameMatch && !references.newProduct && !references.anotherOption) references.productName = productNameMatch[0].trim();
  const explicitCartProductName = detectExplicitCartProductName(normalizedMessage);
  if (explicitCartProductName && !references.productName && !references.anotherOption) references.productName = explicitCartProductName;
  return references;
}

function detectExplicitCartProductName(normalizedMessage: string): string | undefined {
  const match = normalizedMessage.match(/(?:thêm|add|mua|bỏ)\s+(.+?)(?:\s+(?:vào|vô|cho vào|bỏ vào)?\s*(?:giỏ|cart)\b|$)/);
  const rawName = match?.[1]
    ?.replace(/\s+(?:vào|vô|cho vào|bỏ vào)?\s*(?:giỏ|cart).*$/i, ' ')
    .replace(/\b(?:sản phẩm|món|cái|này|đó|nha|nhé|giúp mình|giúp tôi|đi)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return rawName && rawName.length > 1 ? rawName : undefined;
}

function detectRetrievalMode(intent: UserAnalysis['intent'], references: UserAnalysis['references'], memoryInvestigation: MemoryInvestigationResult | undefined, cartOperation?: UserAnalysis['cartOperation']): RetrievalMode {
  if (references.anotherOption) return 'alternatives';
  if (intent === 'cart_action' && cartOperation === 'add' && references.resolvedProductIds?.length) return 'recent';
  if (references.resolvedProductIds?.some((productId) => /^prod_/i.test(productId)) && (intent === 'recommend' || intent === 'compare' || intent === 'product_detail')) return 'fresh';
  if (references.resolvedProductIds?.length && (references.newProduct || references.previousProduct || references.allLastRecommendations || references.useLastRecommendation)) return 'recent';
  if (intent === 'cart_action' && cartOperation === 'add' && references.productName) return 'fresh';
  if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') return 'fresh';
  if (memoryInvestigation?.resolvedReference && memoryInvestigation.referenceProductIds.length > 0) return 'recent';
  return 'none';
}

function shouldShowProducts(intent: UserAnalysis['intent'], retrievalMode: RetrievalMode, cartOperation: UserAnalysis['cartOperation']): boolean {
  if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') return retrievalMode !== 'none';
  return cartOperation === 'add' && (retrievalMode === 'recent' || retrievalMode === 'fresh');
}

function detectConstraints(normalizedMessage: string): UserAnalysis['constraints'] {
  const constraints: UserAnalysis['constraints'] = {};
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  const asciiUnder = asciiMessage.match(/(?:duoi|khong qua|toi da)\s*(\d+(?:[,.]\d+)?)\s*(trieu|tr|k|nghin|ngan)?/);
  const asciiOver = asciiMessage.match(/(?:tren|hon|tu)\s*(\d+(?:[,.]\d+)?)\s*(trieu|tr|k|nghin|ngan)?/);
  if (asciiUnder) constraints.budgetMax = parseMoney(asciiUnder[1], asciiUnder[2]);
  if (asciiOver) constraints.budgetMin = parseMoney(asciiOver[1], asciiOver[2]);
  for (const category of ['may loc', 'robot', 'camera', 'den', 'quat', 'noi', 'bep', 'hut bui', 'lam mat', 'cham soc ca nhan', 'cam bien', 'ban chai']) {
    if (asciiMessage.includes(category)) constraints.category = category;
  }
  const under = normalizedMessage.match(/(?:dưới|duoi|không quá|toi da|tối đa)\s*(\d+(?:[,.]\d+)?)\s*(triệu|tr|k|nghìn|ngàn)?/);
  const over = normalizedMessage.match(/(?:trên|tren|hơn|hon|từ)\s*(\d+(?:[,.]\d+)?)\s*(triệu|tr|k|nghìn|ngàn)?/);
  if (under) constraints.budgetMax = parseMoney(under[1], under[2]);
  if (over) constraints.budgetMin = parseMoney(over[1], over[2]);
  const asciiRoomSize = asciiMessage.match(/(\d+)\s*(?:m2|m vuong|met vuong|m²)\b/);
  const roomSize = normalizedMessage.match(/(\d+)\s*(?:m2|m²|mét vuông|mét|m vuông)\b/);
  if (asciiRoomSize) constraints.roomSize = `${asciiRoomSize[1]}m2`;
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
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  if (/dau tien|thu nhat|so 1|cai 1/.test(asciiMessage)) return 1;
  if (/thu hai|so 2|cai 2/.test(asciiMessage)) return 2;
  if (/thu ba|so 3|cai 3/.test(asciiMessage)) return 3;
  const asciiMatch = asciiMessage.match(/(?:thu|so|cai)\s*(\d+)/);
  if (asciiMatch) return Number.parseInt(asciiMatch[1], 10);
  if (/đầu tiên|thứ nhất|số 1|cái 1/.test(normalizedMessage)) return 1;
  if (/thứ hai|số 2|cái 2/.test(normalizedMessage)) return 2;
  if (/thứ ba|số 3|cái 3/.test(normalizedMessage)) return 3;
  const match = normalizedMessage.match(/(?:thứ|số|cái)\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseVietnameseNumber(normalizedMessage: string): number | undefined {
  const match = normalizedMessage.match(/\b(\d+)\b/);
  if (match) return Number.parseInt(match[1], 10);
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  if (/khong|zero/.test(asciiMessage)) return 0;
  if (/mot/.test(asciiMessage)) return 1;
  if (/hai/.test(asciiMessage)) return 2;
  if (/ba/.test(asciiMessage)) return 3;
  if (/bon|tu/.test(asciiMessage)) return 4;
  if (/nam/.test(asciiMessage)) return 5;
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

function stripVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function extractProductIds(value: string): string[] {
  return value.match(/prod_[a-z0-9_]+/gi)?.map((productId) => productId.toLocaleLowerCase('vi-VN')) ?? [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
