import { Injectable } from '@nestjs/common';
import { Buffer } from 'node:buffer';
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
  const retailContinuationNeed = isRetailContinuationNeed(asciiMessage);
  if (isAmbiguousNoise(asciiMessage) && !isNoisyShoppingNeed(asciiMessage)) return 'smalltalk';
  if (isUnsafeOrOutOfScopeInstruction(asciiMessage) && !retailContinuationNeed) return 'smalltalk';
  if (/san pham\s+(nay|do|hien tai)?.*bao hanh|bao hanh.*san pham\s+(nay|do|hien tai)?/.test(asciiMessage)
    && !/(doi tra|tra hang|hoan tien|chinh sach|quy trinh|sau\s+\d+\s+ngay|loi|hong|khieu nai)/.test(asciiMessage)) return 'smalltalk';
  if (/prod_[a-z0-9_]+/.test(asciiMessage)) return 'product_detail';
  if (isPolicyOperationOnly(asciiMessage)) return 'policy';
  if (isSpecificHistoryProductQuestion(asciiMessage)) return 'product_detail';
  if (isSameNeedUpgradeRequest(asciiMessage)) return 'recommend';
  const policyNeed = isPolicySupportRequest(asciiMessage);
  const commercialSelectionNeed = isCommercialProductSelectionNeed(asciiMessage);
  if (policyNeed && !commercialSelectionNeed) return 'policy';
  if (commercialSelectionNeed || retailContinuationNeed) return 'recommend';
  if (isCartClearRequest(asciiMessage)) return 'cart_action';
  if (isCartStatusRequest(asciiMessage)) return 'cart_status';
  if (isCartRemoveRequest(asciiMessage)) return 'cart_action';
  if (isCartActionRequest(asciiMessage)) return 'cart_action';
  if (isCompareRequest(asciiMessage)) return 'compare';
  if (/(trong\s+(ba|cac|nhung)\s+(mon|san pham|lua chon)|cac lua chon|trong do|phuong an).*(phu hop|nen chon|chon|it phai|nhat|hon)|(?:nen chon|chon|phu hop|tot nhat).*(trong\s+(ba|cac|nhung)|trong do|cac lua chon)/.test(asciiMessage)) return 'compare';
  if (isCartClearRequest(asciiMessage)) return 'cart_action';
  if (isCartStatusRequest(asciiMessage)) return 'cart_status';
  if (isCartRemoveRequest(asciiMessage)) return 'cart_action';
  if (isCartActionRequest(asciiMessage)) return 'cart_action';
  if (/tang so luong|giam so luong|them so luong|mon vua them|san pham vua them|vua them len/.test(asciiMessage)) return 'cart_action';
  if (/doi tra|hoan tien|bao hanh|van chuyen|chinh sach|phi giao|giao hang|ngoai noi thanh|noi thanh/.test(asciiMessage) && !/san pham|may|robot|camera|den|quat|loc|bep|mua|tu van/.test(asciiMessage)) return 'policy';
  if (/prod_[a-z0-9_]+/.test(asciiMessage)) return 'product_detail';
  if (isCatalogProductRequest(asciiMessage)) return 'recommend';
  if (isGiftOrCareProductNeed(asciiMessage)) return 'recommend';
  if (/(cai|san pham|mon).*(dau tien|thu hai|thu ba|o tren).*(co can|hub|rieng|bao hanh|thong so|chi tiet)/.test(asciiMessage)) return 'product_detail';
  if (/(cai|san pham|mon).*(dau tien|thu hai|thu ba|o tren|trong danh sach|trong cac mon).*(nhuoc diem|uu diem|dung hang ngay|co tot|co on|phu hop|dung duoc)|(?:nhuoc diem|uu diem|dung hang ngay|co tot|co on|phu hop|dung duoc).*(cai|san pham|mon).*(dau tien|thu hai|thu ba|o tren|trong danh sach|trong cac mon)/.test(asciiMessage)) return 'product_detail';
  if (/(cai|san pham|mon).*(re nhat|dat nhat|nay|do|o tren|trong cac mon).*(nhuoc diem|uu diem|co tot|co on|phu hop|dung duoc|thong so|chi tiet)|(?:nhuoc diem|uu diem|co tot|co on|phu hop|dung duoc).*(cai|san pham|mon).*(re nhat|dat nhat|nay|do|o tren|trong cac mon)/.test(asciiMessage)) return 'product_detail';
  if (/(san pham|mon|cai).*(con lai).*(hop|phu hop|nhu cau|co on|co tot|dung duoc|chi tiet|thong so)|(?:hop|phu hop|nhu cau|co on|co tot|dung duoc).*(san pham|mon|cai).*(con lai)/.test(asciiMessage)) return 'product_detail';
  if (/(may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|bao dong|smart home|ban chai|cham soc ca nhan|lam mat).*(co phu hop|phu hop .* khong|co on khong|co du|dung duoc|nhuoc diem|uu diem)/.test(asciiMessage)) return 'product_detail';
  if (/chi tiet|thong so|mo ta|bao hanh.*san pham/.test(asciiMessage)) return 'product_detail';
  if (isProductUseCaseRequest(asciiMessage)) return 'recommend';
  if (isNoisyShoppingNeed(asciiMessage)) return 'recommend';
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
  if (shouldResolveHistoryV2(message)) agents.push('history-agent');
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

