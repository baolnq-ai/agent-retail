# Product Discovery Agent Design

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:52
- Status: draft
- Related plan: `plans/agent-pipeline/agents/product-discovery-agent/plan.md`

## Summary

Product Discovery là domain umbrella cho hai runtime pipeline riêng:

- Search Agent: tìm kiếm/resolve sản phẩm.
- Recommendation Agent: đề xuất/rerank/xác suất/cá nhân hóa.

Không gộp Search và Recommendation thành một agent runtime.

Search Agent và Recommendation Agent đều trả product facts, selected product ids, reasons, ranking evidence và handoff cho Lead Agent. Cả hai không mutate cart, không tự trả lời policy/legal/support, và không viết final answer trực tiếp cho user.

## Current Runtime Gap

Hiện runtime có:

- `CatalogService.searchProducts()` load toàn bộ product bằng `findMany()` rồi score trong memory.
- `ProductManagerAgentService` build query và chọn candidates theo rule/heuristic.
- `RecommendationAgentService` chủ yếu quyết định product rail có được hiển thị không, nhưng chưa sở hữu search/rerank/evidence pipeline đầy đủ.

Thiếu production:

- search index thật;
- hard search/exact/attribute/filter lane rõ;
- semantic embedding fallback;
- candidate snapshot/audit;
- feedback loop;
- rerank có metric;
- rail/text consistency guard mạnh;
- private discovery history.

## Data Model Direction

Thêm hoặc mở rộng:

- `ProductSearchDocument`: normalized text/facet document cho search.
- `ProductEmbedding`: vector fallback nếu dùng pgvector.
- `ProductDiscoveryInteraction`: lịch sử goal, lane, constraints, selected products, facts/issues.
- `ProductDiscoveryCandidateSnapshot`: audit candidate set/ranking signals.
- `ProductFeedbackSignal`: shown/clicked/added/ignored/rejected signals.
- `Product` extensions: `slug`, `status`, `imageUrl`, `ratingAvg`, `reviewCount`, `tags`, `searchBoost`.

## Runtime Pipeline

```txt
Lead goal
  -> load schema/facets
  -> load memory/preferences/behavior
  -> load cart handoff if needed
  -> parse lane and constraints
  -> generate candidates
      -> hard/exact
      -> lexical/full-text/trigram
      -> attribute/filter
      -> semantic fallback
  -> merge/dedupe candidates
  -> filter stock/status/budget/spec
  -> score need/preference/behavior/cart/diversity
  -> optional LLM judge response-only over bounded candidates
  -> verify selected ids and allowed claims
  -> write candidate snapshot + trace
  -> return ProductDiscoveryResult
```

## LLM Response-Only Rule

Product Discovery Agent không dùng LLM/vLLM toolcall. LLM chỉ được trả structured JSON judge trên candidate set đã được backend tạo sẵn.

Backend giữ quyền:

- gọi search/recommendation tools;
- validate product ids;
- reject raw SQL/unknown product/unknown tool;
- verify rail ids và answer ids;
- write audit/trace.

vLLM không cần bật `--enable-auto-tool-choice` cho agent này.

## Tool Surface

- Public: `product_discovery.agent.run_goal`.
- Private tools: 45.
  - 6 context/schema tools.
  - 7 query/constraint tools.
  - 10 search tools.
  - 9 recommendation scoring tools.
  - 7 judge/presentation tools.
  - 6 audit/eval tools.

## Ownership

Product Discovery Agent được phép:

- resolve product id/name/ref cho Cart Agent;
- search products;
- recommend products;
- find alternatives;
- select compare/detail candidates;
- rerank candidates;
- write candidate audit and discovery interaction;
- produce product rail handoff for Lead.

Product Discovery Agent không được:

- mutate cart;
- create order/payment;
- answer refund/return/warranty;
- claim policy/legal/shop facts without RAG Agent;
- show products outside selected verified ids;
- invent product specs not in DB/evidence.

## Accuracy Rule

Every selected product must have evidence from DB rows or approved candidate snapshot. If selected product ids and final text ids diverge, verifier fails. If no candidate satisfies hard constraints, return `no_results` or `needs_clarification`, not a weak recommendation.

## Performance Rule

Hard/exact/filter search must avoid LLM and use indexed DB queries. Semantic search only runs on low recall or conceptual queries. LLM judge only runs over bounded candidates, not the full catalog.
