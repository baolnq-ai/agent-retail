# Customer Support Agent

- Status: planned
- Plan: `plan.md`
- Status log: `status.md`
- Checklist: `checklist.md`
- Design doc: `docs/agent-pipeline/agents/customer-support-agent/design.md`
- Tests: `tests/agent-pipeline/agents/customer-support-agent/cases.md`, `tests/agent-pipeline/agents/customer-support-agent/real-request-100-cases.md`
- Planning log: `logs/log-plan-agent-pipeline/customer-support-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/customer-support-agent.md`

## Scope

Customer Support Agent xử lý các vấn đề chăm sóc khách hàng:

- lỗi sản phẩm;
- đổi trả, hoàn tiền, bảo hành;
- vận chuyển, giao thiếu/sai hàng;
- complaint/khiếu nại;
- yêu cầu mở ticket/handoff người thật;
- câu hỏi cần policy hỗ trợ chính thức.

Agent này không tự bịa chính sách, không tự hứa hoàn tiền, không tự mutate order/payment/refund nếu chưa có tool/backend quyền riêng.
