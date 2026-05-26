# Plan: Storage/Memory Agent

- Created: 2026-05-21 18:18
- Updated: 2026-05-22 14:20
- Status: passed
- Related log: `logs/log-plan-agent-pipeline/storage-memory-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/storage-memory-agent.md`
- Related doc: `docs/agent-pipeline/agents/storage-memory-agent/design.md`
- Related tests: `test/agent-pipeline/agents/storage-memory-agent/cases.md`, `test/agent-pipeline/agents/storage-memory-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/storage-memory-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/storage-memory-agent/checklist.md`

## Goal

Storage/Memory Agent là bộ nhớ tổng của pipeline. Lead Agent gọi nó đầu tiên để điều tra lịch sử, sở thích, hành vi, ngữ cảnh gần đây và các memory signal trước khi quyết định gọi Cart/Search/Recommendation/RAG/Support.

Domain agents vẫn có private history riêng:

- Cart Agent: cart event, cart interaction, cart memory.
- Search Agent: search interaction, search memory.
- Recommendation Agent: recommendation interaction, recommendation memory.

Storage/Memory Agent không thay thế private history đó. Nó làm nhiệm vụ tổng hợp, index, summarize, retrieve context an toàn và trả về evidence cho Lead.

History Agent là agent riêng đứng trên Storage/Memory. Storage/Memory trả context và source refs; History Agent dùng chúng để suy luận các câu mơ hồ như "sản phẩm vừa đề xuất" hoặc "cái lúc nãy".

## Scope

- In:
  - write/read conversation turns;
  - near/mid/far memory;
  - preference extraction;
  - behavior signal aggregation;
  - cross-agent memory index;
  - rolling summary and compaction;
  - context budget management;
  - privacy export/delete;
  - memory evidence and trace.
- Out:
  - cart mutation;
  - search product DB directly for product facts;
  - recommendation scoring;
  - policy/legal answer;
  - final answer composition.

## Current DB And Runtime Assessment

Current DB has:

- `ChatThread` and `ChatMessage`: raw conversation turns.
- `UserPreference`: generic key/value store for rolling summary, recent recommendations, pending cart plan and agent history.
- `UserInteractionEvent`: generic event for user/product behavior.

Current runtime gaps:

- `ChatMemoryService.getContext()` returns only 6 recent messages and 8 preferences.
- `rolling_summary` is a simple string slice, not evidence-backed summary.
- `pending_cart_plan` is stored in `UserPreference`, but Cart Agent plan moves it to `PendingCartAction`.
- `AgentHistoryService` stores per-agent history inside `UserPreference`, limited to 20 entries and 4000 chars.
- `MemoryAgentService` does graph-like traversal from recent messages/preferences but no durable memory graph.
- No near/mid/far table.
- No source/evidence pointer per memory claim.
- No TTL/decay policy.
- No memory confidence score.
- No privacy export/delete per memory tier.
- No cross-agent memory index for Cart/Search/Recommendation/RAG/Support.

## DB Changes Needed

```txt
MemoryTurn
  id
  userId?
  threadId?
  requestId
  role: user | assistant | agent | system
  content
  metadata Json?
  createdAt

MemoryEvent
  id
  userId?
  requestId?
  sourceAgent?
  type
  subjectType?
  subjectId?
  payload Json
  confidence
  createdAt

MemoryItem
  id
  userId
  tier: near | mid | far
  key
  value Json
  summary?
  sourceRefs Json
  confidence
  tokenEstimate
  expiresAt?
  createdAt
  updatedAt

MemorySummary
  id
  userId
  scope: conversation | session | user | agent
  sourceAgent?
  sourceRefIds Json
  summary
  facts Json
  confidence
  tokenEstimate
  createdAt
  updatedAt

MemoryPreference
  id
  userId
  key
  value Json
  confidence
  sourceRefs Json
  decayPolicy?
  createdAt
  updatedAt

MemoryBehaviorSignal
  id
  userId?
  productId?
  category?
  brand?
  type
  weight
  sourceAgent?
  metadata Json?
  createdAt

MemoryAgentIndex
  id
  userId?
  sourceAgent
  sourceTable
  sourceId
  summary
  tags Json
  productIds Json?
  cartId?
  confidence
  createdAt
```

Indexes:

- `MemoryTurn(userId, createdAt)`
- `MemoryEvent(userId, type, createdAt)`
- `MemoryItem(userId, tier, updatedAt)`
- `MemorySummary(userId, scope, updatedAt)`
- `MemoryPreference(userId, key)`
- `MemoryBehaviorSignal(userId, type, createdAt)`
- `MemoryBehaviorSignal(productId, type, createdAt)`
- `MemoryAgentIndex(userId, sourceAgent, createdAt)`
- optional vector index for summary embeddings later.

## Memory Tiers

| Tier | Content | Purpose | Retention |
| --- | --- | --- | --- |
| Near | recent turns, latest agent results, pending references, recent product ids | resolve "vừa rồi", "cái đó", "lúc nãy" | short/session |
| Mid | session summaries, recent shopping intent, repeated constraints | keep context stable without reading all turns | active session/cart |
| Far | stable preferences, behavior affinities, negative preferences, long-term summaries | personalization and Lead planning | long term with decay |

Rules:

- Raw events/turns are audit. Summaries do not replace source refs.
- Every memory claim needs `sourceRefs` or it is low-confidence.
- Near can be read on most requests. Mid/far are loaded only when goal needs them or Lead asks for context.
- Summarization runs outside critical path when possible.

