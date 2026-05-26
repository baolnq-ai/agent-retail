# Log: Recommendation Agent Plan Job

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 18:04
- Type: planning
- Related job: `plans/agent-pipeline/agents/recommendation-agent/`

## 2026-05-21 17:40

### Goal

Split Recommendation Agent out of the combined Product Discovery plan.

### Work done

- Created Recommendation Agent job folder, plan, status, checklist, doc and test cases.
- Defined rerank, embedding source, behavior features, probability scoring and feedback loop.
- Kept LLM response-only, no toolcall.

### Decision

Recommendation Agent owns personalization, rerank and probability. Search Agent owns retrieval.

## 2026-05-21 17:52

### Update

- Confirmed Lead Agent uses Recommendation Agent for đề xuất, alternatives, upsell/cross-sell and personalization.
- Added private Recommendation Agent history: `RecommendationAgentInteraction` and `RecommendationAgentMemory`.
- Clarified Recommendation Agent may consume Search candidate pools but does not perform hard search itself.

## 2026-05-21 18:04

### Update

- Added semantic candidate language rule.
- If candidate source is embedding or Search Agent semantic fallback, Recommendation Agent must say similar/suitable, not exact match.
