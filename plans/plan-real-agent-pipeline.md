# Plan: Real Agent Pipeline

Thời gian lập plan: 2026-05-19

## Mục tiêu

Chuyển pipeline chatbot từ nhiều service heuristic/fallback cứng sang pipeline agent rõ ràng hơn:

- Mỗi agent có bounded history riêng để nhớ lần chạy gần đây, complaint, kết quả pass/fail.
- User-analysis-agent, recommendation-agent và sales-evaluator-agent có LLM-backed JSON contract.
- Rule/regex chỉ là pre-signal hoặc fallback kỹ thuật khi model lỗi, không là quyết định chính nếu LLM trả hợp lệ.
- Sales-agent không tự đoán product rail; nó nhận handoff đã được recommendation-agent duyệt.
- Evaluator kiểm tra draft response trước khi trả frontend, retry tối đa 1 lần nếu lệch.
- Hard sanitize chỉ là emergency guardrail và phải trace được.

## Skill cần dùng

- `backend-skill`: chỉnh NestJS service, model contract, pipeline orchestration.
- `testing-skill`: thêm test cho agent history, LLM JSON contract fallback, evaluator retry, no handoff leakage.
- `documentation-skill`: cập nhật docs pipeline sau khi hoàn thành.
- `logging-skill`: ghi log quá trình triển khai và kết quả test.
- `security-skill`: đảm bảo không log/persist API key, raw prompt nhạy cảm, cookie/session/token.

## Phase 1 — Audit và chuẩn hoá contract

Thời gian dự kiến: 45 phút.

Việc cần làm:

1. Xác định các type cần thêm trong `agent-execution.models.ts`:
   - `AgentHistoryEntry`
   - `AgentHistoryContext`
   - `UserAnalysisAgentDecision`
   - `SalesEvaluationResult`
2. Giữ bounded size: tối đa 20 event/agent hoặc dưới 4KB/value.
3. Không tạo migration DB mới; dùng `UserPreference` hiện có.

Testing phase:

- Typecheck API.
- Unit test serialize/trim history.

Docs/logs:

- Ghi docs ngắn sau phase nếu contract ổn.
- Ghi log phase vào `logs/implementation/real-agent-pipeline.md`.

## Phase 2 — AgentHistoryService

Thời gian dự kiến: 60 phút.

Việc cần làm:

1. Tạo `AgentHistoryService` trong `apps/api/src/services/agent-history.service.ts`.
2. API tối thiểu:
   - `getHistory(userId, agent)`
   - `appendHistory(userId, agent, entry)`
   - `getHistories(userId, agents)` nếu cần.
3. Storage key: `agent_history:{agent}`.
4. Không lưu raw API key, cookie, session token, raw long prompt.
5. Đăng ký provider trong `app.module.ts`.

Testing phase:

- Unit test append/trim/parse invalid value.
- API typecheck.

Docs/logs:

- Cập nhật docs pipeline memory section.
- Ghi log phase.

## Phase 3 — LLM-backed UserAnalysisAgent

Thời gian dự kiến: 90 phút.

Việc cần làm:

1. Inject `ModelGatewayService` và `AgentHistoryService` vào `UserAnalysisAgentService`.
2. Thêm method async `analyze()` gọi LLM JSON contract.
3. Rule hiện tại chuyển thành `buildPreAnalysis()` làm pre-signal và fallback kỹ thuật.
4. Validate JSON output; nếu invalid/model lỗi thì dùng fallback nhưng trace/history ghi rõ fallback.
5. Prompt cho LLM nhận:
   - user message;
   - memory investigation;
   - pending cart plan;
   - agent history gần đây;
   - pre-signal.

Testing phase:

- Mock model gateway ở boundary để test JSON valid/invalid.
- Regression: “Cho nhiều sản phẩm hơn” => recommend + alternatives.
- Regression: “thêm máy lọc đi” dùng memory => cart_action add recent.

