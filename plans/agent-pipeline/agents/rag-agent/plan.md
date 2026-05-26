# Plan: RAG Agent

- Created: 2026-05-21 19:24
- Updated: 2026-05-21 19:34
- Status: planned
- Related log: `logs/log-plan-agent-pipeline/rag-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/rag-agent.md`
- Related doc: `docs/agent-pipeline/agents/rag-agent/design.md`
- Related tests: `test/agent-pipeline/agents/rag-agent/cases.md`, `test/agent-pipeline/agents/rag-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/rag-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/rag-agent/checklist.md`

## Goal

RAG Agent quản lý và trả lời toàn bộ thông tin nội bộ chính thức trên DB/vector store:

- thông tin doanh nghiệp;
- chính sách shop;
- pháp lý;
- hỗ trợ người dùng;
- bảo hành, đổi trả, vận chuyển;
- tài liệu thương hiệu;
- tài liệu nội bộ được phép dùng cho chatbot.

RAG Agent không bán hàng thay Sales, không mutate cart, không tự bịa policy. Nó trả facts/citations/source snippets cho Lead/Sales/Support.

## Current Runtime Gap

Hiện tại `KnowledgeService.searchKnowledge()`:

- đọc toàn bộ `KnowledgeDocument` từ PostgreSQL;
- score keyword trong memory;
- không có Qdrant;
- không có embedding vector retrieval thật;
- không có parent path/tài liệu cha;
- không có chunk metadata/version/source;
- không có rerank theo path;
- không có LLM review từng path;
- không có token budget 128k theo env;
- không có RAG private history.

## Required Environment Config

Token budget and Qdrant config must be externalized:

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_RAG_COLLECTION=retail_rag_documents
RAG_MAX_CONTEXT_TOKENS=128000
RAG_MAX_PATHS=8
RAG_MAX_CHUNKS_PER_PATH=8
RAG_MIN_PATH_REVIEW_SCORE=0.65
RAG_FINAL_SYNTHESIS_MAX_TOKENS=4096
RAG_EMBEDDING_MODEL_ID=
```

Rules:

- Never hardcode 128k in runtime logic. Read `RAG_MAX_CONTEXT_TOKENS`.
- If model context is smaller than env value, runtime must use the lower safe model limit.
- Token budget must reserve space for system prompt, user question, final answer and citations.

## Docker Compose Requirement

Qdrant must be installed and managed through Docker Compose. Do not require Qdrant to be installed on the host machine.

The project compose stack should manage at least:

- PostgreSQL for relational metadata and transactional app data;
- Qdrant for RAG vectors;
- Redis if queue/cache is used;
- API service;
- Web service when running full stack;
- optional worker service for RAG ingestion/embedding jobs.

Recommended compose service shape:

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "${POSTGRES_PORT:-55432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-retail}"]

  qdrant:
    image: qdrant/qdrant:v1.12.5
    ports:
      - "${QDRANT_PORT:-6333}:6333"
      - "${QDRANT_GRPC_PORT:-6334}:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:6333/healthz"]

volumes:
  postgres_data:
  qdrant_data:
```

Required env additions:

```env
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_RAG_COLLECTION=retail_rag_documents
RAG_MAX_CONTEXT_TOKENS=128000
```

Rules:

- One compose entrypoint should bring up Postgres and Qdrant together for local development/test.
- Qdrant data must persist in a named volume.
- API startup must fail clearly or mark RAG unavailable if Qdrant is unreachable.
- RAG tests that require vector retrieval must start the compose stack or use the same compose service.
- Seed/upload test docs must target the configured Qdrant collection, not an in-memory fake.

## DB + Qdrant Architecture

PostgreSQL stores canonical metadata. Qdrant stores vectors.

