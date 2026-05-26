import { Injectable } from '@nestjs/common';
import type { Product } from '../../models/catalog.models.js';
import type { RecommendationAgentResult, SalesEvaluationResult } from '../../models/agent-execution.models.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';

@Injectable()
export class SalesEvaluatorAgentService {
  constructor(
    private readonly modelGatewayService: ModelGatewayService,
    private readonly agentHistoryService: AgentHistoryService,
  ) {}

  async evaluate(params: { userId?: string; message: string; draft: string; recommendationResult: RecommendationAgentResult; completedCartAction: boolean; actionResult?: string }): Promise<SalesEvaluationResult> {
    const history = await this.agentHistoryService.getHistory(params.userId, 'sales-evaluator-agent');
    const guardrailResult = evaluateWithGuardrails(params.draft, params.recommendationResult.products);
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
          { role: 'system', content: 'Bạn là sales-evaluator-agent. Trả JSON thuần, không markdown. Đánh giá draft sales-agent có khớp product rail/recommendation handoff và tool result không.' },
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
      const fallback = evaluateWithGuardrails(params.draft, params.recommendationResult.products);
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

function buildEvaluationPrompt(params: { message: string; draft: string; recommendationResult: RecommendationAgentResult; completedCartAction: boolean; actionResult?: string }, historySummary: string): string {
  return JSON.stringify({
    outputSchema: { pass: 'boolean', complaints: 'string[]', revisedInstruction: 'optional Vietnamese instruction for sales-agent' },
    userMessage: params.message,
    draft: params.draft,
    productRail: params.recommendationResult.products.map((product) => ({ id: product.id, title: product.title })),
    shouldShowProducts: params.recommendationResult.shouldShowProducts,
    presentationIntent: params.recommendationResult.presentationIntent,
    completedCartAction: params.completedCartAction,
    actionResult: params.actionResult,
    evaluatorHistory: historySummary,
    checks: [
      'Fail nếu draft lộ internal debug như Recommendation-agent handoff/status=/shouldShowProducts=/presentationIntent=.',
      'Fail nếu draft nhắc sản phẩm ngoài productRail.',
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

function evaluateWithGuardrails(draft: string, products: Product[]): SalesEvaluationResult {
  const complaints: string[] = [];
  if (/Recommendation-agent handoff|status=|shouldShowProducts=|presentationIntent=|displayReason=|mustMentionProductIds=/i.test(draft)) complaints.push('Draft lộ internal recommendation handoff/debug.');
  const productTitles = products.map((product) => product.title.toLocaleLowerCase('vi-VN'));
  const mentionedOutside = /AiroClean|LumiAir|Windy|ThermoCare|CoolMate|HeatHome/i.test(draft)
    && productTitles.every((title) => !draft.toLocaleLowerCase('vi-VN').includes(title));
  if (mentionedOutside) complaints.push('Draft có vẻ nhắc sản phẩm không nằm trong product rail.');
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

function joinVietnameseList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} và ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} và ${values[values.length - 1]}`;
}
