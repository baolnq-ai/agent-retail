# Test Cases: Sales Agent

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02
- Related plan: `plans/agent-pipeline/agents/sales-agent/plan.md`
- Status: planned

## Goal

Kiểm chứng Sales Agent trả lời tự nhiên, đúng dữ liệu Lead cung cấp, không lệch text/product cards và không bịa claim.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| SLA-001 | Referenced product only | Text identifies product and product block contains same id |
| SLA-002 | Referenced product + companion recommendations | Text separates main product and add-on suggestions |
| SLA-003 | User asks "sản phẩm vừa đề xuất" and Lead resolved id | Sales says "Bạn đang nói đến..." with resolved product |
| SLA-004 | Recommendation returns 3 products | Text introduces 3 products and blocks contain same 3 ids |
| SLA-005 | Sales draft mentions product outside allowed ids | Guardrail fails |
| SLA-006 | Product block contains id not in text/usedProductIds | Guardrail fails |
| SLA-007 | `mustMentionProductIds` missing from text and blocks | `needs_revision` |
| SLA-008 | `mustNotMentionProductIds` appears | Blocked |
| SLA-009 | Search result is semantic fallback | Text says not exact match, suggests similar products |
| SLA-010 | Missing product facts | Sales asks clarification or says not enough info |
| SLA-011 | Cart add succeeded | Sales can say added to cart only if Cart Agent fact says success |
| SLA-012 | Cart add failed | Sales cannot claim added; explains issue |
| SLA-013 | RAG policy fact supplied | Sales uses only supplied policy fact |
| SLA-014 | Complaint/support context | Sales hands off support style, no product upsell unless allowed |
| SLA-015 | LLM draft leaks internal handoff | Validator rejects |
| SLA-016 | LLM draft includes toolcall | Ignored/rejected |
| SLA-017 | Companion products framed as main product | Guardrail asks revision |
| SLA-018 | Response too long for 3 product cards | Composer uses concise text |
| SLA-019 | Price/stock not supplied | Sales does not invent price/stock |
| SLA-020 | Final Lead review receives SalesResult | Used product ids and blocks are explicit |

## Automation Target

- Contract tests for SalesAgentRequest/Result.
- Parser/validator tests for response-only LLM output.
- Product id consistency tests.
- Lead/Sales integration tests.
- Frontend block schema tests.
