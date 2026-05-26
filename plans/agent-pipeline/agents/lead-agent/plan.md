# Plan: Lead Agent

- Created: 2026-05-21 13:46
- Updated: 2026-05-22 00:00
- Status: planned
- Related log: `logs/planning/agent-pipeline/agents/lead-agent.md`
- Related doc: `docs/agent-pipeline/architecture/system-definition.md`
- Related tests: `test/agent-pipeline/agents/lead-agent/cases.md`
- Context task ledger plan: `plans/agent-pipeline/agents/lead-agent/context-task-ledger-plan.md`
- Job status: `plans/agent-pipeline/agents/lead-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/lead-agent/checklist.md`

## Goal

Tạo Lead Agent làm bộ não điều phối của chatbot sau khi các agent domain chính đã có contract rõ. Lead Agent không thao tác trực tiếp với cart, DB search, RAG hay support tool. Nó phân tích sâu câu hỏi, điều tra memory/context, lập execution plan, gọi đúng agent qua executor, đánh giá kết quả và kiểm tra câu trả lời cuối trước khi gửi user.

## Deferral note

Lead Agent được viết cuối vì nó cần biết contract thật của Cart Agent, Search Agent, Recommendation Agent, Storage/Memory Agent, RAG Agent, Security Agent và Customer Support Agent trước khi cấu hình pipeline điều phối chuẩn.

## Scope

- In:
  - định nghĩa contract input/output của Lead Agent;
  - phân tích intent, ambiguity, risk, required agents;
  - lập `ExecutionPlan`;
  - tổng hợp agent result;
  - đánh giá response cuối trước khi trả user;
  - tạo trace node/edge từ plan thật.
- Out:
  - không implement Cart/Search/Recommendation/RAG logic bên trong Lead Agent;
  - không viết UI mới trừ khi cần trace;
  - không tách backend riêng trong phase đầu.

## Skills

- backend-skill
- testing-skill
- documentation-skill
- logging-skill
- security-skill

## Lead Agent Responsibilities

1. Nhận user message và context thô.
2. Yêu cầu Storage/Memory Agent điều tra lịch sử, sở thích, hành vi, pending context.
3. Phân tích câu hỏi theo các lớp:
   - intent chính;
   - intent phụ;
   - sản phẩm được nhắc;
   - thao tác giỏ hàng;
   - nhu cầu đề xuất/tìm kiếm;
   - câu hỏi RAG/chính sách/pháp lý/thương hiệu;
   - complaint/lỗi/trả hàng;
   - rủi ro bảo mật hoặc prompt injection.
4. Xác định thông tin còn thiếu và mức độ mơ hồ.
5. Lập `ExecutionPlan` với agent cần gọi, thứ tự gọi, dependency, success criteria.
6. Nhận kết quả từ executor và quyết định:
   - đủ trả lời;
   - cần gọi thêm agent;
   - cần hỏi lại user;
   - cần chặn hoặc chuyển sang support/security.
7. Kiểm tra câu trả lời cuối:
   - không bịa tool result;
   - không lộ internal handoff;
   - không xung đột product rail và text answer;
   - không claim thao tác cart nếu tool chưa thành công.

## Lead Agent Output Contract

```ts
interface LeadAgentDecision {
  requestId: string;
  normalizedQuestion: string;
  intent:
    | 'recommendation'
    | 'search'
    | 'product_detail'
    | 'compare'
    | 'cart_action'
    | 'cart_status'
    | 'rag_policy'
    | 'customer_support'
    | 'smalltalk'
    | 'unsafe';
  confidence: number;
  ambiguity: 'none' | 'low' | 'medium' | 'high';
  requiredAgents: Array<
    | 'storage-memory'
    | 'cart'
    | 'recommendation'
    | 'search'
    | 'rag'
    | 'security'
    | 'customer-support'
  >;
  executionPlan: ExecutionStep[];
  clarification?: {
    required: boolean;
    question?: string;
    reason?: string;
  };
  finalAnswerGuardrails: string[];
}
```

