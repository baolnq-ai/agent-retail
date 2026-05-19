import { Injectable } from '@nestjs/common';
import type { ChatMemoryContext } from './chat-memory.service.js';
import type { Cart } from '../models/commerce.models.js';
import type { Product } from '../models/catalog.models.js';
import type { AgentTraceAgent } from '../models/agent.models.js';

export type SalesAgentIntent = 'recommend' | 'compare' | 'product_detail' | 'policy' | 'cart_action' | 'cart_status' | 'smalltalk';

export interface AgentOrchestrationPlan {
  intent: SalesAgentIntent;
  agents: AgentTraceAgent[];
  shouldUseCart: boolean;
  shouldShowProducts: boolean;
  recentRecommendationIds: string[];
  memoryBrief: string;
}

@Injectable()
export class AgentOrchestratorService {
  plan(params: { message: string; memory: ChatMemoryContext; cart: Cart; candidates: Product[] }): AgentOrchestrationPlan {
    const intent = detectSalesIntent(params.message);
    const agents: AgentOrchestrationPlan['agents'] = ['memory-agent', 'user-analysis-agent'];

    if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') agents.push('product-manager-agent', 'retrieval-agent', 'sales-agent');
    if (intent === 'cart_action' || intent === 'cart_status') agents.push('product-manager-agent', 'cart-manager-agent');
    if (intent === 'policy' || intent === 'smalltalk') agents.push('sales-agent');

    return {
      intent,
      agents,
      shouldUseCart: intent === 'cart_action' || intent === 'cart_status',
      shouldShowProducts: intent === 'recommend' || intent === 'compare' || intent === 'product_detail',
      recentRecommendationIds: params.memory.recentRecommendationIds,
      memoryBrief: buildMemoryBrief(params.memory),
    };
  }
}

export function detectSalesIntent(message: string): SalesAgentIntent {
  const normalizedMessage = normalize(message);
  if (/(thêm|add|bỏ|mua|xóa|xoá|dọn|clear|empty|sửa|đổi|cập nhật|update).*(giỏ|cart)|(?:giỏ|cart).*(xóa|xoá|dọn|clear|empty|sửa|đổi|cập nhật|update)/.test(normalizedMessage)) return 'cart_action';
  if (/(giỏ|cart).*(có gì|bao nhiêu|hiện tại|đang có)|(?:có gì|bao nhiêu).*(giỏ|cart)/.test(normalizedMessage)) return 'cart_status';
  if (isPolicyOnlyRequest(normalizedMessage)) return 'policy';
  if (/so sánh|compare|khác nhau|nên chọn/.test(normalizedMessage)) return 'compare';
  if (/chi tiết|thông số|mô tả|bảo hành.*sản phẩm/.test(normalizedMessage)) return 'product_detail';
  if (/(tư vấn|gợi ý|đề xuất|tìm|lọc|cho mình|có sản phẩm nào|sản phẩm khác|mẫu khác|nhiều hơn|trên \d|dưới \d|hơn \d)/.test(normalizedMessage)) return 'recommend';
  return 'smalltalk';
}

function buildMemoryBrief(memory: ChatMemoryContext): string {
  return [
    memory.rollingSummary ? `Tóm tắt dài hạn: ${memory.rollingSummary}` : '',
    memory.recentRecommendationIds.length ? `Sản phẩm vừa đề xuất: ${memory.recentRecommendationIds.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

function isPolicyOnlyRequest(normalizedMessage: string): boolean {
  return /đổi trả|hoàn tiền|bảo hành|vận chuyển|chính sách/.test(normalizedMessage) && !/sản phẩm|máy|nồi|robot|camera|đèn|quạt|lọc|bếp|mua|tư vấn/.test(normalizedMessage);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}