## Runtime Pipeline

```txt
Lead asks for context
  -> validate user/session/auth
  -> classify memory need
      -> no memory | near | near+mid | near+mid+far
  -> retrieve near turns/events
  -> retrieve domain agent index
      -> Cart/Search/Recommendation/RAG/Support summaries
  -> retrieve preferences/behavior signals
  -> score relevance
  -> assemble context under token budget
  -> ground facts with evidence
  -> return MemoryContextResult to Lead
```

Write pipeline:

```txt
Pipeline event/turn/agent result
  -> normalize event
  -> redact sensitive fields
  -> write MemoryTurn/MemoryEvent
  -> update near MemoryItem
  -> update behavior/preference candidates
  -> schedule summarization if threshold exceeded
  -> write trace
```

Summarization pipeline:

```txt
near events over threshold
  -> response-only LLM or deterministic summarizer
  -> produce facts + source refs + confidence
  -> write MemorySummary / MemoryItem mid
  -> update far preference/behavior only when repeated/stable
```

## Public Interfaces

Lead and domain agents use these public interfaces:

| Interface | Purpose |
| --- | --- |
| `memory.agent.get_context` | Retrieve near/mid/far context for Lead planning |
| `memory.agent.write_turn` | Write user/assistant turn |
| `memory.agent.write_event` | Write behavior/domain event |
| `memory.agent.write_agent_result` | Index domain agent result summary |
| `memory.agent.update_preference` | Write/adjust preference with confidence/source |
| `memory.agent.delete_user_memory` | Privacy delete/export support |

## Private Tool Inventory

Private tools total: 38.

| Group | Tools |
| --- | --- |
| Auth/privacy | `memory.guard.authorize`, `memory.guard.redact`, `memory.guard.classify_sensitive`, `memory.guard.apply_retention` |
| Write | `memory.write.turn`, `memory.write.event`, `memory.write.agent_index`, `memory.write.preference`, `memory.write.behavior_signal`, `memory.write.summary` |
| Retrieve | `memory.retrieve.near_turns`, `memory.retrieve.near_events`, `memory.retrieve.mid_summary`, `memory.retrieve.far_profile`, `memory.retrieve.preferences`, `memory.retrieve.behavior`, `memory.retrieve.agent_index`, `memory.retrieve.pending_refs` |
| Scoring | `memory.score.relevance`, `memory.score.recency`, `memory.score.confidence`, `memory.score.source_quality`, `memory.score.decay` |
| Summarize | `memory.summarize.near_to_mid`, `memory.summarize.mid_to_far`, `memory.summarize.agent_history`, `memory.summarize.preference_candidate`, `memory.summarize.behavior_pattern` |
| Context | `memory.context.assemble`, `memory.context.enforce_budget`, `memory.context.ground_facts`, `memory.context.build_handoff`, `memory.context.list_for_agent` |
| Privacy/admin | `memory.admin.export_user`, `memory.admin.delete_user`, `memory.admin.delete_tier`, `memory.admin.audit_delete` |
| Trace/eval | `memory.trace.emit`, `memory.eval.coverage`, `memory.eval.contradiction`, `memory.eval.staleness` |

## LLM Policy

No LLM/vLLM toolcall.

LLM may be used only for response-only structured summarization/extraction:

- extract preference candidates;
- summarize long near history into mid summary;
- summarize stable behavior into far memory;
- detect contradictions in summaries.

Backend validates schema, source refs and confidence before writing memory.

## Interaction With Agents

- Lead Agent: calls `memory.agent.get_context` before planning.
- Cart Agent: writes cart summary/index; keeps detailed private cart ledger itself.
- Search Agent: writes query/candidate summary/index; keeps private search history itself.
- Recommendation Agent: writes recommendation/feedback summary/index; keeps private recommendation history itself.
- RAG Agent: can index policy topics read, but official docs remain in RAG store.
- Security Agent: receives sensitive-memory flags and can request redaction/delete.
- Customer Support Agent: receives support context but cannot overwrite stable preferences without source evidence.

## Verification

- Memory resolves "lúc nãy", "cái đó", "gợi ý giống vừa rồi" with source evidence.
- Memory does not invent product ids or preferences.
- Delete user memory removes turns, events, preferences, summaries and indexes.
- Private Cart/Search/Recommendation histories remain owned by those agents, but Storage/Memory can index safe summaries.
- Long history compacts into mid/far without losing source refs.
- Sensitive data is redacted from summaries and logs.

## Close Criteria

- Storage/Memory Agent has DB schema, contracts, docs, logs and tests.
- Lead can retrieve context with evidence under budget.
- Domain agent summaries are indexed without stealing domain ownership.
- Real-request 100-case suite passes 100% or has logged waivers.

## Implementation Evidence

- Runtime service: `apps/api/src/services/agents/storage-memory-agent.service.ts`
- API export endpoint: `GET /api/v1/account/memory/export`
- Unit tests: `apps/api/tests/storage-memory-agent-service.test.mjs`
- Runtime smoke: `apps/api/tests/runtime-storage-memory-agent.mjs`
- Runtime 100-case harness: `apps/api/tests/runtime-storage-memory-agent-real-request-100.mjs`
- Latest verification:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 79/79.
  - `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent`: pass.
  - `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent:100`: pass, 100/100.
