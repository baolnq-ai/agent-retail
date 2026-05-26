# Checklist: RAG Agent

- Created: 2026-05-21 19:24
- Updated: 2026-05-21 19:34

## Design

- [x] Define Qdrant as required vector store.
- [x] Define DB metadata + parent path/chunk schema.
- [x] Define path grouping and fair per-path token allocation.
- [x] Define per-path rerank + LLM review + final synthesis.
- [x] Define env-based 128k token budget.
- [x] Define RAG private history.
- [x] Define Docker Compose requirement for Postgres + Qdrant shared stack.
- [ ] Finalize Qdrant collection schema.
- [ ] Finalize RAG request/result contracts.
- [ ] Finalize seed test knowledge corpus.

## Implementation

- [ ] Add env config.
- [ ] Add Qdrant service to shared Docker Compose.
- [ ] Add DB schema/migration.
- [ ] Add Qdrant client.
- [ ] Add ingestion/chunking/embed/upload pipeline.
- [ ] Add path-group retriever.
- [ ] Add per-path rerank.
- [ ] Add per-path LLM review.
- [ ] Add final synthesis composer.
- [ ] Add private history writer.
- [ ] Add token budget allocator.
- [ ] Add trace/audit.

## Tests

- [ ] Qdrant upload/read tests.
- [ ] Docker Compose Qdrant health/startup tests.
- [ ] Ingestion/chunking tests.
- [ ] Path grouping tests.
- [ ] Fairness/token budget tests.
- [ ] Per-path rerank tests.
- [ ] LLM path review tests.
- [ ] Final synthesis citation tests.
- [ ] Private history tests.
- [ ] Real-request 100-case suite implemented.
- [ ] Real-request 100-case suite pass 100%.
