# Recommendation Agent Design

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 18:04
- Status: draft
- Related plan: `plans/agent-pipeline/agents/recommendation-agent/plan.md`

## Summary

Recommendation Agent is the personalization and ranking pipeline. It does not perform hard search. It takes candidate pools from Search Agent, embeddings, popularity, complements or curated sources, then scores and reranks based on probability and behavior.

## Pipeline

```txt
load profile/behavior/cart
  -> candidate pool from search/embedding/popular/complements
  -> extract features
  -> weighted score or ML probability
  -> rerank for diversity/business rules
  -> response-only LLM reason/judge if needed
  -> verify ids and claims
  -> write snapshot/feedback hooks
  -> return RecommendationResult
```

## Boundary

Search Agent retrieves. Recommendation Agent ranks. Cart Agent mutates cart. Lead Agent composes final answer.

Lead Agent calls Recommendation Agent when it wants product suggestions, alternatives, upsell/cross-sell or personalization. If the request needs hard product lookup first, Lead or Recommendation asks Search Agent for a candidate pool.

## Private History

Recommendation Agent has its own interaction and memory history:

- `RecommendationAgentInteraction`: goal, candidate source, features, scores, selected ids, issues, status.
- `RecommendationAgentMemory`: near/mid/far summaries for recent recommendations, rejected choices, preferences and stable behavior.

This lets it understand "gợi ý giống lúc nãy nhưng rẻ hơn", "đừng hiện hãng đó nữa", "cho thêm lựa chọn khác" and long-term preference patterns.

## ML Direction

Start with deterministic weighted scoring and feature logs. Once feedback data is enough, train or fit a model for `addToCartProbability`/`purchaseProbability` without changing the public contract.

## LLM Rule

No LLM toolcall. LLM may only produce structured reason/judge over selected candidates; backend validates all ids and claims.

## Semantic Candidate Language

When candidates come from embedding or Search Agent `semantic_fallback`, Recommendation Agent must describe them as similar, related or likely suitable. It must not claim they are exact search matches.
