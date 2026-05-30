import { Injectable } from '@nestjs/common';
import type { Product } from '../../models/catalog.models.js';
import type { RecommendationAgentResult, SalesEvaluationResult } from '../../models/agent-execution.models.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';
import { PromptSettingsService } from '../prompt-settings.service.js';

@Injectable()
export class SalesEvaluatorAgentService {
  constructor(
    private readonly modelGatewayService: ModelGatewayService,
    private readonly agentHistoryService: AgentHistoryService,
    private readonly promptSettingsService: PromptSettingsService,
  ) {}

  async evaluate(params: { userId?: string; message: string; draft: string; recommendationResult: RecommendationAgentResult; catalogProducts?: Product[]; completedCartAction: boolean; actionResult?: string }): Promise<SalesEvaluationResult> {
    const history = await this.agentHistoryService.getHistory(params.userId, 'sales-evaluator-agent');
    const guardrailResult = evaluateWithGuardrails(params);
    if (process.env.AGENT_LLM_SALES_EVALUATOR !== '1' || !guardrailResult.pass) {
      await this.agentHistoryService.appendHistory(params.userId, 'sales-evaluator-agent', {
        status: guardrailResult.pass ? 'completed' : 'error',
        inputSummary: params.message.slice(0, 180),
        outputSummary: guardrailResult.pass ? 'guardrail passed' : 'guardrail found mismatch',
        complaints: guardrailResult.complaints,
        source: 'fallback',
      });
      return guardrailResult;
    }

    try {
      const response = await this.modelGatewayService.chat({
        maxTokens: 260,
        temperature: 0,
        messages: [
          { role: 'system', content: await this.promptSettingsService.getContent('sales-evaluator-system') || 'Bạn là sales-evaluator-agent. Trả JSON thuần, không markdown. Đánh giá draft sales-agent có khớp product rail/recommendation handoff và tool result không.' },
          { role: 'user', content: buildEvaluationPrompt(params, history.summary) },
        ],
      });
      const result = readEvaluation(response.content);
      await this.agentHistoryService.appendHistory(params.userId, 'sales-evaluator-agent', {
        status: result.pass ? 'completed' : 'error',
        inputSummary: params.message.slice(0, 180),
        outputSummary: result.pass ? 'draft passed' : 'draft needs revision',
        complaints: result.complaints,
        source: 'llm',
      });
      return result;
    } catch (error) {
      const fallback = evaluateWithGuardrails(params);
      await this.agentHistoryService.appendHistory(params.userId, 'sales-evaluator-agent', {
        status: fallback.pass ? 'completed' : 'error',
        inputSummary: params.message.slice(0, 180),
        outputSummary: fallback.pass ? 'fallback passed' : 'fallback found mismatch',
        complaints: fallback.complaints,
        source: 'fallback',
      });
      return fallback;
    }
  }
}

function buildEvaluationPrompt(params: { message: string; draft: string; recommendationResult: RecommendationAgentResult; catalogProducts?: Product[]; completedCartAction: boolean; actionResult?: string }, historySummary: string): string {
  return JSON.stringify({
    outputSchema: { pass: 'boolean', complaints: 'string[]', revisedInstruction: 'optional Vietnamese instruction for sales-agent' },
    userMessage: params.message,
    draft: params.draft,
    productRail: params.recommendationResult.products.map((product) => ({ id: product.id, title: product.title, brand: product.brand, category: product.category, price: product.price, attributes: product.attributes })),
    shouldShowProducts: params.recommendationResult.shouldShowProducts,
    presentationIntent: params.recommendationResult.presentationIntent,
    completedCartAction: params.completedCartAction,
    actionResult: params.actionResult,
    evaluatorHistory: historySummary,
    checks: [
      'Fail nếu draft lộ internal debug như Recommendation-agent handoff/status=/shouldShowProducts=/presentationIntent=.',
      'Fail nếu draft nhắc sản phẩm ngoài productRail.',
      'Fail nếu productRail sai nhóm nhu cầu, sai ngân sách rõ ràng, hoặc không khớp lịch sử được nêu trong userMessage.',
      'Fail nếu shouldShowProducts=false nhưng draft nói có sản phẩm bên dưới/khung gợi ý.',
      'Fail nếu draft claim đã thêm/xoá/cập nhật giỏ khi completedCartAction=false.',
      'Pass nếu draft trả lời tự nhiên và khớp productRail.',
    ],
  });
}

