# Real Request 100: Product Discovery Agent

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:20
- Related plan: `plans/agent-pipeline/agents/product-discovery-agent/plan.md`
- Status: planned

## Rule

These are real request evaluation groups. Each case must run through the API/agent runtime, not only unit mocks. A case passes only when response schema, selected product ids, reasons, trace, candidate snapshot and forbidden claims are correct.

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Exact product resolve by title/id/brand/category |
| 2 | 10 | Budget and price constraints |
| 3 | 10 | Attribute/spec/room-size/product-need constraints |
| 4 | 10 | Semantic fallback and ambiguous Vietnamese queries |
| 5 | 10 | Recommendation with preferences and behavior |
| 6 | 10 | Alternatives and "more products" flows |
| 7 | 10 | Compare and product detail flows |
| 8 | 10 | Out-of-stock, already-in-cart and low inventory flows |
| 9 | 10 | Security, unsafe LLM output, unknown product ids, raw SQL |
| 10 | 10 | Cross-agent handoff with Cart/Lead/RAG/Support |

## Required Assertions

- `status` is correct.
- selected product ids exist in DB and candidate snapshot.
- selected products satisfy hard constraints.
- reasons cite grounded evidence.
- `mustMentionProductIds` equals product rail ids.
- `mustNotMentionProductIds` blocks unselected candidates.
- no raw SQL/toolcall/internal marker leaks.
- trace includes lane, candidate generation, filters, rerank, verifier.
- candidate snapshot is written for every non-empty rail.
- feedback signal write is tested where user click/add behavior is simulated.