function shouldResolveHistoryV2(message: string): boolean {
  if (shouldResolveHistory(message)) return true;
  const asciiMessage = stripVietnameseTone(normalize(message));
  return /(vua|vua roi|vua them|mon vua them|san pham vua them|luc nay|truoc do|o tren|san pham do|cai do|mau do|no|chon lai|de dung nhat|con lai|them cai nay|mua cai nay)/.test(asciiMessage);
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
  const hasPolicyTopic = /gioi thieu cua hang|ve cua hang|retailhome la gi|cua hang ban gi|dia chi|lien he|hotline|tong dai|khuyen mai|uu dai|voucher|hau mai|cham soc sau ban|doi tra|tra duoc|doi san pham|sua doi san pham|doi sang mau|doi sang san pham|don da giao|da giao|chua nhan|hoan tien|bao hanh|van chuyen|chinh sach|khieu nai|ho tro|san pham loi|hang loi|loi cam bien|phat tieng on|tieng on la|giao hang|phi giao|mien phi giao|giao noi thanh|giao ngoai noi thanh|giao cham|giao tre|tre hang|kiem tra hang|mat phu kien|thieu phu kien|thieu sac|huy don|hoa don|vat|sai mau|nhan sai|giao sai|doi hang|nhan nham|nham phien ban|dat hang|doi dia chi|goi lai|cskh|cham soc khach hang|don hang lon|thanh toan|tra gop|cod|chuyen khoan/.test(asciiMessage);
  if (hasPolicyTopic && /(gioi thieu|cua hang|retailhome|dia chi|lien he|hotline|tong dai|khuyen mai|uu dai|voucher|hau mai|chinh sach|doi tra|hoan tien|bao hanh|quy trinh|cskh|cham soc khach hang|nhan nham|dat hang|loi cam bien|sau khi nhan|thanh toan|tra gop|cod)/.test(asciiMessage)) return true;
  if (/phi giao|mien phi giao|giao hang|giao noi thanh|ngoai noi thanh|noi thanh|don da giao|da giao|chua nhan|giao cham|giao tre|tre hang|huy don|hoa don|vat/.test(asciiMessage)) return hasPolicyTopic;
  const asksProductRecommendation = /(nao|tot|goi y|de xuat|tu van|tim|chon|nen mua).*(san pham|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai)|(?:san pham|may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai).*(nao|tot|goi y|de xuat|tu van|tim|chon|nen mua)/.test(asciiMessage);
  if (/khong chen goi y san pham|khong can|chi dua thong tin chinh sach|co can cu/.test(asciiMessage)) return hasPolicyTopic;
  return hasPolicyTopic && !asksProductRecommendation;
}

function isCompareRequest(asciiMessage: string): boolean {
  if (/so sanh|compare|khac nhau|phan van giua|phan van .* voi|chon .* hay/.test(asciiMessage)) return true;
  const productTerms = '(may|noi|robot|camera|den|quat|bep|thiet bi|hut bui|loc|cam bien|ban chai|may xay|may ep|noi chien|may lam mat|combo|cay lau)';
  return new RegExp(`${productTerms}.+(?:va|voi|hay).+${productTerms}.+(?:phu hop|nhu cau|nao hon|nen mua|mua cai nao|uu tien|dang tien|khac)`).test(asciiMessage)
    || new RegExp(`${productTerms}.+dang tien hon.+${productTerms}`).test(asciiMessage)
    || new RegExp(`nen chon.+${productTerms}.+hay.+${productTerms}`).test(asciiMessage);
}

