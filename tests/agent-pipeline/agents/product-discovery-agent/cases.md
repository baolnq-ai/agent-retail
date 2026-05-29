# Test Cases: Product Discovery Agent

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:20
- Related plan: `plans/agent-pipeline/agents/product-discovery-agent/plan.md`
- Status: planned

## Goal

Kiểm chứng Product Discovery Agent xử lý đúng search, recommendation, alternatives, compare/detail, rerank, evidence, audit, feedback và response-only LLM policy.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| PDA-001 | Search exact product title | Returns exact product first with evidence |
| PDA-002 | Search by product id/sku/ref | Resolves one product with high confidence |
| PDA-003 | Search category only | Returns bounded candidates with category evidence |
| PDA-004 | Search brand + budget | All selected products match brand and budget |
| PDA-005 | Search attribute/spec, e.g. room size | Selected products include matching attribute evidence |
| PDA-006 | Query under 2 million | No selected product exceeds budget |
| PDA-007 | Query above 2 million | No product below min budget if min is hard |
| PDA-008 | Require in-stock | Out-of-stock products excluded |
| PDA-009 | Product out of stock but user asks detail | Product can appear with out-of-stock issue |
| PDA-010 | No hard/lexical result | Semantic fallback runs and trace records fallback |
| PDA-011 | Semantic fallback also low confidence | Returns `no_results` or clarification |
| PDA-012 | User asks "cho nhiều sản phẩm hơn" | Alternatives exclude recent selected ids |
| PDA-013 | Cart Agent reports product out of stock | Alternatives lane returns in-stock substitutes |
| PDA-014 | User asks compare 2 products | Exactly 2 verified products and compare facts |
| PDA-015 | Compare has only one resolved product | `needs_clarification` or partial with clear issue |
| PDA-016 | Product detail query | Exactly 1 product selected |
| PDA-017 | Recommendation by needs + budget | Ranking includes need fit and budget fit reasons |
| PDA-018 | Recommendation with preferences | Preference fit changes ranking with evidence |
| PDA-019 | Recommendation with behavior signals | Behavior fit recorded in ranking signals |
| PDA-020 | Already-in-cart product in recommendation | Exclude or label as already in cart based on lane |
| PDA-021 | Diversity scoring | Rail avoids near-duplicate products unless compare/detail requires |
| PDA-022 | LLM judge selects unknown product id | Validator rejects judge output |
| PDA-023 | LLM judge emits tool_calls | Runtime ignores toolcall and parses schema only |
| PDA-024 | LLM judge emits raw SQL | Reject with unsafe output issue |
| PDA-025 | Candidate row missing required field | Product excluded or response fails safely |
| PDA-026 | Product rail and answer ids diverge | Verifier fails |
| PDA-027 | Rerank picks out-of-budget product | Verifier rejects selection |
| PDA-028 | Empty catalog | Returns `no_results`, no hallucinated product |
| PDA-029 | Large catalog benchmark | Search p95 meets budget with indexed queries |
| PDA-030 | Feedback clicked/added | Writes `ProductFeedbackSignal` |
| PDA-031 | Candidate snapshot required | Every selected rail has snapshot id |
| PDA-032 | Prompt injection asks to ignore filters | Security/validator rejects unsafe instruction |
| PDA-033 | User asks refund/complaint with product name | Handoff Customer Support, no recommendation rail |
| PDA-034 | User asks policy with product name | Handoff RAG, no invented policy claim |
| PDA-035 | Lead asks resolve product for Cart Agent | Returns product id + confidence, not final user answer |
| PDA-036 | Cart Agent asks alternative for unavailable product | Returns substitutes and reason |
| PDA-037 | Storage/Memory unavailable | Runs non-personalized fallback with lower confidence |
| PDA-038 | Embedding service unavailable | Runs lexical fallback and logs recoverable issue |
| PDA-039 | Unknown category | Clarifies or maps synonym with evidence |
| PDA-040 | Vietnamese unit variants "2tr", "2 triệu", "2.000.000" | Normalized to same budget constraint |

## Automation target

- Contract tests for `ProductDiscoveryRequest`, `ProductDiscoveryResult`, private plan and LLM judge output.
- DB integration tests for search indexes, snapshots and feedback signals.
- API/agent runtime tests for search/recommend/compare/detail/alternatives.
- Negative tests for raw SQL, toolcall payload, unknown product ids and unsafe claims.
- Benchmark for search/recommend p95 on seeded catalog.
