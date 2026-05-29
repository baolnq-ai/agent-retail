# Search Agent Job

- Created: 2026-05-21 17:40
- Updated: 2026-05-21 17:40
- Status: planned
- Scope: production pipeline for hard product search and semantic fallback.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Search Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/search-agent/design.md](../../../../docs/agent-pipeline/agents/search-agent/design.md) |
| Test cases | [tests/agent-pipeline/agents/search-agent/cases.md](../../../../tests/agent-pipeline/agents/search-agent/cases.md) |
| Job log | [logs/log-plan-agent-pipeline/search-agent.md](../../../../logs/log-plan-agent-pipeline/search-agent.md) |

## Current Decision

Search Agent is separate from Recommendation Agent. It focuses on deterministic retrieval: exact/hard search first, then lexical/filter search, then embedding fallback only when hard search has low recall/confidence.