```txt
KnowledgePath
  id
  path
  title
  type: business | legal | support | policy | brand | faq | internal
  parentPathId?
  version
  status: active | draft | archived
  trustLevel
  sourceUri?
  owner?
  createdAt
  updatedAt

KnowledgeChunk
  id
  pathId
  chunkIndex
  title
  content
  contentHash
  tokenCount
  metadata Json
  qdrantPointId
  createdAt
  updatedAt

RagIngestionJob
  id
  source
  status
  pathCount
  chunkCount
  errorSummary?
  createdAt
  completedAt?

RagAgentInteraction
  id
  userId?
  requestId
  question
  normalizedQuestion
  selectedPathIds Json
  reviewedPathIds Json
  finalChunkIds Json
  answerFacts Json
  citations Json
  issues Json
  status
  tokenUsage Json
  createdAt

RagAgentMemory
  id
  userId?
  tier: near | mid | far
  key
  value Json
  summary?
  sourceRefs Json
  confidence
  createdAt
  updatedAt
```

Qdrant point payload:

```json
{
  "chunkId": "chunk_123",
  "pathId": "path_policy_return",
  "path": "policy/returns/7-day-return.md",
  "parentPath": "policy/returns",
  "title": "Chính sách đổi trả 7 ngày",
  "type": "policy",
  "version": "2026-05-21",
  "trustLevel": "official",
  "tokenCount": 320,
  "contentHash": "..."
}
```

## Ingestion Pipeline

```txt
source docs
  -> parse files/DB rows
  -> normalize path and parent path
  -> split into chunks
  -> compute content hash
  -> upsert KnowledgePath/KnowledgeChunk
  -> embed chunks
  -> upload vectors to Qdrant with payload
  -> verify count and hashes
  -> write RagIngestionJob
```

Seed test corpus must include:

- business information;
- legal terms;
- user support;
- return/refund;
- shipping;
- warranty;
- brand/company FAQ;
- sample internal SOP allowed for chatbot.

## Retrieval Pipeline

```txt
Lead/RAG request
  -> classify question topic
  -> embed query
  -> Qdrant vector search
  -> optional keyword/metadata filter from DB
  -> group chunks by parent path
  -> rerank chunks inside each path
  -> rerank paths fairly
  -> allocate token budget per path
  -> LLM review each selected path
  -> keep paths that pass review
  -> final balanced context pack
  -> LLM final synthesis
  -> answer with citations/facts/issues
```

## Path Fairness Rule

RAG must avoid one long file/path consuming all 128k context.

Fairness rules:

- Group chunks by `pathId` or parent path.
- First pass selects top paths, not only top chunks.
- Each selected path gets a minimum token slice when possible.
- Each path has max chunks and max token cap.
- Rerank within each path, then rerank path-level summaries.
- Final context pack must show path distribution in trace.
- If one path is clearly dominant, it can receive more budget but must not starve other relevant paths below the configured minimum unless token budget is too small.

Recommended allocation:

```txt
availableTokens = RAG_MAX_CONTEXT_TOKENS - reservedPromptTokens - reservedAnswerTokens
basePerPath = floor(availableTokens * 0.55 / selectedPathCount)
relevancePool = availableTokens * 0.45
pathBudget = basePerPath + relevancePool * normalizedPathScore
pathBudget <= RAG_MAX_TOKENS_PER_PATH if configured
```

## Per-Path Review Rule

Each selected path must pass review before entering final synthesis:

```txt
path chunks + question
  -> path review LLM response-only
  -> output:
      relevant: boolean
      answerableFacts
      missingFacts
      riskFlags
      score
      citations
  -> if score >= RAG_MIN_PATH_REVIEW_SCORE, include in final synthesis
```

This prevents weak vector matches from polluting final answer.

## Final Synthesis Rule

Final LLM receives only reviewed path packs:

- path title;
- path type/trust level;
- reviewed facts;
- citations;
- allowed claims;
- risk flags;
- missing info.

If no path passes review, RAG returns `not_found` or `needs_human_support`; it must not answer from general model knowledge.

## RAG Private History

RAG Agent has its own history.

It stores:

- question and normalized topic;
- query embedding metadata;
- Qdrant query filters;
- selected paths;
- rejected paths;
- per-path review result;
- final citations;
- token usage and budget allocation;
- final RAG answer facts/issues.

Use cases:

- "chính sách đó lúc nãy là gì?";
- "nguồn nào nói vậy?";
- "vừa rồi bạn dựa trên tài liệu nào?";
- "tóm lại phần pháp lý đó ngắn hơn";
- debugging RAG drift without reading raw debug logs.

