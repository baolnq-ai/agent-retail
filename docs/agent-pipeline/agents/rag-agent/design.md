# RAG Agent Design

- Created: 2026-05-21 19:34
- Updated: 2026-05-21 19:34
- Status: draft
- Related plan: `plans/agent-pipeline/agents/rag-agent/plan.md`

## Summary

RAG Agent answers official internal knowledge questions using PostgreSQL metadata and Qdrant vector search. It covers business information, legal, support, policy, warranty, shipping, returns, brand and approved internal documents.

## Infrastructure

Qdrant is required and must run in the shared Docker Compose stack together with PostgreSQL.

Required services:

- `postgres`: source metadata, document paths, chunks, ingestion jobs, RAG history.
- `qdrant`: vector collection for knowledge chunks.
- API/worker: ingestion, embedding, upload and retrieval.

Do not require host-installed Qdrant.

## Data Model

Postgres stores:

- `KnowledgePath`: parent document/path metadata.
- `KnowledgeChunk`: chunk content, hash, token count, qdrant point id.
- `RagIngestionJob`: ingestion status.
- `RagAgentInteraction`: private RAG history.
- `RagAgentMemory`: near/mid/far RAG memory.

Qdrant stores vectors and payload:

- chunk id;
- path id;
- parent path;
- type/trust level;
- version;
- source metadata.

## Retrieval Pipeline

```txt
question
  -> embed query
  -> Qdrant vector search
  -> DB metadata/filter
  -> group chunks by parent path
  -> rerank chunks per path
  -> rerank paths fairly
  -> allocate token budget per path
  -> per-path LLM review
  -> final synthesis from reviewed paths only
  -> citations + facts + handoff
```

## Fairness

RAG must not let one large path consume all context. Each relevant path receives a fair budget before relevance-weighted extra tokens are assigned. Trace must show token distribution by path.

## Token Budget

`RAG_MAX_CONTEXT_TOKENS` controls total context budget. Default plan target is `128000`, but runtime must use the lower of env value and model-safe limit.

## Private History

RAG Agent stores:

- selected and rejected paths;
- reviewed paths;
- final chunks;
- citations;
- token allocation;
- issues and answer facts.

This supports follow-ups like "nguồn nào nói vậy?" or "chính sách đó lúc nãy là gì?".

## LLM Rule

No LLM toolcall. LLM only returns structured JSON for path review and final synthesis. Backend owns Qdrant search, DB reads, rerank, budget and validation.
