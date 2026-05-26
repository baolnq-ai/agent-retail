# Test Cases: Search Agent

- Created: 2026-05-21 17:40
- Updated: 2026-05-22 15:10
- Related plan: `plans/agent-pipeline/agents/search-agent/plan.md`
- Status: passed

| ID | Scenario | Expected |
| --- | --- | --- |
| SA-001 | Exact product title | Exact product first |
| SA-002 | Product id/ref | One high-confidence candidate |
| SA-003 | Category + budget | All candidates match both |
| SA-004 | Attribute/spec search | Evidence includes matched attribute |
| SA-005 | Hard search no result | Embedding fallback runs when policy allows |
| SA-005A | Embedding fallback returns similar products | Handoff says exact product was not found and these are similar/related products |
| SA-006 | Hard search no result and hard_only | Returns no_results |
| SA-007 | Out-of-stock filtered | Excluded when requireInStock true |
| SA-008 | Raw SQL from LLM response | Rejected, not executed |
| SA-009 | Unknown product id from judge | Rejected |
| SA-010 | Empty catalog | no_results, no hallucination |
| SA-011 | User asks exact product name but only embedding match exists | `matchType=semantic_fallback`, forbidden claim includes "found exact product" |

## Current Automation Evidence

- `apps/api/tests/search-agent-service.test.mjs`: exact, filter/budget/stock, lexical, semantic fallback wording, hard-only no-result and private history.
- `apps/api/tests/runtime-search-agent-real-request-100.mjs`: real Postgres 100-case suite.
- Latest verification:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 89/89.
  - `corepack pnpm --filter @retail-agent/api test:runtime:search-agent:100`: pass, 100/100.

Live trace/audit wiring remains in the final Lead/pipeline integration plan.
