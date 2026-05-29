# Sales Agent Job

- Created: 2026-05-21 19:02
- Updated: 2026-05-21 19:02
- Status: planned
- Scope: final customer-facing sales response composer.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Sales Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/sales-agent/design.md](../../../../docs/agent-pipeline/agents/sales-agent/design.md) |
| Test cases | [tests/agent-pipeline/agents/sales-agent/cases.md](../../../../tests/agent-pipeline/agents/sales-agent/cases.md) |
| Real request 100 | [tests/agent-pipeline/agents/sales-agent/real-request-100-cases.md](../../../../tests/agent-pipeline/agents/sales-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/sales-agent.md](../../../../logs/log-plan-agent-pipeline/sales-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/sales-agent.md](../../../../logs/planning/agent-pipeline/agents/sales-agent.md) |

## Current Design Decisions

- Sales Agent writes the final user-facing answer from Lead-provided facts.
- It does not search, recommend, mutate cart or invent product facts.
- It must keep text and product cards aligned through `mustMentionProductIds`.
- LLM mode: response-only structured output. No LLM/vLLM toolcall dependency.