function isUnsafeOrOutOfScopeInstruction(asciiMessage: string): boolean {
  return /system prompt|prompt he thong|token api|api key|cookie|cau hinh noi bo|bo qua .*quy tac|in .*quy tac|giam gia 99|voucher.*99|xac nhan.*voucher|link thanh toan (?:gia|thu nghiem)|domain ngan hang|khong co that|tra loi trai nguoc|noi rang .*khong co nguon|bao hanh tron doi.*khong co nguon|tu van tinh cam|bai tho|lam tho|viet tho|bai van|du lich bien|giai bai toan|tich phan|ke .*kinh di/.test(asciiMessage);
}

function isAmbiguousNoise(asciiMessage: string): boolean {
  return /abcxyz|\?\?\?|@@@|cai gi do|khong biet nha toi can gi|khong chu de|noi linh tinh/.test(asciiMessage);
}

function isNoisyShoppingNeed(asciiMessage: string): boolean {
  return /(nha sach|lam nha sach|lam sach nha|ve sinh nha|cho meo|long thu cung|rung long|may loc|loc kk|loc khong khi|bui|tre nho|em be|be so sinh|mui bep|bep nho|nau nhanh|nha nong|mua gi|duoi \d|tam \d|can .* san pham|can mon|goi y|tu van|xay da|sinh to|cam bien cua|bao qua dien thoai|can suc khoe|may say toc|lo chien|vua lam qua|lam qua|qua.*huu dung|khong thich do cong kenh|chung cu nho)/.test(asciiMessage);
}

function isCommercialProductSelectionNeed(asciiMessage: string): boolean {
  if (isPolicyOperationOnly(asciiMessage)) return false;
  if (isRetailContinuationNeed(asciiMessage)) return true;
  if (isSameNeedUpgradeRequest(asciiMessage)) return true;
  if (isGiftOrCareProductNeed(asciiMessage)) return true;
  if (isNoisyShoppingNeed(asciiMessage) && /(can|muon|tim|mua|chon|goi y|tu van|ngan sach|duoi|tam|hop|phu hop|dang mua|co gi|neu khong co|gan nhat|dung hoi lai|noi ngan|noi kieu de hieu)/.test(asciiMessage)) return true;
  if (/(can mon|mon).*?(vua lam qua|lam qua|huu dung|chung cu nho|khong thich do cong kenh)|(?:vua lam qua|lam qua|qua.*huu dung|chung cu nho|khong thich do cong kenh).*?(can mon|mon|do|san pham)/.test(asciiMessage)) return true;
  if (/(lam sach nha|ve sinh nha|cho meo|long thu cung|rung long).*(can|tim|co gi|goi y|tu van|dung hoi lai)|(?:can|tim|co gi|goi y|tu van).*(lam sach nha|ve sinh nha|cho meo|long thu cung|rung long)/.test(asciiMessage)) return true;
  if (/(bep nho|nau nhanh|nha moi nhan|me toi kho tinh|ngan sach\s+\d+\s*(trieu|tr)).*(can|muon|tim|chon|goi y|tu van|san pham|thiet bi|bep|nau)|(?:can|muon|tim|chon|goi y|tu van).*(bep nho|nau nhanh|ngan sach\s+\d+\s*(trieu|tr))/.test(asciiMessage)) return true;
  if (isProductUseCaseRequest(asciiMessage)) return true;
  if (isCatalogProductRequest(asciiMessage) && !/(lap dat|bao hanh|doi tra|hoan tien|giao cham|giao tre|huy don|doi dia chi|thieu phu kien|khieu nai|ho tro the nao)/.test(asciiMessage)) return true;
  return false;
}

function isPolicyOperationOnly(asciiMessage: string): boolean {
  return /(giao cham|giao tre|tre hang|huy don|doi dia chi|thieu phu kien|mat phu kien|quay video|lap dat|ho tro the nao|khieu nai|mua online|doi sang mau|mau khac dat hon|roi vo|lam roi vo|hoan tien|thanh toan chuyen khoan|kiem tra hang|shipper|cua hang.*ban gi|hau mai|khuyen mai|voucher|san pham loi|doi tra|bao hanh)/.test(asciiMessage)
    && !/(ngan sach|bep nho|nau nhanh|nha moi nhan|me toi kho tinh|can mon|lam sach nha|ve sinh nha|rung long|long thu cung|vua lam qua|lam qua|mua san pham|chon san pham|tim san pham|tu van san pham)/.test(asciiMessage);
}

