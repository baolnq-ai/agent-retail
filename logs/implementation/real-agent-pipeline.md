# Real Agent Pipeline Log

Thời gian: 2026-05-19

## Phase 1 — Plan và contract

- Tạo plan tại `plans/plan-real-agent-pipeline.md`.
- Thêm contract trong `agent-execution.models.ts`:
  - `AgentHistoryEntry`
  - `AgentHistoryContext`
  - `SalesEvaluationResult`
  - `decisionSource` cho user-analysis/recommendation.

## Phase 2 — Agent history

- Tạo `AgentHistoryService`.
- Storage dùng `UserPreference`, key `agent_history:{agent}`.
- Giới hạn 20 entries và khoảng 4KB.
- Typecheck API: pass.

## Phase 3 — User-analysis-agent LLM contract

- `UserAnalysisAgentService.analyze()` chuyển sang async.
- Có LLM JSON contract khi model gateway khả dụng.
- Rule cũ giữ làm pre-signal/fallback.
- Cập nhật `AgentService.prepareChat()` để await analysis.
- Typecheck API: pass.

## Phase 4 — Recommendation-agent LLM contract

- `RecommendationAgentService.planPresentation()` chuyển sang async.
- Có LLM JSON contract chọn product rail.
- Validate product id không vượt allowed scope.
- Rule cũ giữ làm fallback.
- Typecheck API: pass.

## Phase 5 — Sales evaluator

- Tạo `SalesEvaluatorAgentService`.
- Evaluator kiểm draft response, product rail alignment và internal leakage.
- Nếu fail, sales-agent retry tối đa 1 lần.
- Typecheck API: pass.

## Testing

Lệnh đã chạy:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api test
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm typecheck
```

Kết quả:

- API test suite: 13/13 pass.
- Web typecheck: pass.
- Workspace typecheck: pass.

## Ghi chú

- Test ban đầu fail vì service đổi sang async nhưng test chưa await. Đã cập nhật test, giữ nguyên expected behavior.
- Project environment báo không phải git repository, nên chưa thể thực hiện bước push-code-skill trong session này.
