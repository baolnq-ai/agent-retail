import { Injectable } from '@nestjs/common';
import type { ChatMemoryContext } from './chat-memory.service.js';
import type { Cart } from '../models/commerce.models.js';
import type { Product } from '../models/catalog.models.js';
import type { AgentTraceAgent } from '../models/agent.models.js';
import type { PipelineV2Agent } from '../models/agent-pipeline-v2.models.js';

export type SalesAgentIntent = 'recommend' | 'compare' | 'product_detail' | 'policy' | 'cart_action' | 'cart_status' | 'smalltalk';

export interface AgentOrchestrationPlan {
  intent: SalesAgentIntent;
  agents: AgentTraceAgent[];
  pipelineAgents: PipelineV2Agent[];
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
    const pipelineAgents = planPipelineV2Agents(intent, params.message);

    return {
      intent,
      agents,
      pipelineAgents,
      shouldUseCart: intent === 'cart_action' || intent === 'cart_status',
      shouldShowProducts: intent === 'recommend' || intent === 'compare' || intent === 'product_detail',
      recentRecommendationIds: params.memory.recentRecommendationIds,
      memoryBrief: buildMemoryBrief(params.memory),
    };
  }
}

export function detectSalesIntent(message: string): SalesAgentIntent {
  const normalizedMessage = normalize(message);
  const asciiMessage = stripVietnameseTone(normalizedMessage);
  if (isAmbiguousNoise(asciiMessage)) return 'smalltalk';
  if (isUnsafeOrOutOfScopeInstruction(asciiMessage)) return 'smalltalk';
  if (isPolicySupportRequest(asciiMessage)) return 'policy';
  if (/tang so luong|giam so luong|them so luong|mon vua them|san pham vua them|vua them len/.test(asciiMessage)) return 'cart_action';
  if (/(them|add|bo|mua|xoa|don|clear|empty|sua|doi|cap nhat|update).*(vao gio|bo vao gio|gio hang|cart)|(?:gio hang|cart).*(xoa|don|clear|empty|sua|doi|cap nhat|update)/.test(asciiMessage)) return 'cart_action';
  if (/(?:^|\s)(?:xem|coi|mo|hien|kiem tra|show|view)(?=\s|$).*(?:^|\s)(?:gio hang|cart)(?=\s|$)|(?:^|\s)(?:gio hang|cart)(?=\s|$).*(?:^|\s)(?:dau|hien|xem|coi|show|view)(?=\s|$)/.test(asciiMessage)) return 'cart_status';
  if (/(gio hang|cart|trong gio|gio cua minh).*(co gi|co san pham|bao nhieu|hien tai|dang co)|(?:co gi|co san pham|bao nhieu|trong).*(gio hang|cart|trong gio|gio cua minh)/.test(asciiMessage)) return 'cart_status';
  if (/doi tra|hoan tien|bao hanh|van chuyen|chinh sach|phi giao|giao hang|ngoai noi thanh|noi thanh/.test(asciiMessage) && !/san pham|may|robot|camera|den|quat|loc|bep|mua|tu van/.test(asciiMessage)) return 'policy';
  if (isCompareRequest(asciiMessage)) return 'compare';
  if (/prod_[a-z0-9_]+/.test(asciiMessage)) return 'product_detail';
  if (/san pham\s+(nay|do|hien tai)?.*bao hanh|bao hanh.*san pham\s+(nay|do|hien tai)?/.test(asciiMessage)) return 'smalltalk';
  if (/chi tiet|thong so|mo ta|bao hanh.*san pham/.test(asciiMessage)) return 'product_detail';
  if (/(san pham|mon|do dien|do gia dung|do|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|bao dong|smart home|ban chai|cham soc ca nhan|lam mat|phong|nha|can ho|chung cu|van phong|qua).*(nao|hop|tot|gia|duoi|tren|dung tich|bao hanh|ngan sach|can|muon|lap dat|qua app|co gi|dang mua|uu tien|nho gon|mang di|cong tac|tam \d|dung duoc|dong nghiep)|(?:nao|hop|tot|gia|duoi|tren|dung tich|bao hanh|ngan sach|can|muon|lap dat|qua app|co gi|dang mua|uu tien|nho gon|mang di|cong tac|tam \d|dung duoc|dong nghiep).*(san pham|mon|do dien|do gia dung|do|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|bao dong|smart home|ban chai|cham soc ca nhan|lam mat|phong|nha|can ho|chung cu|van phong|qua)/.test(asciiMessage)) return 'recommend';
  if (/(goi y|de xuat|tu van|tim|chon|loc|lua chon|combo|di kem|phu kien|re hon|gia mem|dang tien|nen uu tien|nen mua|phu hop|hop voi|thoi quen|qua tang|hang tiet kiem dien|mon nao|san pham nao)/.test(asciiMessage)) return 'recommend';
  if (/(tu van|goi y|de xuat|tim|loc|cho minh|co san pham nao|san pham khac|mau khac|nhieu hon|tren \d|duoi \d|hon \d)/.test(asciiMessage)) return 'recommend';
  if (isCartStatusViewRequest(normalizedMessage)) return 'cart_status';
  if (/(thêm|add|bỏ|mua|xóa|xoá|dọn|clear|empty|sửa|đổi|cập nhật|update).*(vào giỏ|bỏ vào giỏ|giỏ hàng|cart)|(?:giỏ hàng|cart).*(xóa|xoá|dọn|clear|empty|sửa|đổi|cập nhật|update)/.test(normalizedMessage)) return 'cart_action';
  if (/(giỏ|cart).*(có gì|bao nhiêu|hiện tại|đang có)|(?:có gì|bao nhiêu).*(giỏ|cart)/.test(normalizedMessage)) return 'cart_status';
  if (isPolicyOnlyRequest(normalizedMessage)) return 'policy';
  if (/so sánh|compare|khác nhau|nên chọn/.test(normalizedMessage)) return 'compare';
  if (/chi tiết|thông số|mô tả|bảo hành.*sản phẩm/.test(normalizedMessage)) return 'product_detail';
  if (/(tư vấn|gợi ý|đề xuất|tìm|lọc|cho mình|có sản phẩm nào|sản phẩm khác|mẫu khác|nhiều hơn|trên \d|dưới \d|hơn \d)/.test(normalizedMessage)) return 'recommend';
  return 'smalltalk';
}

