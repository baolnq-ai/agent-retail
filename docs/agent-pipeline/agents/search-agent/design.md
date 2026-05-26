# Search Agent Design

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 18:04
- Status: draft
- Related plan: `plans/agent-pipeline/agents/search-agent/plan.md`

## Summary

Search Agent is the retrieval pipeline for product discovery. It searches hard first, then falls back to embeddings when exact/lexical search cannot recall enough relevant candidates.

## Pipeline

```txt
normalize query
  -> extract hard filters
  -> exact/id/title search
  -> category/brand/attribute/price/stock filters
  -> full-text/trigram search
  -> if low recall: embedding semantic fallback
  -> merge/dedupe
  -> verify constraints
  -> return candidates with evidence
```

## Boundary

Search Agent returns candidates. Recommendation Agent ranks personalized recommendations. Search Agent does not calculate purchase probability or personalize rails.

Lead Agent calls Search Agent for product lookup, product resolve, product detail candidate selection and comparison candidate lookup. The old Product Manager Agent is skipped in the new production architecture because Search Agent owns that boundary.

## Private History

Search Agent has its own interaction and memory history:

- `SearchAgentInteraction`: query, normalized query, filters, used lanes, candidates, selected ids, facts/issues/status.
- `SearchAgentMemory`: near/mid/far summaries for repeated search context.

This lets it resolve references such as "cái thứ hai lúc nãy", "tìm tiếp loại đó", or "sản phẩm vừa tìm".

## LLM Rule

No LLM toolcall. LLM is optional response-only normalizer/judge over bounded candidates.

## Semantic Fallback Language

When embedding search is used because exact/hard/lexical search did not find a confident match, Search Agent must mark the result as fallback.

Allowed wording for Lead:

- "Không thấy chính xác sản phẩm/tên đó trong catalog, nhưng có vài sản phẩm gần giống hoặc phù hợp."
- "Không có kết quả khớp cứng. Đây là các sản phẩm tương đồng theo mô tả/nhu cầu."

Forbidden:

- "Đã tìm thấy đúng sản phẩm" when only embedding matched.
- Hiding the fact that the result came from semantic fallback.
