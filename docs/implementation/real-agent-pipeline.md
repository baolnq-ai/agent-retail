# Real Agent Pipeline Implementation

Thời gian: 2026-05-19

## Mục tiêu

Nâng cấp pipeline chatbot để giảm phụ thuộc vào rule/fix cứng và tiến gần hơn đến mô hình agent thật:

- Mỗi agent quan trọng có history riêng dạng bounded summary.
- User-analysis-agent và recommendation-agent có LLM-backed JSON contract.
- Rule hiện tại chỉ còn là pre-signal/fallback kỹ thuật khi LLM không khả dụng hoặc trả JSON không hợp lệ.
- Thêm sales-evaluator-agent để đánh giá draft của sales-agent trước khi response được lưu/trả về.

## Thay đổi chính

### Agent history

Tạo `AgentHistoryService` dùng storage `UserPreference` hiện có với key:

- `agent_history:user-analysis-agent`
- `agent_history:recommendation-agent`
- `agent_history:sales-evaluator-agent`

Mỗi history bị giới hạn tối đa 20 entries và khoảng 4KB để tránh phình dữ liệu.

### User-analysis-agent

`UserAnalysisAgentService.analyze()` đã chuyển sang async và gọi LLM JSON contract khi có `ModelGatewayService`.

Rule cũ vẫn tồn tại nhưng đổi vai trò thành fallback/pre-signal:

- intent
- cart operation
- retrieval mode
- references
- constraints

### Recommendation-agent

`RecommendationAgentService.planPresentation()` đã chuyển sang async và gọi LLM JSON contract để quyết định:

- có show product rail không;
- rail đang hiển thị sản phẩm nào;
- sales-agent được phép nhắc sản phẩm nào;
- trạng thái approved/blocked/needs_revision.

LLM không được chọn product id ngoài allowed scope; nếu chọn sai thì fallback được ghi vào agent history.

### Sales-evaluator-agent

Thêm `SalesEvaluatorAgentService` để kiểm draft response:

- không lộ internal debug/handoff;
- không nhắc sản phẩm ngoài product rail;
- không nói có khung đề xuất khi recommendation không cho show;
- không claim cart action khi tool result chưa completed.

Nếu fail, sales-agent được retry tối đa 1 lần với complaint từ evaluator.

## Những giới hạn còn lại

- Streaming path hiện vẫn stream draft token trước, evaluator chạy ở final response. Muốn UX tuyệt đối đúng thì cần thiết kế stream buffer hoặc stream bản đã evaluate trong follow-up.
- Product-manager và cart-manager vẫn còn nhiều rule deterministic vì đây là phần tool/query executor; cần thêm LLM planning layer riêng nếu muốn agent hóa sâu hơn.
- Emergency sanitize vẫn còn trong response path như safety net, nhưng không còn là cơ chế đánh giá chính.

## Validation

Đã chạy:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api test
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm typecheck
```

Kết quả:

- API tests: 13/13 pass.
- API/Web/workspace typecheck: pass.

## Ghi chú bảo mật

- Không lưu raw API key, cookie, session token vào agent history.
- Agent history chỉ lưu input/output summary và complaints ngắn.
- Không thêm dependency mới.
