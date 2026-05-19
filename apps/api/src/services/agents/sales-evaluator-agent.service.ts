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
  return {
    pass: parsed.pass === true,
    complaints: Array.isArray(parsed.complaints) ? parsed.complaints.filter((item): item is string => typeof item === 'string') : [],
    revisedInstruction: typeof parsed.revisedInstruction === 'string' ? parsed.revisedInstruction : undefined,
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
  return { pass: complaints.length === 0, complaints, revisedInstruction: complaints.length ? complaints.join(' ') : undefined, source: 'fallback' };
}
