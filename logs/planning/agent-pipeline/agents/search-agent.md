# Log: Search Agent Plan

- Created: 2026-05-21 17:52
- Updated: 2026-05-22 15:10
- Type: planning
- Related plan: `plans/agent-pipeline/agents/search-agent/plan.md`

## 2026-05-22 15:10

### Goal

Implement and close Search Agent runtime after History Agent passed.

### Work done

- Added search schema and `SearchAgentService`.
- Implemented exact id/title, hard filters, lexical ranking and semantic fallback.
- Added fallback wording guard so embedding candidates are never claimed as exact matches.
- Added private Search Agent interaction and memory persistence.
- Added unit tests and 100-case real-request harness.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 89/89.
- `corepack pnpm --filter @retail-agent/api test:runtime:search-agent:100`: pass, 100/100.

### Decision

Search Agent close gate passed. Live Lead/Cart/Recommendation wiring remains in later integration plans.

## 2026-05-21 17:52

### Goal

Tách Search Agent thành pipeline riêng và bỏ Product Manager Agent khỏi kiến trúc production mới.

### Work done

- Tạo plan/doc/test/status/checklist/log cho Search Agent.
- Chốt Search Agent được Lead gọi khi muốn tìm kiếm hoặc resolve sản phẩm.
- Chốt pipeline: hard/exact search trước, filter/lexical tiếp theo, embedding fallback khi recall thấp.
- Bổ sung private history: `SearchAgentInteraction`, `SearchAgentMemory` near/mid/far.

### Decision

Search Agent thay Product Manager Agent trong kiến trúc mới. Nó chỉ trả candidates/evidence, không làm đề xuất cá nhân hóa.

## 2026-05-21 18:04

### Goal

Chốt rule khi Search Agent phải dùng embedding fallback.

### Work done

- Bổ sung rule: nếu hard/exact/lexical không thấy sản phẩm chính xác và phải dùng embedding, handoff phải nói rõ đây là fallback.
- Cấm claim "đã tìm thấy đúng sản phẩm" khi chỉ match bằng semantic similarity.
- Thêm `matchType=semantic_fallback` vào contract.
- Thêm test wording cho embedding fallback.

### Decision

Khi embedding fallback được dùng, Lead nên nói kiểu: "Không thấy chính xác sản phẩm đó trong catalog, nhưng có một vài sản phẩm gần giống hoặc phù hợp."
