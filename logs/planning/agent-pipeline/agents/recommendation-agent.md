# Log: Recommendation Agent Plan

- Created: 2026-05-21 17:52
- Updated: 2026-05-21 18:04
- Type: planning
- Related plan: `plans/agent-pipeline/agents/recommendation-agent/plan.md`

## 2026-05-21 17:52

### Goal

Tách Recommendation Agent thành pipeline riêng cho đề xuất/rerank/xác suất/hành vi.

### Work done

- Tạo plan/doc/tests/status/checklist/log cho Recommendation Agent.
- Chốt Lead gọi Recommendation Agent khi muốn đề xuất, alternatives, upsell/cross-sell hoặc cá nhân hóa.
- Chốt Recommendation Agent dùng candidate pool từ Search/embedding/popular/complements.
- Bổ sung private history: `RecommendationAgentInteraction`, `RecommendationAgentMemory` near/mid/far.

### Decision

Recommendation Agent không làm hard search. Nó sở hữu rerank, scoring xác suất, học từ hành vi và feedback.

## 2026-05-21 18:04

### Goal

Chốt wording khi Recommendation Agent dùng candidate từ embedding hoặc semantic fallback.

### Work done

- Bổ sung rule không claim exact match nếu candidate source là embedding.
- Thêm `candidateSource` vào product result.
- Thêm test case cho reason/handoff semantic candidate.

### Decision

Recommendation Agent phải nói "phù hợp/tương đồng/gợi ý thay thế" khi nguồn là embedding, không nói như đã tìm thấy đúng sản phẩm.
