# Log: RAG Agent Plan Job

- Created: 2026-05-21 19:34
- Updated: 2026-05-21 19:34
- Type: planning
- Related job: `plans/agent-pipeline/agents/rag-agent/`

## 2026-05-21 19:34

### Goal

Create RAG Agent plan for Qdrant-backed internal knowledge retrieval.

### Work done

- Reviewed current `KnowledgeService` and schema.
- Identified current gap: DB keyword/in-memory search only, no Qdrant, no path grouping, no fair rerank, no token budget, no private RAG history.
- Created RAG Agent job files, design doc and tests.
- Added Docker Compose requirement for Postgres + Qdrant.
- Added env-controlled token budget with default target `RAG_MAX_CONTEXT_TOKENS=128000`.
- Added private history models: `RagAgentInteraction`, `RagAgentMemory`.

### Decision

RAG Agent uses PostgreSQL for metadata and Qdrant for vectors. Retrieval groups chunks by parent path, reranks fairly per path, reviews each path, then synthesizes final answer from reviewed sources only.

### Next

Finalize Docker Compose changes, env config and Qdrant ingestion contract during implementation phase.
