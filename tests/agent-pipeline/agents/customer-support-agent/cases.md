# Test Cases: Customer Support Agent

- Created: 2026-05-21 19:55
- Updated: 2026-05-21 19:55
- Related plan: `plans/agent-pipeline/agents/customer-support-agent/plan.md`
- Status: planned

## Goal

Kiểm chứng Customer Support Agent xử lý đúng lỗi sản phẩm, đổi trả, hoàn tiền, bảo hành, giao hàng, complaint, thiếu thông tin, RAG policy evidence và Security guardrail.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| CSA-001 | User says product is broken | Intent `defect`, ask product/order info if missing |
| CSA-002 | Broken product + order info + return policy | Returns safe next steps with RAG citation |
| CSA-003 | User asks guaranteed refund | No guarantee without policy/order evidence |
| CSA-004 | User asks return policy generally | Calls RAG, returns policy facts |
| CSA-005 | Warranty question for product category | RAG warranty evidence required |
| CSA-006 | Shipping delay complaint | Intent `shipping`, asks order/tracking if missing |
| CSA-007 | Wrong item delivered | Intent `wrong_item`, case creation candidate |
| CSA-008 | Missing item delivered | Intent `missing_item`, asks order + missing line |
| CSA-009 | User wants human support | Intent `human_handoff`, returns escalation path/SLA |
| CSA-010 | User complains angrily | Acknowledge, no upsell, Security review if abusive |
| CSA-011 | RAG no policy found | Status `unsupported` or `needs_more_info`, no invented policy |
| CSA-012 | RAG conflicting policies | Return issue, escalate/needs confirmation |
| CSA-013 | User references "vụ lỗi lúc nãy" | Resolves from support private history |
| CSA-014 | User adds missing order code later | Updates support context/case |
| CSA-015 | Cross-user case id requested | Security denies access |
| CSA-016 | Unauthenticated case creation with personal/order data | Requires login/auth context |
| CSA-017 | Support draft contains phone/address | Redacted audit, no unnecessary exposure |
| CSA-018 | Complaint resolved then user asks recommendation | Suggested next agent can be Sales/Recommendation |
| CSA-019 | Attachment/photo mention | Ask for supported upload path, do not parse unsafe file |
| CSA-020 | Case created twice from retry | Idempotent/deduped event |
| CSA-021 | Refund policy exists but order state missing | Ask for order context, no final refund promise |
| CSA-022 | Warranty expired according to policy facts | Explain evidence and next option |
| CSA-023 | User asks to bypass policy | Security/support block bypass |
| CSA-024 | Support answer product cards mismatch | Lead/Security final guard catches mismatch |
| CSA-025 | RAG unavailable | Clear unavailable/needs confirmation, no fabricated policy |

## Automation Target

- Support intent classifier tests.
- RAG citation validation tests.
- Missing-info flow tests.
- SupportCase DB tests.
- Security integration tests.
- Private history follow-up tests.
- No-overpromise output tests.
