# History Agent Job

- Created: 2026-05-21 18:42
- Updated: 2026-05-21 18:42
- Status: planned
- Scope: ambiguity/history investigation agent called by Lead only when a user request references previous context.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main History Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/history-agent/design.md](../../../../docs/agent-pipeline/agents/history-agent/design.md) |
| Test cases | [test/agent-pipeline/agents/history-agent/cases.md](../../../../test/agent-pipeline/agents/history-agent/cases.md) |
| Real request 100 | [test/agent-pipeline/agents/history-agent/real-request-100-cases.md](../../../../test/agent-pipeline/agents/history-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/history-agent.md](../../../../logs/log-plan-agent-pipeline/history-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/history-agent.md](../../../../logs/planning/agent-pipeline/agents/history-agent.md) |

## Current Design Decisions

- Lead calls History Agent only when the request is ambiguous or references previous context.
- History Agent reads safe conversation/agent memory, not internal debug logs or secrets.
- History Agent returns resolved references, confidence, evidence and recommended next agents.
- History Agent does not search product DB directly and does not answer the user.
