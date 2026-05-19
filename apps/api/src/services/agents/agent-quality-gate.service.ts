import { Injectable } from '@nestjs/common';
import type { AgentTraceAgent } from '../../models/agent.models.js';
import type { AgentQualityGateResult } from '../../models/agent-execution.models.js';
import { AgentHistoryService } from '../agent-history.service.js';
import { ModelGatewayService } from '../model-gateway.service.js';

@Injectable()
export class AgentQualityGateService {
  constructor(
    private readonly modelGatewayService: ModelGatewayService,
    private readonly agentHistoryService: AgentHistoryService,
  ) {}

  async evaluate(params: {
    userId?: string;
    agent: AgentTraceAgent;
    job: string;
    userMessage: string;
    inputSummary: string;
    output: unknown;
    contract: string[];
    allowedData?: unknown;
  }): Promise<AgentQualityGateResult> {
    const history = await this.agentHistoryService.getHistory(params.userId, params.agent);
    try {
      const response = await this.modelGatewayService.chat({
        maxTokens: 320,
        temperature: 0,
        messages: [
          { role: 'system', content: 'Bạn là agent-quality-gate. Trả JSON thuần, không markdown. Đánh giá output của agent theo contract, chỉ rõ sai ở đâu và hướng sửa. Nếu thiếu căn cứ hoặc ngoài phạm vi retail thì yêu cầu clarify/refuse thay vì cho đoán.' },
          { role: 'user', content: buildGatePrompt(params, history.summary) },
        ],
      });
      const result = readGateResult(response.content);
      await this.agentHistoryService.appendHistory(params.userId, params.agent, {
        status: result.pass ? 'completed' : result.severity === 'block' ? 'error' : 'skipped',
        inputSummary: params.inputSummary.slice(0, 180),
        outputSummary: `${params.job}: ${result.outcome}/${result.severity}`,
        complaints: result.complaints,
        source: 'llm',
      });
      return result;
    } catch (error) {
      const fallback = evaluateWithGuardrails(params);
      await this.agentHistoryService.appendHistory(params.userId, params.agent, {
        status: fallback.pass ? 'completed' : 'error',
        inputSummary: params.inputSummary.slice(0, 180),
        outputSummary: `${params.job}: ${fallback.outcome}/${fallback.severity}`,
        complaints: fallback.complaints,
        source: 'fallback',
      });
      return fallback;
    }
  }
}

function buildGatePrompt(params: {
  agent: AgentTraceAgent;
  job: string;
  userMessage: string;
  inputSummary: string;
  output: unknown;
  contract: string[];
  allowedData?: unknown;
}, historySummary: string): string {
  return JSON.stringify({
    outputSchema: {
      pass: 'boolean',
      outcome: 'pass|revise|refuse|clarify',
      severity: 'info|warn|block',
      complaints: 'string[] with exact issue and where it is wrong',
      revisedInstruction: 'optional Vietnamese instruction for the same agent to fix output',
      safeResponse: 'optional customer-facing Vietnamese response when pipeline must stop',
    },
    agent: params.agent,
    job: params.job,
    userMessage: params.userMessage,
    inputSummary: params.inputSummary,
    output: params.output,
    contract: params.contract,
    allowedData: params.allowedData,
    agentHistory: historySummary,
    globalRules: [
      'Pass only when output is consistent with the user message, allowed data, and contract.',
      'Use revise when the same agent can fix output without executing external tools.',
      'Use clarify when user input is underspecified and guessing would be unsafe.',
      'Use refuse when the request is outside RetailHome product, policy, cart, or account support scope.',
      'Use block severity when final response must not be sent as-is.',
    ],
  });
}

function readGateResult(content: string): AgentQualityGateResult {
  const parsed = JSON.parse(content.replace(/```json|```/gi, '').trim()) as Partial<AgentQualityGateResult>;
  const outcome = isOutcome(parsed.outcome) ? parsed.outcome : parsed.pass === true ? 'pass' : 'revise';
  const severity = isSeverity(parsed.severity) ? parsed.severity : parsed.pass === true ? 'info' : 'block';
  const complaints = Array.isArray(parsed.complaints) ? parsed.complaints.filter((item): item is string => typeof item === 'string') : [];
  return {
    pass: parsed.pass === true && outcome === 'pass',
    outcome,
    severity,
    complaints,
    revisedInstruction: typeof parsed.revisedInstruction === 'string' ? parsed.revisedInstruction : undefined,
    safeResponse: typeof parsed.safeResponse === 'string' ? parsed.safeResponse : undefined,
    source: 'llm',
  };
}

function evaluateWithGuardrails(params: { agent: AgentTraceAgent; userMessage: string; output: unknown }): AgentQualityGateResult {
  const outputText = JSON.stringify(params.output).toLocaleLowerCase('vi-VN');
  const complaints: string[] = [];
  if (/cart_status/.test(outputText) && /cartoperation/.test(outputText) && !/cartoperation":null|cartoperation":undefined/.test(outputText)) complaints.push('cart_status không được kèm cartOperation thao tác sản phẩm.');
  if (/shouldshowproducts":false/.test(outputText) && /"products":\[[^\]]+\]/.test(outputText)) complaints.push('Output tắt product rail nhưng vẫn có products.');
  if (isClearlyOutOfScope(params.userMessage)) complaints.push('Câu hỏi nằm ngoài phạm vi tư vấn sản phẩm, chính sách, giỏ hàng hoặc tài khoản RetailHome.');
  if (!complaints.length) return { pass: true, outcome: 'pass', severity: 'info', complaints: [], source: 'fallback' };
  const outOfScope = complaints.some((complaint) => complaint.includes('ngoài phạm vi'));
  return {
    pass: false,
    outcome: outOfScope ? 'refuse' : 'revise',
    severity: 'block',
    complaints,
    revisedInstruction: complaints.join(' '),
    safeResponse: outOfScope ? 'Mình chỉ hỗ trợ tư vấn sản phẩm, chính sách, tài khoản và giỏ hàng của RetailHome. Bạn cần mình hỗ trợ phần nào trong cửa hàng?' : undefined,
    source: 'fallback',
  };
}

function isClearlyOutOfScope(message: string): boolean {
  const normalized = message.toLocaleLowerCase('vi-VN');
  const retailTerms = /sản phẩm|giỏ|cart|mua|giá|bảo hành|đổi trả|vận chuyển|tài khoản|đăng nhập|đơn hàng|máy|nồi|robot|camera|đèn|quạt|lọc|bếp|retailhome/;
  const broadQuestion = /tổng thống|thời tiết|bóng đá|lập trình|code|nấu món|du lịch|chính trị|chứng khoán|coin|bitcoin/;
  return broadQuestion.test(normalized) && !retailTerms.test(normalized);
}

function isOutcome(value: unknown): value is AgentQualityGateResult['outcome'] {
  return value === 'pass' || value === 'revise' || value === 'refuse' || value === 'clarify';
}

function isSeverity(value: unknown): value is AgentQualityGateResult['severity'] {
  return value === 'info' || value === 'warn' || value === 'block';
}
