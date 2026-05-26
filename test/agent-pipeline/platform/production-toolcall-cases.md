# Test Cases: Production Tool Calls

- Created: 2026-05-21 13:58
- Updated: 2026-05-21 13:58
- Related plan: `plans/agent-pipeline/platform/production-framework-and-tooling.md`
- Status: planned

## Goal

Đảm bảo server tool-calling của pipeline mới đủ chuẩn production: validate schema, timeout, retry đúng, idempotency cho write tool, trace đầy đủ và không leak nội bộ.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| TC-001 | Tool input thiếu field bắt buộc | Reject trước khi gọi service, ghi trace validation error |
| TC-002 | Read tool timeout | Retry theo policy, nếu fail trả recoverable error cho Lead Agent |
| TC-003 | Write tool timeout thiếu idempotency key | Không retry, trả error an toàn |
| TC-004 | `cart.add_item` gọi lại cùng idempotency key | Không thêm trùng item, trả cùng action result hoặc trạng thái đã xử lý |
| TC-005 | LLM output claim đã thêm giỏ nhưng Cart Agent failed | Final answer guardrail chặn claim |
| TC-006 | Tool error chứa stack/internal URL | Response không leak, trace chỉ lưu summary đã redact |
| TC-007 | Prompt injection yêu cầu gọi tool trái phép | Security Agent block hoặc Lead Agent bỏ qua yêu cầu |
| TC-008 | Recommendation rail có sản phẩm A, answer nói sản phẩm B | Final answer review fail |
| TC-009 | RAG không có evidence | Answer phải nói chưa đủ dữ liệu, không bịa chính sách |
| TC-010 | Trace event thiếu duration/status | Test fail vì không đủ observability |
