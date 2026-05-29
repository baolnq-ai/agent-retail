# Plan: Production Framework And Tooling

- Created: 2026-05-21 13:58
- Updated: 2026-05-22 02:35
- Status: completed
- Related log: `logs/planning/agent-pipeline/execution-tracker.md`
- Related doc: `docs/agent-pipeline/platform/production-framework-decision.md`
- Related tests: `tests/agent-pipeline/platform/production-toolcall-cases.md`
- Related status: `plans/agent-pipeline/platform/production-framework-status.md`

## Goal

Define the production runtime foundation for the chatbot pipeline: orchestration framework, server-side tool policy, metadata handles, idempotency, trace events, dashboard compatibility and verification gates.

## Scope

- In:
  - choose orchestration approach;
  - define executor, runtime refs, metadata handle boundary;
  - define server-side tool policy;
  - define timeout, retry, idempotency and trace requirements;
  - keep dashboard trace renderable for old and new agents.
- Out:
  - no LangGraph/LangChain dependency install in phase 1;
  - no final model-provider choice;
  - no full runtime migration of every specialist agent in this plan.

## Skills

- plan-skill
- backend-skill
- documentation-skill
- testing-skill
- logging-skill
- security-skill

## Accepted Phase 1 Decision

Use a custom TypeScript `PipelineExecutor` inside the NestJS API.

Reasons:

- The current backend is already NestJS + TypeScript with local services for model, memory, catalog and cart logic.
- The user requirement is clear: domain LLMs should return structured JSON, not call tools freely.
- Cart/order/customer data side effects must be deterministic and idempotent.
- A custom executor keeps dependency weight low while contracts are still changing.
- The contract remains graph-compatible so LangGraph can be adopted later if durable checkpoints or long-running graph replay become a real need.

## Data Services

RAG and memory data services must be managed through shared Docker Compose, not host installs.

Required compose-managed services:

- PostgreSQL: relational metadata, cart, user memory and transactional app data.
- Qdrant: RAG/product vector collections.
- Redis: optional queue/cache if ingestion or background jobs need it.

Relevant env:

- `QDRANT_URL`
- `QDRANT_PORT`
- `QDRANT_GRPC_PORT`
- `QDRANT_RAG_COLLECTION`
- `RAG_MAX_CONTEXT_TOKENS`

## Runtime Contracts

Implemented baseline:

- `apps/api/src/models/pipeline-runtime.models.ts`
  - compact refs;
  - execution plan/step model;
  - context budget;
  - dashboard playback event model.
- `apps/api/src/models/task-metadata.models.ts`
  - task metadata envelopes;
  - metadata handles;
  - token estimate helper;
  - field-pick helper.
- `apps/api/src/models/pipeline-executor.models.ts`
  - executor request/result envelopes;
  - server tool definition;
  - validation for compact refs, known tools, dependencies, context budget and write idempotency;
  - playback event creation from real plan steps.

## Required Server Tools

Tools are server-side functions only. Frontend and LLMs do not execute them directly.

| Tool | Owner | Side effect | Requirement |
| --- | --- | --- | --- |
| `memory.get_context` | Storage/Memory | none | bounded recent/mid/far context |
| `memory.write_turn` | Storage/Memory | write | safe response metadata |
| `memory.update_preferences` | Storage/Memory | write | preference signal validation |
| `history.resolve_reference` | History | none | resolve vague follow-up references |
| `catalog.resolve_product` | Search | none | exact id/name candidate resolution |
| `catalog.search_hard` | Search | none | exact/lexical/filter search |
| `catalog.search_semantic` | Search | none | embedding fallback with fallback wording |
| `catalog.rerank` | Search/Recommendation | none | score candidates |
| `recommendation.score` | Recommendation | none | personalization/relevance scoring |
| `rag.search_policy` | RAG | none | document/path retrieval |
| `rag.review_path` | RAG | none | per-path LLM review before synthesis |
| `cart.get` | Cart | none | cart snapshot |
| `cart.add_item` | Cart | write | auth + idempotency key |
| `cart.update_item` | Cart | write | auth + idempotency key |
| `cart.remove_item` | Cart | write | auth + idempotency key |
| `security.review_input` | Security | none | prompt/security policy screening |
| `security.review_plan` | Security | none | route/tool/data-scope screening |
| `security.review_action` | Security | none | action authorization |
| `security.review_output` | Security | none | final answer safety |
| `support.handle_case` | Customer Support | none | complaint/return/warranty triage |
| `support.create_case` | Customer Support | write | auth + idempotency key |
| `trace.emit_event` | Pipeline | write | redacted trace node/edge event |

## Production Guardrails

- Every tool input/output must be schema-validated before runtime use.
- Every write tool must have `idempotencyKey`.
- Read tools may retry; write tools retry only through idempotent keys.
- LLMs never directly mutate cart, support cases, memory or orders.
- Final answers only claim actions that succeeded in tool results.
- Raw prompt, cookie, token, stack trace or sensitive payload must never enter the user response or dashboard trace.
- Agents exchange compact refs and metadata handles, not raw payloads.
- Heavy payloads stay in task metadata and are fetched only by agents that need them.
- Dashboard trace must be produced from real execution events, not guessed static paths.

## Dashboard Trace Requirement

Trace output must support:

- agent nodes: `lead-agent`, `cart-agent`, `search-agent`, `recommendation-agent`, `storage-memory-agent`, `history-agent`, `sales-agent`, `rag-agent`, `security-agent`, `customer-support-agent`;
- infrastructure nodes: `postgres-db`, `qdrant-db`, `llm-service`, `pipeline-executor`;
- service/tool/text/file nodes;
- icon-first rendering with short code fallback;
- redacted summaries only;
- legacy ids until the old runtime is removed.

Related plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`.

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Decide LangGraph vs custom executor | done | Custom TS executor accepted for phase 1 |
| 2 | Define runtime ref/context contract | done | `pipeline-runtime.models.ts`; API 36/36 |
| 3 | Define metadata handle boundary | done | `task-metadata.models.ts`; API 39/39 |
| 4 | Define executor boundary | done | `pipeline-executor.models.ts`; API 42/42 |
| 5 | Define tool registry runtime policy | done | `pipeline-tool.registry.ts`; API 45/45 |
| 6 | Implement timeout/retry/idempotency policy in runtime service | done | `pipeline-executor.service.ts`; API 49/49 |
| 7 | Implement trace event bridge for dashboard canvas playback | done | `pipeline-trace-bridge.service.ts`; API 51/51 |
| 8 | Update specialist agent plans/contracts after framework decision | done | Master plan + README updated with custom executor decision |

## Verification

- Test structured output invalid JSON/schema.
- Test unknown tool rejected.
- Test tool input invalid.
- Test cart/support write idempotency.
- Test read tool timeout/retry.
- Test write tool cannot use read retry policy.
- Test final answer cannot claim side effect when tool failed.
- Test trace has node/edge/status/duration/error.
- Test dashboard renders full new-agent trace and legacy trace without crash.

## Close Criteria

- Framework decision is accepted.
- Server tool policy is implemented and tested.
- Timeout/retry/idempotency policy is implemented and tested.
- Trace events support dashboard playback.
- API/web regression passes.

## Close Evidence

- API: `corepack pnpm --filter @retail-agent/api test` passed 51/51.
- Web: `corepack pnpm --filter @retail-agent/web test` passed 3/3.
- Tracker row 01 is checked in `plans/agent-pipeline/execution-tracker.md`.
