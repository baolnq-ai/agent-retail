# Plan: Agent Pipeline Rebuild

- Created: 2026-05-21 13:46
- Updated: 2026-05-22 02:30
- Status: in_progress
- Related log: `logs/planning/agent-pipeline/rebuild.md`
- Related doc: `docs/agent-pipeline/architecture/system-definition.md`
- Related tests: `tests/agent-pipeline/README.md`

## Goal

Code lại chatbot pipeline thành hệ thống nhiều agent có Lead Agent điều phối trung tâm. Lead Agent phân tích sâu câu hỏi, điều tra memory/context, lập kế hoạch, gọi agent chuyên trách, đánh giá kết quả và kiểm tra câu trả lời trước khi trả về user.

## Scope

- In:
  - định nghĩa lại agent roles và data contract;
  - tách orchestration khỏi `AgentService`;
  - tạo Lead Agent và Pipeline Executor;
  - chuẩn hóa Cart, Recommendation, Search, Storage/Memory, RAG, Security, Customer Support Agent;
  - cập nhật trace để phản ánh execution plan thật;
  - cập nhật Agent Dashboard canvas animation để phát lại đường đi thật của câu hỏi qua agent, DB, service và tool;
  - bổ sung test case và regression test cho các luồng chính.
- Out:
  - chưa đổi UI lớn ngoài trace/stream response/agent dashboard playback cần thiết;
  - chưa tách microservice/backend riêng cho từng agent ngay từ đầu;
  - chưa tối ưu mô hình embedding/vector DB nếu chưa có contract pipeline ổn định.

## Skills

- plan-skill
- backend-skill
- documentation-skill
- logging-skill
- testing-skill
- security-skill
- frontend-skill nếu sửa trace dashboard hoặc streaming UI

## Target Architecture

```txt
User message
  -> Lead Agent
      -> gọi Storage/Memory Agent để điều tra lịch sử, sở thích, hành vi, cart context
      -> phân tích câu hỏi, intent, ambiguity, risk, required agents
      -> tạo ExecutionPlan
  -> Pipeline Executor
      -> Cart Agent nếu cần thao tác hoặc đọc giỏ hàng
      -> Product/Search/Recommendation flow nếu cần sản phẩm
      -> RAG Agent nếu cần chính sách, pháp lý, shop, thương hiệu, thông tin nền
      -> Customer Support Agent nếu là lỗi, đổi trả, complaint, bảo hành
      -> Security Moderation Agent kiểm duyệt input/output và quyền thao tác
  -> Lead Agent tổng hợp kết quả, đánh giá thiếu đủ
  -> Sales/Support response composer
  -> Lead Agent + Security Agent kiểm tra câu trả lời cuối
  -> Frontend response blocks + trace
```

## Agent Definitions

| Agent | Vai trò | Không làm |
| --- | --- | --- |
| Lead Agent | Lead điều phối, phân tích, lập plan, tham mưu, đánh giá output cuối | Không trực tiếp mutate cart, không tự search DB, không tự bịa product facts |
| Cart Agent | Quản lý giỏ hàng thật: xem, thêm, xóa, cập nhật, verify side effect | Không tự chọn sản phẩm khi target chưa rõ |
| Recommendation Agent | Đề xuất sản phẩm theo nhu cầu, sở thích, hành vi, ngữ cảnh sale | Không làm hard search thô thay Search Agent |
| Search Agent | Tìm kiếm sản phẩm bằng hard search, lexical, attribute, embedding fallback, LLM judge | Không quyết định response cuối |
| Storage/Memory Agent | Quản lý lịch sử, summary, preferences, behavior, pending context | Không trả lời user trực tiếp |
| RAG Agent | Trả lời thông tin shop, chính sách, pháp lý, thương hiệu, kiến thức sản phẩm từ nguồn đáng tin | Không thao tác cart |
| Security Moderation Agent | Kiểm duyệt input/output, quyền thao tác, prompt injection, data leak | Không thay thế Lead Agent |
| Customer Support Agent | Xử lý lỗi, trả hàng, complaint, bảo hành, chăm sóc khách hàng | Không tự quyết chính sách ngoài RAG/tool result |

## Backend Boundary Decision

Mỗi agent được thiết kế như một hệ thống riêng theo contract rõ ràng. Chưa tách backend riêng ngay trong phase đầu. Chỉ tách backend/service riêng khi đạt một trong các điều kiện:

- agent có state riêng phức tạp;
- agent cần queue/job riêng;
- agent có dependency nặng hoặc runtime khác;
- agent cần scale độc lập;
- boundary bảo mật bắt buộc tách.

Mặc định phase đầu dùng module/service riêng trong `apps/api/src/services/agents-v2/` hoặc tên tương đương để dễ refactor.

