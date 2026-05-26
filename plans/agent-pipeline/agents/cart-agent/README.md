# Cart Agent Job

- Created: 2026-05-21 16:32
- Updated: 2026-05-21 16:58
- Status: planned
- Scope: one-folder entrypoint for the Cart SQL RAG Agent rebuild job.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Cart SQL RAG Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist for design/code/test/close |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/cart-agent/design.md](../../../../docs/agent-pipeline/agents/cart-agent/design.md) |
| Test cases | [test/agent-pipeline/agents/cart-agent/cases.md](../../../../test/agent-pipeline/agents/cart-agent/cases.md) |
| Real request 100 | [test/agent-pipeline/agents/cart-agent/real-request-100-cases.md](../../../../test/agent-pipeline/agents/cart-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/cart-agent.md](../../../../logs/log-plan-agent-pipeline/cart-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/cart-agent.md](../../../../logs/planning/agent-pipeline/agents/cart-agent.md) |

## Rule

This job is not closed until `status.md` shows all phases done and the 100 real-request evaluation cases pass or have explicit logged waivers.

## Current Design Decisions

- DB additions planned: `CartEvent`, `CartAgentMemory`, `CartAgentInteraction`, `PendingCartAction`.
- Tool surface planned: 1 public interface `cart.agent.run_goal` + 36 private tools.
- LLM mode: response-only structured output; no LLM/vLLM toolcall dependency for Cart Agent.
