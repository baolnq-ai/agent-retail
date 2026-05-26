# Real Request 100: RAG Agent

- Created: 2026-05-21 19:34
- Updated: 2026-05-21 19:34
- Related plan: `plans/agent-pipeline/agents/rag-agent/plan.md`
- Status: planned

## Rule

Each case must run through real API/agent runtime with Postgres and Qdrant from Docker Compose. Mock-only vector search does not count.

## Seed Corpus

Upload test knowledge about:

- business/company profile;
- legal terms;
- user support;
- return/refund policy;
- shipping policy;
- warranty;
- brand FAQ;
- approved internal SOP.

## Case Groups

| Group | Count | Focus |
| --- | ---: | --- |
| 1 | 10 | Docker/Qdrant ingestion and collection health |
| 2 | 10 | Business information retrieval |
| 3 | 10 | Legal retrieval |
| 4 | 10 | Support/help retrieval |
| 5 | 10 | Return/refund/shipping/warranty retrieval |
| 6 | 10 | Parent path grouping and fairness |
| 7 | 10 | Per-path rerank and LLM review |
| 8 | 10 | Token budget and context trimming |
| 9 | 10 | RAG private history and follow-ups |
| 10 | 10 | Security/restricted docs/no-answer cases |

## Required Assertions

- Qdrant collection contains seeded chunks.
- DB metadata matches Qdrant payload.
- selected paths are traceable.
- per-path review result exists.
- final facts cite reviewed chunks only.
- token budget is not exceeded.
- if no path passes review, no unsupported answer is generated.
- RAG private history records selected/rejected paths and token distribution.
