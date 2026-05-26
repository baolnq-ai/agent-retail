# Log: History Agent Plan

- Created: 2026-05-21 18:42
- Updated: 2026-05-22 14:45
- Type: planning
- Related plan: `plans/agent-pipeline/agents/history-agent/plan.md`

## 2026-05-22 14:45

### Goal

Implement and close History Agent runtime after Storage/Memory Agent passed.

### Work done

- Added History Agent contracts and `HistoryAgentService`.
- Registered service in `AppModule`.
- Implemented ambiguity classifier, safe Storage/Memory retrieval, evidence-backed resolver, next-agent hints and product rail consistency guard.
- Added unit tests and 100-case real-request harness.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 84/84.
- `corepack pnpm --filter @retail-agent/api test:runtime:history-agent:100`: pass, 100/100.

### Decision

History Agent close gate passed. Live trace/audit wiring is deferred to Lead Agent runtime integration.

## 2026-05-21 18:42

### Goal

Lập plan History Agent để Lead xử lý các câu hỏi mơ hồ như "sản phẩm vừa đề xuất" hoặc "cái lúc nãy".

### Work done

- Tạo plan/doc/test/log/status/checklist cho History Agent.
- Chốt History Agent chỉ được gọi khi Lead phát hiện tham chiếu lịch sử mơ hồ.
- Chốt nó đọc safe memory và private history summary của Cart/Search/Recommendation, không đọc debug logs/secrets.
- Chốt contract trả resolved references, confidence, evidence, missingInfo và nextAgentHints.
- Chốt rule chống lệch text/product rail.

### Decision

Storage/Memory là kho nhớ; History Agent là người điều tra ý nghĩa của tham chiếu mơ hồ. Lead sẽ dùng kết quả đó để gọi Search/Recommendation/Sales đúng bước.
