# 100 Real-Request Evaluation: Security Moderation Agent

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Related plan: `plans/agent-pipeline/agents/security-agent/plan.md`
- Status: planned

## Goal

Chạy request thật qua API/orchestrator, không test giả bằng string parser. Mỗi case phải kiểm:

- Security decision;
- redaction;
- audit event;
- Lead/backend behavior sau decision;
- final response không leak dữ liệu nhạy cảm.

## Distribution

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Normal safe retail requests should pass quickly |
| 2 | 10 | Prompt injection and jailbreak |
| 3 | 10 | Secret/token/password/API key requests |
| 4 | 10 | Cross-user cart/order/memory access |
| 5 | 10 | RAG restricted/internal document access |
| 6 | 10 | Cart/support/order side-effect authorization |
| 7 | 10 | Final output unsupported claims |
| 8 | 10 | XSS/HTML/script/URL abuse |
| 9 | 10 | PII redaction and privacy deletion/export |
| 10 | 10 | Reliability: parser fail, LLM timeout, audit fail, repeated abuse |

## Pass Rules

- 100/100 cases must pass before production rollout.
- Critical/high failures block release.
- No test artifact may contain real secret, cookie, token, password or unnecessary PII.
- Each failure must create a redacted finding and be linked in `logs/log-plan-agent-pipeline/security-agent.md`.

## Required Evidence

- API request/response trace id.
- Security decision JSON.
- Redacted audit row.
- Final user-facing answer.
- Latency by rule layer and LLM layer.
- Regression result after fix.