function planPipelineV2Agents(intent: SalesAgentIntent, message: string): PipelineV2Agent[] {
  const agents: PipelineV2Agent[] = ['lead-agent', 'storage-memory-agent'];
  if (shouldResolveHistory(message)) agents.push('history-agent');
  if (intent === 'recommend' || intent === 'compare' || intent === 'product_detail') agents.push('search-agent', 'recommendation-agent');
  if (intent === 'cart_action' || intent === 'cart_status') agents.push('cart-agent');
  if (intent === 'policy') agents.push('rag-agent', 'customer-support-agent');
  if (intent === 'compare' || intent === 'product_detail') agents.push('rag-agent');
  agents.push('security-agent', 'sales-agent');
  return Array.from(new Set(agents));
}

function shouldResolveHistory(message: string): boolean {
  const normalizedMessage = normalize(message);
  return /(vua|vua roi|luc nay|truoc do|san pham do|cai do|mau do|no|chon lai|them cai nay|mua cai nay|vừa|lúc nãy|trước đó|sản phẩm đó|cái đó|mẫu đó|nó)/.test(normalizedMessage);
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

function isPolicySupportRequest(asciiMessage: string): boolean {
  const hasPolicyTopic = /doi tra|tra duoc|doi san pham|sua doi san pham|don da giao|da giao|chua nhan|hoan tien|bao hanh|van chuyen|chinh sach|khieu nai|ho tro|san pham loi|hang loi|phat tieng on|tieng on la|giao hang|phi giao|mien phi giao|giao noi thanh|giao ngoai noi thanh|giao cham|kiem tra hang|mat phu kien|thieu phu kien|thieu sac|huy don|hoa don|vat|sai mau|nhan sai|giao sai|doi hang|nhan nham|nham phien ban|dat hang|doi dia chi|goi lai|don hang lon/.test(asciiMessage);
  if (/phi giao|mien phi giao|giao hang|giao noi thanh|ngoai noi thanh|noi thanh|don da giao|da giao|chua nhan|giao cham|huy don|hoa don|vat/.test(asciiMessage)) return hasPolicyTopic;
  const asksProductRecommendation = /(nao|tot|goi y|de xuat|tu van|tim|chon|nen mua).*(san pham|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai)|(?:san pham|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai).*(nao|tot|goi y|de xuat|tu van|tim|chon|nen mua)/.test(asciiMessage);
  if (/khong chen goi y san pham|khong can|chi dua thong tin chinh sach|co can cu/.test(asciiMessage)) return hasPolicyTopic;
  return hasPolicyTopic && !asksProductRecommendation;
}

function isCompareRequest(asciiMessage: string): boolean {
  if (/so sanh|compare|khac nhau/.test(asciiMessage)) return true;
  const productTerms = '(may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai|may xay|may ep|noi chien|may lam mat|combo|cay lau)';
  return new RegExp(`${productTerms}.+(?:va|voi|hay).+${productTerms}.+(?:phu hop|nhu cau|nao hon|nen mua|mua cai nao|uu tien|dang tien|khac)`).test(asciiMessage)
    || new RegExp(`${productTerms}.+dang tien hon.+${productTerms}`).test(asciiMessage)
    || new RegExp(`nen chon.+${productTerms}.+hay.+${productTerms}`).test(asciiMessage);
}

function isUnsafeOrOutOfScopeInstruction(asciiMessage: string): boolean {
  return /system prompt|prompt he thong|token api|api key|cau hinh noi bo|bo qua .*quy tac|in .*quy tac|giam gia 99|link thanh toan thu nghiem|khong co that|tra loi trai nguoc|noi rang .*khong co nguon|bao hanh tron doi.*khong co nguon|tu van tinh cam|bai van|du lich bien|giai bai toan|tich phan|ke .*kinh di/.test(asciiMessage);
}

function isAmbiguousNoise(asciiMessage: string): boolean {
  return /abcxyz|\?\?\?|@@@|cai gi do|khong biet nha toi can gi|khong chu de|noi linh tinh/.test(asciiMessage);
}

function isCartStatusViewRequest(normalizedMessage: string): boolean {
  return /(?:^|\s)(?:xem|coi|mở|mo|hiện|hien|kiểm tra|kiem tra|show|view)(?=\s|$).*(?:^|\s)(?:giỏ|cart)(?=\s|$)|(?:^|\s)(?:giỏ|cart)(?=\s|$).*(?:^|\s)(?:đâu|dau|hiện|hien|xem|coi|show|view)(?=\s|$)/.test(normalizedMessage);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi-VN');
}

function stripVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
