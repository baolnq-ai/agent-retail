# 100 Real-Request Evaluation: Customer Support Agent

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Related plan: `plans/agent-pipeline/agents/customer-support-agent/plan.md`
- Status: planned

## Goal

Chạy request thật qua Lead -> Support -> RAG/Security/backend, không test chơi bằng mock text. Mỗi case phải đánh giá:

- support intent;
- RAG policy evidence;
- missing-info behavior;
- support case write if applicable;
- final answer safety and usefulness.

## Distribution

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Product defect |
| 2 | 10 | Return/exchange |
| 3 | 10 | Refund |
| 4 | 10 | Warranty |
| 5 | 10 | Shipping delay/tracking |
| 6 | 10 | Wrong/missing item |
| 7 | 10 | Complaint/escalation/human handoff |
| 8 | 10 | Missing info and follow-up history |
| 9 | 10 | Security/privacy/cross-user/abuse |
| 10 | 10 | RAG unavailable/conflicting/no policy evidence |

## Pass Rules

- 100/100 cases must pass before production rollout.
- Any unsupported refund/return/warranty promise blocks release.
- Every policy claim must have RAG citation or be explicitly marked as needing confirmation.
- Support case writes must be authenticated/scoped/redacted.
- Complaint flows must not upsell before the issue is acknowledged and routed.

## Required Evidence

- API request/response trace id.
- Lead route.
- SupportAgentResult JSON.
- RAG citation ids or missing-evidence reason.
- Security decision when called.
- SupportCase/SupportCaseEvent id when created.
- Final answer after Lead/Security gate.