## Core Contracts

```ts
interface ConversationContext {
  requestId: string;
  userId?: string;
  message: string;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string; at?: string }>;
  memorySummary?: string;
  preferences: Array<{ key: string; value: string; confidence: number }>;
  behaviorSignals: Array<{ type: string; value: string; weight: number }>;
  cartSnapshot?: unknown;
}

interface ExecutionPlan {
  intent: string;
  confidence: number;
  ambiguity: 'none' | 'low' | 'medium' | 'high';
  steps: ExecutionStep[];
  requiredAgents: string[];
  answerPolicy: {
    canAnswerDirectly: boolean;
    mustUseToolResult: boolean;
    mustAskClarification: boolean;
  };
}

interface ExecutionStep {
  id: string;
  agent: string;
  action: string;
  input: unknown;
  dependsOn: string[];
  successCriteria: string[];
}
```

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Khóa quy định plan/doc/log/test | done | `architecture/working-rules.md` |
| 1 | Chốt production framework/tooling và tool-call policy | done | Custom TS executor; API 51/51, Web 3/3 |
| 2 | Thiết kế và code Cart Agent trước vì có side effect và DB boundary quan trọng nhất | pending | `agents/cart-agent/plan.md`, cart tests |
| 3 | Thiết kế Storage/Memory Agent để phối hợp near/mid/far memory | pending | Memory context tests pass |
| 4 | Thiết kế Search Agent và Recommendation Agent | pending | Search/recommendation tests pass |
| 5 | Thiết kế RAG, Security, Customer Support Agent contracts | planned | RAG/Security/Support plans, docs and test suites created; implementation/tests pending |
| 6 | Thiết kế contract v2 chung: context, plan, agent result, trace | pending | Schema + docs + tests, include dashboard node/icon contract |
| 7 | Implement Lead Agent sau cùng để điều phối theo contract thật | pending | `agents/lead-agent/plan.md`, Lead Agent tests pass |
| 8 | Tách Pipeline Executor khỏi `AgentService` | pending | Integration tests pass |
| 9 | Cập nhật trace dashboard canvas playback theo ExecutionPlan thật | pending | `platform/dashboard-trace-visualization.md`, UI/trace animation verification |
| 10 | Regression toàn bộ chatbot | pending | Recommend/search/cart/RAG/support/security pass |

## Verification

## Phase 5 Planning Package

RAG, Security and Customer Support contracts now have dedicated plan packages:

- `plans/agent-pipeline/agents/rag-agent/plan.md`
- `plans/agent-pipeline/agents/security-agent/plan.md`
- `plans/agent-pipeline/agents/customer-support-agent/plan.md`

Implementation is still pending. Phase 5 can close only after policy, security and support real-request suites pass 100%.

- Test contract cho `ExecutionPlan`, `ConversationContext`, agent result.
- Integration test qua API chat cho:
  - hỏi sản phẩm;
  - đề xuất theo ngân sách;
  - thêm sản phẩm vào giỏ;
  - xem giỏ hàng;
  - hỏi chính sách đổi trả;
  - complaint/lỗi sản phẩm;
  - prompt injection hoặc yêu cầu lộ dữ liệu.
- Trace phải thể hiện đúng agent nào được gọi thật.
- Dashboard phải render được agent mới và node DB/service/tool bằng icon dễ hiểu, ít chữ, có fallback cho legacy/unknown node.
- Dashboard phải có canvas animation phát lại đúng đường đi thật của câu hỏi:
  - bắt đầu từ user message;
  - chạy tới Lead Agent;
  - chạy qua agent/tool/DB/service đã dùng;
  - chạy ngược về Lead khi có result;
  - chạy tới composer/response;
  - loop lại mượt để người xem hiểu pipeline đã đi đâu.
- Ví dụ câu hỏi "bạn làm được gì?" chỉ cần hiện đúng route thực tế như `user -> lead-agent -> rag-agent -> qdrant/tool -> rag-agent -> customer-support-agent/sales-agent -> assistant-response` nếu trace thật dùng các node đó; không được vẽ agent không chạy.
- Animation phải nhẹ và mượt, ưu tiên canvas/WebGL hoặc canvas 2D, không làm lag trang dashboard.
- Response cuối không được chứa handoff/code/internal marker.

## Close criteria

- Lead Agent điều phối runtime thật.
- `AgentService` chỉ còn vai trò adapter HTTP/stream/response.
- Mỗi agent có contract, tests, docs, log.
- Pipeline mới pass regression test chính.
- Dashboard trace phản ánh ExecutionPlan thật bằng canvas playback, không vỡ layout và không lag khi có Security/Support/RAG/Qdrant/Postgres/tool nodes.