function readEvaluation(content: string): SalesEvaluationResult {
  const parsed = JSON.parse(content.replace(/```json|```/gi, '').trim()) as Partial<SalesEvaluationResult>;
  const pass = parsed.pass === true;
  const complaints = Array.isArray(parsed.complaints) ? parsed.complaints.filter((item): item is string => typeof item === 'string') : [];
  return {
    pass,
    outcome: pass ? 'pass' : 'revise',
    severity: pass ? 'info' : 'block',
    complaints,
    revisedInstruction: typeof parsed.revisedInstruction === 'string' ? parsed.revisedInstruction : undefined,
    safeResponse: typeof parsed.safeResponse === 'string' ? parsed.safeResponse : undefined,
    source: 'llm',
  };
}

function evaluateWithGuardrails(params: { message: string; draft: string; recommendationResult: RecommendationAgentResult; catalogProducts?: Product[]; completedCartAction: boolean; actionResult?: string }): SalesEvaluationResult {
  const complaints: string[] = [];
  const { draft } = params;
  const products = params.recommendationResult.products;
  const normalizedMessage = normalizeText(params.message);
  if (/Recommendation-agent handoff|status=|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=/i.test(draft)) complaints.push('Draft lộ internal recommendation handoff/debug.');
  const productTitles = products.map((product) => product.title.toLocaleLowerCase('vi-VN'));
  const normalizedDraft = draft.toLocaleLowerCase('vi-VN');
  const mentionsVisibleProduct = products.length === 0
    || productTitles.some((title) => normalizedDraft.includes(title))
    || products.some((product) => normalizedDraft.includes(product.brand.toLocaleLowerCase('vi-VN')));
  if (products.length > 0 && !mentionsVisibleProduct && /cho mình biết thêm|cho tôi biết thêm|nói thêm|ngân sách|tư vấn chính xác|lọc tiếp|nhu cầu cụ thể/i.test(draft)) {
    complaints.push('Draft hỏi lại chung chung dù product rail đã có sản phẩm đủ tin cậy.');
  }
  const mentionedOutside = /AiroClean|LumiAir|Windy|ThermoCare|CoolMate|HeatHome/i.test(draft)
    && productTitles.every((title) => !normalizedDraft.includes(title));
  if (mentionedOutside) complaints.push('Draft có vẻ nhắc sản phẩm không nằm trong product rail.');
  const railIds = new Set(products.map((product) => product.id));
  const mentionedCatalogOutsideRail = (params.catalogProducts ?? [])
    .filter((product) => !railIds.has(product.id))
    .filter((product) => normalizedDraft.includes(product.title.toLocaleLowerCase('vi-VN')));
  if (products.length > 0 && mentionedCatalogOutsideRail.length > 0) {
    complaints.push(`Draft nhắc sản phẩm ngoài product rail: ${mentionedCatalogOutsideRail.slice(0, 3).map((product) => product.title).join(', ')}.`);
  }
  const requestedFamily = detectRequestedFamily(normalizedMessage);
  if (requestedFamily && products.length > 0) {
    const mismatchedProducts = products.filter((product) => !productMatchesFamily(product, requestedFamily));
    if (mismatchedProducts.length === products.length) {
      complaints.push(`Product rail sai nhóm nhu cầu: khách cần ${requestedFamily.label} nhưng đang hiển thị ${mismatchedProducts.map((product) => product.title).join(', ')}.`);
    }
  }
  const budgetMax = parseBudgetMax(normalizedMessage);
  if (budgetMax !== undefined && products.some((product) => product.price > budgetMax) && !/chưa có|không có|vượt ngân sách|cao hơn ngân sách/i.test(draft)) {
    complaints.push(`Product rail có sản phẩm vượt ngân sách ${budgetMax} nhưng draft không nói rõ lý do.`);
  }
  if (params.recommendationResult.shouldShowProducts && products.length === 0) {
    complaints.push('Recommendation handoff bật product rail nhưng không có sản phẩm.');
  }
  if (!params.completedCartAction && /đã thêm|đã xoá|đã xóa|đã cập nhật|vào giỏ/i.test(draft) && /thêm|xoá|xóa|cập nhật|giỏ|cart/i.test(params.message)) {
    complaints.push('Draft claim thao tác giỏ hàng khi cart tool chưa hoàn tất.');
  }
  const pass = complaints.length === 0;
  return {
    pass,
    outcome: pass ? 'pass' : 'revise',
    severity: pass ? 'info' : 'block',
    complaints,
    revisedInstruction: complaints.length ? complaints.join(' ') : undefined,
    safeResponse: pass ? undefined : buildFallbackSafeResponse(products),
    source: 'fallback',
  };
}