Docs/logs:

- Cập nhật docs user-analysis-agent.
- Ghi log phase.

## Phase 4 — LLM-backed RecommendationAgent

Thời gian dự kiến: 90 phút.

Việc cần làm:

1. Inject `ModelGatewayService` và `AgentHistoryService` vào `RecommendationAgentService`.
2. Thêm LLM JSON contract quyết định presentation:
   - `shouldShowProducts`
   - `presentationIntent`
   - `productIds`
   - `mustMentionProductIds`
   - `complaints`
   - `status`
3. Rule hiện tại thành candidate pre-plan/fallback.
4. Validate product ids phải nằm trong `ProductManagerResult.candidates/selectedProducts/cart tool ids`.
5. Nếu LLM chọn ngoài scope thì reject và retry/fallback recorded.

Testing phase:

- Compare phải trả đúng 2 product cards.
- Policy/cart_status/smalltalk không hiện cards.
- “Cho nhiều sản phẩm hơn” phải dùng alternatives candidates, không hỏi lại.

Docs/logs:

- Cập nhật docs recommendation-agent.
- Ghi log phase.

## Phase 5 — Sales evaluator bounded loop

Thời gian dự kiến: 90 phút.

Việc cần làm:

1. Tạo `SalesEvaluatorAgentService`.
2. Sau sales-agent draft, evaluator LLM kiểm:
   - text không lộ internal handoff/debug;
   - text chỉ nhắc products trong recommendation handoff;
   - nếu rail có products, text biết rail đang hiển thị gì;
   - cart action chỉ claim tool result completed.
3. Nếu fail, retry sales-agent tối đa 1 lần với complaint ngắn.
4. Emergency sanitize chỉ dùng sau retry vẫn fail, trace/history ghi `emergency_guardrail`.
5. Streaming path: có thể giữ stream draft nhưng final phải được evaluator sửa trước khi lưu/trace; nếu cần phase này ưu tiên non-stream correctness trước, streaming sẽ follow-up nếu quá lớn.

Testing phase:

- Draft lộ `Recommendation-agent handoff` => evaluator fail, retry hoặc emergency guardrail.
- Draft nhắc sản phẩm ngoài rail => fail.
- Draft hợp lệ => pass không retry.

Docs/logs:

- Cập nhật docs evaluator loop.
- Ghi log phase.

## Phase 6 — Trace/dashboard metadata

Thời gian dự kiến: 45 phút.

Việc cần làm:

1. Trace events thêm fallback/LLM/pass/fail flags.
2. Pipeline ghi agent history status.
3. Dashboard không cần redesign lớn, chỉ đảm bảo trace data có đủ node/event.

Testing phase:

- Typecheck API/web.
- Kiểm trace object có events mới trong unit/integration test.

Docs/logs:

- Cập nhật docs observability.
- Ghi log phase.

## Phase 7 — Final validation and docs/logs

Thời gian dự kiến: 45 phút.

Commands:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api test
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm typecheck
```

Manual validation:

1. “Tìm máy lọc phòng 25m2 dưới 4 triệu” => text nhắc đúng cards.
2. “Cho nhiều sản phẩm hơn” => gọi alternatives, hiển thị sản phẩm khác, không hỏi lại.
3. “So sánh 2 máy lọc...” => rail đúng 2 sản phẩm đang so sánh.
4. Policy/cart-status không hiện rail.
5. Response không lộ internal handoff.

Docs/logs:

- Ghi tổng kết task trong `docs/implementation/real-agent-pipeline.md`.
- Ghi log cuối trong `logs/implementation/real-agent-pipeline.md`.

## Ghi chú push-code-skill

Project hiện tại không phải git repository theo environment, nên không thể push bằng git trong session này. Nếu sau khi hoàn tất cần push, phải khởi tạo/đưa vào repo hoặc user cung cấp remote/git context.
