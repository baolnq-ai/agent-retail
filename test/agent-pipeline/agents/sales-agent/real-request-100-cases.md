# Real Request 100: Sales Agent

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02
- Related plan: `plans/agent-pipeline/agents/sales-agent/plan.md`
- Status: planned

## Rule

Each case must run through API/agent runtime with real SalesAgentRequest payloads produced from Lead-like grounded facts. A case passes only when final text, blocks, product ids and guardrail output are correct.

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Referenced product answers |
| 2 | 10 | Recommendation list answers |
| 3 | 10 | Referenced product + companion recommendations |
| 4 | 10 | Search exact and semantic fallback wording |
| 5 | 10 | Cart confirmation and cart failure |
| 6 | 10 | Policy/support facts supplied by other agents |
| 7 | 10 | Missing/partial facts and clarification |
| 8 | 10 | Product id mismatch and forbidden claims |
| 9 | 10 | LLM unsafe output/internal leaks |
| 10 | 10 | Lead integration and frontend block consistency |

## Required Assertions

- `usedProductIds` match product ids in text and blocks.
- `mustMentionProductIds` are present.
- `mustNotMentionProductIds` are absent.
- no invented price/stock/spec/policy claims.
- semantic fallback wording is preserved.
- referenced product and companion products are not confused.
- blocks validate against frontend schema.
