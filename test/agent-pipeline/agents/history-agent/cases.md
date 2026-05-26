# Test Cases: History Agent

- Created: 2026-05-21 18:42
- Updated: 2026-05-22 14:45
- Related plan: `plans/agent-pipeline/agents/history-agent/plan.md`
- Status: passed

## Goal

Kiểm chứng History Agent resolve được câu hỏi mơ hồ từ lịch sử, không leak memory nhạy cảm và giúp Lead giữ product text/rail khớp nhau.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| HA-001 | User asks "sản phẩm vừa đề xuất là gì?" | Resolves last recommendation product with source refs |
| HA-002 | User asks "cái thứ hai lúc nãy" | Resolves second product in previous product rail |
| HA-003 | User asks "mẫu đó có nên mua không?" | Resolves previous product, hints Lead to call Search for details then Sales |
| HA-004 | User asks "cho thêm loại giống vậy" | Resolves previous product/category and hints Recommendation for alternatives |
| HA-005 | User asks "rẻ hơn cái đó" | Resolves previous product and hints Search/Recommendation with budget below previous price |
| HA-006 | Previous recommendation had multiple products and no ordinal | Returns `ambiguous`, asks Lead to clarify |
| HA-007 | Previous search had semantic fallback | Preserves fallback status, does not claim exact product |
| HA-008 | Previous cart action added product | Resolves cart product from CartAgentInteraction |
| HA-009 | Previous product only appears in assistant text but not rail metadata | Low confidence or needs Search verification |
| HA-010 | No prior context | Returns `not_found`, no hallucination |
| HA-011 | Cross-user memory attempt | Authorization blocks |
| HA-012 | Prompt asks to read debug logs/secrets | Refuses/blocks unsafe source |
| HA-013 | Two recent products both plausible | Returns candidates with confidence and `ambiguous` |
| HA-014 | History resolves product id but missing full facts | Hints Search Agent before Sales answer |
| HA-015 | History resolves product and Recommendation adds companion products | Handoff separates referenced product from companion recommendations |
| HA-016 | Sales draft mentions product outside allowed ids | Consistency guard fails |
| HA-017 | Frontend rail ids differ from `mustMentionProductIds` | Test fails |
| HA-018 | Deleted memory would resolve reference | Deleted memory not returned |
| HA-019 | LLM resolver outputs unknown product id | Validator rejects |
| HA-020 | LLM resolver emits toolcall | Ignored/rejected; backend owns retrieval |

## Automation Target

- Contract tests for `HistoryAgentRequest` and `HistoryAgentResult`.
- Integration tests using seeded Memory/Recommendation/Search/Cart histories.
- Lead routing tests for when History Agent should and should not be called.
- Sales/product rail consistency tests.
- Security tests for cross-user and debug-log leakage.

## Current Automation Evidence

- `apps/api/tests/history-agent-service.test.mjs`: contract, ambiguity classification, previous recommendation, ordinal, pronoun ambiguity, all-last recommendations and rail consistency guard.
- `apps/api/tests/runtime-history-agent-real-request-100.mjs`: real Postgres 100-case suite with isolated users per case.
- Latest verification:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 84/84.
  - `corepack pnpm --filter @retail-agent/api test:runtime:history-agent:100`: pass, 100/100.

Lead trace/audit wiring remains tracked in the Lead Agent runtime plan.
