# Security Moderation Agent

- Status: planned
- Plan: `plan.md`
- Status log: `status.md`
- Checklist: `checklist.md`
- Design doc: `docs/agent-pipeline/agents/security-agent/design.md`
- Tests: `test/agent-pipeline/agents/security-agent/cases.md`, `test/agent-pipeline/agents/security-agent/real-request-100-cases.md`
- Planning log: `logs/log-plan-agent-pipeline/security-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/security-agent.md`

## Scope

Security Moderation Agent là lớp kiểm duyệt và bảo vệ cho toàn bộ chatbot pipeline:

- kiểm duyệt input người dùng;
- phát hiện prompt injection, jailbreak, yêu cầu lộ system prompt;
- kiểm tra quyền truy cập memory, RAG, cart, support;
- kiểm tra kế hoạch agent trước khi chạy thao tác nhạy cảm;
- kiểm tra output cuối trước khi trả cho user;
- ghi audit event đã được redaction.

Agent này không thay Lead Agent, không tự bán hàng, không tự sửa DB nghiệp vụ. Nó trả về quyết định an toàn cho Lead/backend orchestration.