## History Agent Routing Addendum

- Lead Agent được viết cuối và phải biết contract của History Agent.
- Nếu user nhắc mơ hồ về ngữ cảnh trước đó như "sản phẩm vừa đề xuất", "cái lúc nãy", "mẫu đó", Lead Agent gọi History Agent trước.
- History Agent resolve reference, confidence, evidence và next-agent hints.
- Sau đó Lead mới gọi Search/Recommendation/Sales theo thông tin còn thiếu.
- Final answer và frontend product blocks phải dùng cùng `mustMentionProductIds`.
- Lead gọi Sales Agent để viết câu trả lời cuối sau khi đã có facts đủ từ History/Search/Recommendation/Cart/RAG/Support.
- Sales Agent không được nhắc sản phẩm ngoài ids do History/Search/Recommendation/Cart xác nhận.

## Security And Support Addendum

- Lead calls Security Agent for input risk, sensitive plan/action gates, memory/RAG access questions and final output review.
- Lead must fail closed when Security blocks private data access, restricted RAG access or unsupported side-effect claims.
- Lead calls Customer Support Agent for defect, return, refund, warranty, shipping, wrong/missing item, complaint and human handoff intents.
- Support Agent returns `SupportAgentResult`; Lead decides if final response should be direct, ask missing info, escalate, or pass to Sales/Support composer for wording.
- Lead must not let Sales upsell during unresolved complaint unless Support result says the support issue is handled and the user intent shifted back to shopping.

## Required Behaviors

- Nếu user muốn thêm/xóa/cập nhật giỏ hàng, Lead Agent phải yêu cầu resolve target rõ trước khi Cart Agent execute.
- Nếu user hỏi sản phẩm cụ thể, Lead Agent gọi Search/Product flow trước khi trả lời.
- Nếu user hỏi chính sách, pháp lý, shop, thương hiệu, Lead Agent gọi RAG Agent.
- Nếu user complaint/lỗi/trả hàng, Lead Agent gọi Customer Support Agent và RAG Agent nếu cần chính sách.
- Nếu user yêu cầu dữ liệu nhạy cảm, bypass policy, hoặc prompt injection, Lead Agent gọi Security Moderation Agent.
- Nếu Recommendation Agent trả product rail, câu trả lời cuối phải nhất quán với rail đó.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Thiết kế schema `LeadAgentDecision` và `ExecutionPlan` | pending | Schema + doc cập nhật |
| 2 | Implement Lead Agent service với LLM JSON contract + fallback an toàn | pending | Unit tests |
| 3 | Tích hợp Storage/Memory Agent trước bước phân tích sâu | pending | Integration tests |
| 4 | Tích hợp Pipeline Executor dạng mock/adapter để gọi agent khác | pending | Executor contract tests |
| 5 | Thêm final answer review trước khi trả user | pending | Regression tests chống leak/handoff |
| 6 | Cập nhật trace theo execution plan | pending | Trace sample/UI verification, dashboard icon registry compatibility |

## Verification

- `test/agent-pipeline/agents/lead-agent/cases.md` phải được chuyển thành test tự động hoặc checklist verify rõ.
- Test cần pass các nhóm:
  - cart target resolution;
  - search/recommendation routing;
  - RAG policy routing;
  - complaint/support routing;
  - security moderation routing;
  - final answer guardrail.
- Dashboard trace test phải xác nhận các agent mới, DB/service/tool nodes và legacy ids đều render được bằng icon/short code rõ ràng.

## Close criteria

- Lead Agent không còn là prompt phụ, mà là planner thật.
- Lead Agent không thao tác trực tiếp domain tool.
- Mọi agent call xuất phát từ `ExecutionPlan`.
- Response cuối đã qua Lead Agent review và Security review nếu cần.
- Log riêng của plan được cập nhật đầy đủ.