function buildFallbackSafeResponse(products: Product[]): string {
  if (products.length === 0) {
    return 'Mình chưa đủ dữ liệu để trả lời chắc chắn. Bạn nói rõ hơn nhu cầu, ngân sách hoặc loại sản phẩm để mình lọc lại nhé.';
  }

  const names = products.slice(0, 4).map((product) => product.title);
  return `Mình đang giữ đúng ${products.length} sản phẩm trong khung gợi ý: ${joinVietnameseList(names)}. Bạn có thể xem từng thẻ, hoặc nói thêm tiêu chí để mình lọc lại sát hơn.`;
}

type RequestedFamily = {
  key: string;
  label: string;
  productPattern: RegExp;
};

function detectRequestedFamily(normalizedMessage: string): RequestedFamily | undefined {
  const families: Array<RequestedFamily & { intentPattern: RegExp }> = [
    { key: 'rice_cooker', label: 'nồi cơm điện', intentPattern: /\b(noi com|rice cooker)\b/, productPattern: /\b(noi com|rice cooker)\b/ },
    { key: 'air_fryer', label: 'nồi chiên không dầu', intentPattern: /\b(noi chien|air fryer)\b/, productPattern: /\b(noi chien|air fryer)\b/ },
    { key: 'air_purifier', label: 'máy lọc không khí', intentPattern: /\b(may loc|loc khong khi|air purifier|bui|min|pm2|di ung|khong khi|mui|tre so sinh|em be)\b/, productPattern: /\b(may loc|loc khong khi|loc khi|hepa|pm2|air purifier)\b/ },
    { key: 'cooling', label: 'thiết bị làm mát', intentPattern: /\b(quat dieu hoa|may lanh|dieu hoa|lam mat|phong nong|nha nong|hoi bi)\b/, productPattern: /\b(quat|lam mat|dieu hoa|cooling|dao gio|remote|lit)\b/ },
    { key: 'vacuum', label: 'thiết bị hút bụi/lau nhà', intentPattern: /\b(hut bui|robot hut|lau nha|vacuum|lam sach nha|long thu cung|toc rung)\b/, productPattern: /\b(hut bui|robot hut|lau nha|vacuum)\b/ },
    { key: 'smart_home', label: 'thiết bị smart home/an ninh', intentPattern: /\b(camera|cam bien|bao dong|smart home|canh bao|cua ra vao|doorbell)\b/, productPattern: /\b(camera|cam bien|bao dong|doorbell|chuong hinh|aqara|tapo|ezviz|zigbee|matter|homekit)\b/ },
    { key: 'personal_care', label: 'thiết bị chăm sóc cá nhân', intentPattern: /\b(cham soc ca nhan|may say toc|ban chai dien|can suc khoe|bo me|nguoi lon tuoi)\b/, productPattern: /\b(may say toc|ban chai|can suc khoe|can thong minh|beurer|oral|body composition)\b/ },
    { key: 'blender', label: 'máy xay/ép', intentPattern: /\b(may xay|may ep|xay sinh to|blender)\b/, productPattern: /\b(may xay|may ep|xay sinh to|blender)\b/ },
  ];
  return families.find((family) => family.intentPattern.test(normalizedMessage));
}

function productMatchesFamily(product: Product, family: RequestedFamily): boolean {
  return family.productPattern.test(normalizeText(`${product.title} ${product.brand} ${product.category} ${product.description} ${Object.values(product.attributes).join(' ')}`));
}

function parseBudgetMax(normalizedMessage: string): number | undefined {
  const millionMatch = normalizedMessage.match(/(?:duoi|khong qua|tam|toi da|khoang)\s*(\d+(?:[,.]\d+)?)\s*(?:trieu|tr)\b/);
  if (millionMatch) return Math.round(Number.parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);
  const thousandMatch = normalizedMessage.match(/(?:duoi|khong qua|tam|toi da|khoang)\s*(\d+(?:[,.]\d+)?)\s*(?:k|nghin|ngan)\b/);
  if (thousandMatch) return Math.round(Number.parseFloat(thousandMatch[1].replace(',', '.')) * 1_000);
  return undefined;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinVietnameseList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} và ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} và ${values[values.length - 1]}`;
}