function isSpecificHistoryProductQuestion(asciiMessage: string): boolean {
  return /(cai|san pham|mon|mau).*(re nhat|dat nhat|danh sach do|trong danh sach|o tren).*(du dung|du xai|dung duoc|co on|on khong|phu hop|co tot|nhuoc diem|uu diem|thong so|chi tiet)|(?:du dung|du xai|dung duoc|co on|on khong|phu hop|co tot|nhuoc diem|uu diem|thong so|chi tiet).*(cai|san pham|mon|mau).*(re nhat|dat nhat|danh sach do|trong danh sach|o tren)/.test(asciiMessage);
}

function isSameNeedUpgradeRequest(asciiMessage: string): boolean {
  return /(tot hon|nang cap hon|xin hon|manh hon|cao hon|hon mot chut|hon 1 chut).*(cung nhu cau|nhu cau cu|nhu cau do|van cung)|(?:cung nhu cau|nhu cau cu|nhu cau do|van cung).*(tot hon|nang cap hon|xin hon|manh hon|cao hon|hon mot chut|hon 1 chut)/.test(asciiMessage);
}

function isProductUseCaseRequest(asciiMessage: string): boolean {
  const productTerm = /\b(san pham|mon|do gia dung|may|noi|lo|robot|camera|den|quat|bep|thiet bi|hut bui|loc|loc kk|cam bien|bao dong|smart home|ban chai|cham soc ca nhan|lam mat|dieu hoa|may lanh|noi com|noi chien|lo chien|may xay|xay da|sinh to|can suc khoe|may say toc|say toc)\b/.test(asciiMessage);
  if (!productTerm) return false;
  const useCaseSignal = /\b(cho|dung cho|de|phong|nha|can ho|chung cu|van phong|bep|tre|em be|nguoi lon tuoi|thu cung|meo|cho nha|dien tich)\b/.test(asciiMessage);
  const areaSignal = /\b\d+\s*(?:m2|m vuong|met vuong|m²)\b/.test(asciiMessage);
  const explicitProductNeed = /\b(can|muon|tim|kiem|mua|chon|tu van|goi y|de xuat|co|nhe|shop oi)\b/.test(asciiMessage);
  const concreteNeedSignal = /\b(xay da|sinh to|be so sinh|tre so sinh|cam bien cua|bao qua dien thoai|it khoan duc|nha thue|chu to|cong tac|cua kinh|nha co meo|long thu cung|toc rung|de rua|de ve sinh|re|nho gon)\b/.test(asciiMessage);
  return (useCaseSignal || areaSignal || concreteNeedSignal) && (explicitProductNeed || concreteNeedSignal || /\b(dieu hoa|may lanh|lam mat|quat|may loc|loc kk|noi com|noi chien|lo chien|robot|camera|may xay|can suc khoe|may say toc)\b/.test(asciiMessage));
}

function isCatalogProductRequest(asciiMessage: string): boolean {
  if (/(bao hanh|doi tra|hoan tien|chinh sach|giao hang|phi giao|khieu nai)/.test(asciiMessage)) return false;
  const productSignal = /\b(robot hut bui|hut bui|may hut bui|may xay|xay da|sinh to|noi chien|lo chien|air fryer|may loc|loc kk|loc khong khi|camera|chuong hinh|cam bien cua|can suc khoe|may say toc|ban chai dien|noi com|quat dieu hoa|quat lam mat)\b/.test(asciiMessage);
  if (!productSignal) return false;
  return /\b(can|muon|tim|kiem|mua|chon|tu van|goi y|de xuat|co|co mau nao|mau nao|duoi|tren|tam|khoang|cho|phong|nha|nhe|shop oi|minh hoi that|noi ngan thoi|dung hoi lai nhieu|neu khong co|gan nhat|re|de rua|de ve sinh|cong tac|chu to|it khoan duc|nha thue|nha co meo)\b/.test(asciiMessage);
}

function isGiftOrCareProductNeed(asciiMessage: string): boolean {
  return /mua\s+qu\S*(?:\s+cho|\s+de|\s+nen|.*nen mua)/.test(asciiMessage)
    || /(?:mua|chon|tim|tu van|goi y|nen mua|can mon|can do).*(?:qua|qua gia dung|do gia dung|bo me|nguoi lon tuoi|de dung|cham soc ca nhan|huu dung|chung cu nho|khong thich do cong kenh)|(?:qua|qua gia dung|do gia dung|bo me|nguoi lon tuoi|de dung|cham soc ca nhan|huu dung|chung cu nho|khong thich do cong kenh).*(?:mua|chon|tim|tu van|goi y|nen mua|can mon|can do)/.test(asciiMessage);
}

