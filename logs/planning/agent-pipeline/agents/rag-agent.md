# Log: RAG Agent Plan

- Created: 2026-05-21 19:34
- Updated: 2026-05-21 19:34
- Type: planning
- Related plan: `plans/agent-pipeline/agents/rag-agent/plan.md`

## 2026-05-21 19:34

### Goal

Lập plan RAG Agent dùng Qdrant, parent path grouping, rerank công bằng và private history.

### Work done

- Rà current `KnowledgeService`: đang load all docs từ DB và score keyword trong memory.
- Chốt Qdrant là bắt buộc và chạy trong Docker Compose chung với Postgres.
- Chốt DB lưu metadata/path/chunk/version/history, Qdrant lưu vectors.
- Chốt retrieval: vector search -> group by path -> rerank từng path -> review path -> final synthesis.
- Chốt `RAG_MAX_CONTEXT_TOKENS` nằm trong env, mặc định target 128k.
- Chốt RAG Agent có history riêng.

### Decision

Không giả định máy host có Qdrant. Compose phải quản lý Postgres + Qdrant + volumes + healthcheck. RAG tests phải upload seed docs thật vào Qdrant collection.
