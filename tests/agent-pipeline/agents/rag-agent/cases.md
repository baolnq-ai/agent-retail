# Test Cases: RAG Agent

- Created: 2026-05-21 19:34
- Updated: 2026-05-21 19:34
- Related plan: `plans/agent-pipeline/agents/rag-agent/plan.md`
- Status: planned

## Goal

Kiểm chứng RAG Agent dùng Qdrant thật trong Docker Compose, gom path/tài liệu cha, rerank công bằng, review từng path, chống tràn token và trả lời có citation.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| RAG-001 | Docker Compose starts Postgres + Qdrant | Both healthchecks pass |
| RAG-002 | Qdrant collection missing | Ingestion creates configured collection |
| RAG-003 | Upload business docs | Qdrant point count equals chunk count |
| RAG-004 | Upload legal docs | Payload includes path/type/trust/version |
| RAG-005 | Upload support docs | DB chunk hashes match Qdrant payload |
| RAG-006 | Query return policy | Retrieves return policy parent path |
| RAG-007 | Query company info | Retrieves business path, not support path |
| RAG-008 | Query legal term | Retrieves legal path with citation |
| RAG-009 | Many chunks in one path | Fair budget prevents one path starving others |
| RAG-010 | Multiple relevant paths | Context pack includes balanced paths |
| RAG-011 | Weak vector match | Per-path review rejects path |
| RAG-012 | No reviewed path passes | Returns `not_found`, no general model answer |
| RAG-013 | Path review passes | Final synthesis includes only reviewed facts |
| RAG-014 | Citation missing | Synthesis validation fails |
| RAG-015 | Context would exceed env budget | Budget trims chunks before final LLM |
| RAG-016 | `RAG_MAX_CONTEXT_TOKENS=4096` | Runtime obeys lower env budget |
| RAG-017 | Model safe limit lower than env | Runtime uses model safe limit |
| RAG-018 | Follow-up "nguồn nào nói vậy?" | Uses RagAgentInteraction history |
| RAG-019 | Follow-up "chính sách đó lúc nãy" | Resolves recent RAG topic from private history |
| RAG-020 | Internal restricted doc | Guard blocks if not allowed |
| RAG-021 | Qdrant unreachable | RAG returns failed/unavailable clearly |
| RAG-022 | Seed docs duplicated | Ingestion upserts by hash/path, no duplicate points |
| RAG-023 | Updated doc version | New chunks supersede old active version |
| RAG-024 | Conflicting docs | Contradiction issue returned |
| RAG-025 | Sales asks policy fact | RAG returns facts/citations for Sales, not sales copy |

## Automation Target

- Docker Compose startup/health tests.
- Qdrant collection upload/read tests.
- DB/Qdrant consistency tests.
- Path grouping/rerank/fairness tests.
- LLM path review parser tests.
- Final synthesis citation tests.
- RAG private history tests.
