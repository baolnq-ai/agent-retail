# Recommendation Agent Job

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 17:40
- Status: planned
- Scope: production recommendation pipeline for personalization, rerank, probability and behavior-driven ranking.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Recommendation Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/recommendation-agent/design.md](../../../../docs/agent-pipeline/agents/recommendation-agent/design.md) |
| Test cases | [tests/agent-pipeline/agents/recommendation-agent/cases.md](../../../../tests/agent-pipeline/agents/recommendation-agent/cases.md) |
| Job log | [logs/log-plan-agent-pipeline/recommendation-agent.md](../../../../logs/log-plan-agent-pipeline/recommendation-agent.md) |

## Current Decision

Recommendation Agent is separate from Search Agent. It uses candidate pools, embeddings, user behavior, preferences, cart signals, rerank, probability scoring and ML-style features to choose what should be recommended.