History is not a replacement for source documents. It is an audit trail and conversation aid.

## Public Contract

```ts
interface RagAgentRequest {
  requestId: string;
  userId?: string;
  question: string;
  topicHint?: 'business' | 'legal' | 'support' | 'policy' | 'brand' | 'faq' | 'internal';
  filters?: {
    pathPrefix?: string;
    type?: string[];
    trustLevel?: string[];
    version?: string;
  };
  contextBudgetTokens?: number;
}

interface RagAgentResult {
  status: 'completed' | 'not_found' | 'needs_clarification' | 'failed';
  answerFacts: Array<{
    claim: string;
    confidence: number;
    citations: Array<{ pathId: string; chunkId: string; title: string; sourceUri?: string }>;
  }>;
  selectedPaths: Array<{
    pathId: string;
    path: string;
    title: string;
    score: number;
    tokenBudget: number;
    includedChunkIds: string[];
  }>;
  issues: Array<{ code: string; message: string; recoverable: boolean }>;
  handoff: {
    agentMessage: string;
    userSafeMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
}
```

## LLM Policy

No LLM/vLLM toolcall.

LLM may only return structured JSON for:

- per-path review;
- final synthesis;
- contradiction check.

Backend owns Qdrant search, DB reads, rerank, token budget and validation.

## Tool Inventory

Private tools total: 42.

| Group | Tools |
| --- | --- |
| Ingestion | `rag.ingest.parse_source`, `rag.ingest.normalize_path`, `rag.ingest.chunk`, `rag.ingest.hash`, `rag.ingest.embed`, `rag.ingest.upsert_db`, `rag.ingest.upsert_qdrant`, `rag.ingest.verify` |
| Retrieval | `rag.retrieve.embed_query`, `rag.retrieve.qdrant_search`, `rag.retrieve.db_metadata`, `rag.retrieve.keyword_filter`, `rag.retrieve.group_by_path`, `rag.retrieve.parent_paths` |
| Rerank | `rag.rerank.chunks_per_path`, `rag.rerank.path_summary`, `rag.rerank.fair_path_selection`, `rag.rerank.diversity`, `rag.rerank.contradiction_scan` |
| Budget | `rag.budget.read_env`, `rag.budget.reserve_prompt`, `rag.budget.allocate_per_path`, `rag.budget.trim_chunks`, `rag.budget.trace_distribution` |
| Review | `rag.review.path_response_only`, `rag.review.validate_path`, `rag.review.reject_weak_paths`, `rag.review.build_fact_pack` |
| Synthesis | `rag.synthesize.response_only`, `rag.synthesize.validate_citations`, `rag.synthesize.build_handoff`, `rag.synthesize.not_found` |
| History | `rag.history.write_interaction`, `rag.history.retrieve_recent`, `rag.history.summarize`, `rag.history.audit_sources` |
| Safety/trace | `rag.guard.authorize`, `rag.guard.redact`, `rag.guard.internal_doc_policy`, `rag.trace.emit`, `rag.eval.coverage`, `rag.eval.source_precision` |

## Interaction With Other Agents

- Lead Agent calls RAG for policy/business/legal/support/brand/internal knowledge.
- Sales Agent may use RAG facts but cannot invent policy claims.
- Customer Support Agent uses RAG for policy-backed support answers.
- Security Agent can inspect RAG output for data leakage or restricted internal docs.
- Storage/Memory may index safe summaries of RAG interactions, but RAG owns its private history.

## Verification

- Qdrant contains seeded test knowledge and point payloads match DB chunks.
- Retrieval groups chunks by parent path.
- Rerank is fair across relevant paths.
- Per-path LLM review rejects weak vector matches.
- Final synthesis cites only reviewed chunks.
- Token budget never exceeds `RAG_MAX_CONTEXT_TOKENS`.
- If no reviewed path passes, RAG refuses/not_found.
- Private history records selected/rejected paths and token allocation.

## Close Criteria

- Qdrant ingestion and retrieval are implemented and tested.
- Seed test documents for business/legal/support are uploaded.
- RAG answers with citations and bounded token context.
- Real-request 100-case suite passes 100% or has logged waivers.
