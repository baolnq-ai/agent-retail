# RAG Agent Job

- Created: 2026-05-21 19:24
- Updated: 2026-05-21 19:34
- Status: planned
- Scope: production RAG agent for internal business, legal, support, policy and knowledge documents.

## Files

| File | Purpose |
| --- | --- |
| [plan.md](plan.md) | Main RAG Agent plan |
| [status.md](status.md) | Current job status and phase tracker |
| [checklist.md](checklist.md) | Completion checklist |

## Related

| Type | Path |
| --- | --- |
| Design doc | [docs/agent-pipeline/agents/rag-agent/design.md](../../../../docs/agent-pipeline/agents/rag-agent/design.md) |
| Test cases | [test/agent-pipeline/agents/rag-agent/cases.md](../../../../test/agent-pipeline/agents/rag-agent/cases.md) |
| Real request 100 | [test/agent-pipeline/agents/rag-agent/real-request-100-cases.md](../../../../test/agent-pipeline/agents/rag-agent/real-request-100-cases.md) |
| Job log | [logs/log-plan-agent-pipeline/rag-agent.md](../../../../logs/log-plan-agent-pipeline/rag-agent.md) |
| Planning log mirror | [logs/planning/agent-pipeline/agents/rag-agent.md](../../../../logs/planning/agent-pipeline/agents/rag-agent.md) |

## Current Design Decisions

- Qdrant is required for vector retrieval.
- Qdrant must be managed by the shared Docker Compose stack with Postgres, not installed manually on host.
- DB stores document metadata, parent paths, chunks, versions, source and audit.
- RAG Agent has private history: `RagAgentInteraction`, `RagAgentMemory`.
- Retrieval groups chunks by parent path, reranks fairly per path, reviews each selected path, then synthesizes final answer.
- Token budget is environment-controlled, default target 128k tokens.