function isRetailContinuationNeed(asciiMessage: string): boolean {
  return /(?:xong|roi|tien|sau do|nhung|that ra).*(?:noi toi nen mua gi|nen mua gi|mua gi|goi y|de xuat|tu van|san pham|do gia dung|qua gia dung)|(?:noi toi nen mua gi|nen mua gi|mua gi|goi y|de xuat|tu van).*(?:san pham|do gia dung|qua gia dung|qua|mon|mua|can)/.test(asciiMessage)
    || /\b(?:noi toi nen mua gi|nen mua gi|mua gi|goi y qua gia dung|goi y do gia dung|goi y mon|goi y san pham)\b/.test(asciiMessage);
}

function isCartStatusRequest(asciiMessage: string): boolean {
  return /tom tat.*gio|tom tat.*phuong an mua|phuong an mua cuoi|gio hang sau|gio sau thao tac|kiem tra lai.*gio|xem lai.*gio|trong gio.*con gi|gio hang.*con gi|gio hang.*dang co|gio hang.*hien tai|gio hang.*bao nhieu|tong tien|tam tinh/.test(asciiMessage)
    || /(?:^|\s)(?:xem|coi|mo|hien|kiem tra|show|view)(?=\s|$).*(?:^|\s)(?:gio hang|cart)(?=\s|$)|(?:^|\s)(?:gio hang|cart)(?=\s|$).*(?:^|\s)(?:dau|hien|xem|coi|show|view)(?=\s|$)/.test(asciiMessage)
    || /(gio hang|cart|trong gio|gio cua minh).*(co gi|co san pham|bao nhieu|hien tai|dang co)|(?:co gi|co san pham|bao nhieu|trong).*(gio hang|cart|trong gio|gio cua minh)/.test(asciiMessage);
}

function isCartClearRequest(asciiMessage: string): boolean {
  return /(xoa\s+(?:het|toan bo|sach)|don sach|clear|empty).*(gio|cart)|(?:gio hang|cart).*(xoa\s+(?:het|toan bo|sach)|don sach|clear|empty)/.test(asciiMessage);
}

function isCartRemoveRequest(asciiMessage: string): boolean {
  return /(?:^|\s)(xoa|go|remove)(?:\s|$).*(khoi gio|ra khoi gio|san pham|mon|cai|thu|vua them|con lai)/.test(asciiMessage);
}

function isCartActionRequest(asciiMessage: string): boolean {
  if (isCartClearRequest(asciiMessage)) return true;
  return /(them|add|bo|mua|lay|chon).*(vao gio|bo vao gio|gio hang|cart)/.test(asciiMessage)
    || isCartRemoveRequest(asciiMessage)
    || /(?:^|\s)(tang|giam|bot|sua|doi|cap nhat|update|set)(?:\s|$).*(so luong|len \d|xuong \d|ve \d|thanh \d|san pham|mon|cai|thu|gio)/.test(asciiMessage)
    || /(san pham|mon|cai).*(dau tien|thu hai|thu ba|cuoi|con lai).*(gio|xoa|tang|giam|cap nhat|len|xuong)/.test(asciiMessage)
    || /(huy thao tac|huy yeu cau|bo qua thao tac|cancel thao tac|dung,|xac nhan)/.test(asciiMessage);
}

function isCartStatusViewRequest(normalizedMessage: string): boolean {
  return /(?:^|\s)(?:xem|coi|mở|mo|hiện|hien|kiểm tra|kiem tra|show|view)(?=\s|$).*(?:^|\s)(?:giỏ|cart)(?=\s|$)|(?:^|\s)(?:giỏ|cart)(?=\s|$).*(?:^|\s)(?:đâu|dau|hiện|hien|xem|coi|show|view)(?=\s|$)/.test(normalizedMessage);
}

function normalize(value: string): string {
  return repairVietnameseMojibake(value).toLocaleLowerCase('vi-VN');
}

function repairVietnameseMojibake(value: string): string {
  let current = value;
  for (let index = 0; index < 3 && /[\u00c3\u00c4\u00c6\u00ba\u00bb]/.test(current); index += 1) {
    try {
      const repaired = Buffer.from(current, 'latin1').toString('utf8');
      if (!repaired || repaired === current) break;
      current = repaired;
    } catch {
      break;
    }
  }
  return current;
}

function stripVietnameseTone(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[đĐ]/g, 'd')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}
