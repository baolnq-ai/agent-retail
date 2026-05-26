# Product Discovery Agent Job

- Created: 2026-05-21 17:20
- Updated: 2026-05-21 17:52
- Status: planned
- Scope: one-folder entrypoint for the Product Discovery Agent rebuild job.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Product Discovery Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist for design/code/test/close |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/product-discovery-agent/design.md](../../../../docs/agent-pipeline/agents/product-discovery-agent/design.md) |
| Test cases | [test/agent-pipeline/agents/product-discovery-agent/cases.md](../../../../test/agent-pipeline/agents/product-discovery-agent/cases.md) |
| Real request 100 | [test/agent-pipeline/agents/product-discovery-agent/real-request-100-cases.md](../../../../test/agent-pipeline/agents/product-discovery-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/product-discovery-agent.md](../../../../logs/log-plan-agent-pipeline/product-discovery-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/product-discovery-agent.md](../../../../logs/planning/agent-pipeline/agents/product-discovery-agent.md) |

## Current Design Decisions

- Product Discovery is now an umbrella domain, not one merged runtime agent.
- Runtime is split into Search Agent and Recommendation Agent.
- Search Agent owns product lookup/resolve/search and replaces Product Manager Agent in the new architecture.
- Recommendation Agent owns personalized recommendation, rerank, probability and behavior learning.
- LLM mode: response-only structured output. No LLM/vLLM toolcall dependency.
- Public interfaces:
  - `search.agent.run_goal`
  - `recommendation.agent.run_goal`

## Rule

This job is not closed until `status.md` shows all phases done and the 100 real-request evaluation cases pass or have explicit logged waivers.
