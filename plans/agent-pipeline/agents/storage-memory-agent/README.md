# Storage/Memory Agent Job

- Created: 2026-05-21 18:18
- Updated: 2026-05-21 18:18
- Status: planned
- Scope: production memory, history and context retrieval pipeline for Lead and domain agents.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main Storage/Memory Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/storage-memory-agent/design.md](../../../../docs/agent-pipeline/agents/storage-memory-agent/design.md) |
| Test cases | [tests/agent-pipeline/agents/storage-memory-agent/cases.md](../../../../tests/agent-pipeline/agents/storage-memory-agent/cases.md) |
| Real request 100 | [tests/agent-pipeline/agents/storage-memory-agent/real-request-100-cases.md](../../../../tests/agent-pipeline/agents/storage-memory-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/storage-memory-agent.md](../../../../logs/log-plan-agent-pipeline/storage-memory-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/storage-memory-agent.md](../../../../logs/planning/agent-pipeline/agents/storage-memory-agent.md) |

## Current Design Decisions

- Storage/Memory Agent is the central memory service for Lead Agent and domain agents.
- Domain agents still own their private history, but Storage/Memory indexes summaries/signals and exposes safe context retrieval.
- Memory tiers: near, mid, far.
- LLM mode: response-only structured summarization/extraction. No LLM/vLLM toolcall dependency.
