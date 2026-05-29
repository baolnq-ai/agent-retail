# Log: Storage/Memory Agent Plan Job

- Created: 2026-05-21 18:18
- Updated: 2026-05-22 14:20
- Type: planning
- Related job: `plans/agent-pipeline/agents/storage-memory-agent/`

## 2026-05-21 18:18

### Goal

Create the Storage/Memory Agent plan after Cart, Search and Recommendation agents.

### Work done

- Reviewed current `MemoryAgentService`, `ChatMemoryService`, `AgentHistoryService` and Prisma schema.
- Identified current memory gaps: generic preferences, string rolling summary, limited recent turns, no source refs, no near/mid/far memory, no privacy tier controls and no cross-agent index.
- Created job files:
  - `plans/agent-pipeline/agents/storage-memory-agent/README.md`
  - `plans/agent-pipeline/agents/storage-memory-agent/plan.md`
  - `plans/agent-pipeline/agents/storage-memory-agent/status.md`
  - `plans/agent-pipeline/agents/storage-memory-agent/checklist.md`
- Created design doc and tests:
  - `docs/agent-pipeline/agents/storage-memory-agent/design.md`
  - `tests/agent-pipeline/agents/storage-memory-agent/cases.md`
  - `tests/agent-pipeline/agents/storage-memory-agent/real-request-100-cases.md`

### Decision

Storage/Memory Agent is the central memory service for Lead. Domain agents keep private detailed histories, while Storage/Memory indexes safe summaries, preferences and behavior signals with evidence.

### Next

Finalize DB schema and MemoryRequest/MemoryResult contracts.

## 2026-05-22 13:55

### Goal

Start Storage/Memory Agent implementation after Cart Agent direct runtime passed.

### Work done

- Added Prisma memory runtime tables: `MemoryTurn`, `MemoryEvent`, `MemoryItem`, `MemorySummary`, `MemoryPreference`, `MemoryBehaviorSignal`, `MemoryAgentIndex`.
- Added `StorageMemoryAgentService`.
- Added response-only, backend-validated memory APIs: `getContext`, `writeTurn`, `writeEvent`, `writeAgentResult`, `updatePreference`, `writeBehaviorSignal`, `summarizeNearToMid`, `deleteUserMemory`.
- Added redaction for email, phone, token-like fields and sensitive metadata keys.
- Added context budget enforcement, source refs, compact brief and product reference extraction.
- Extended account memory delete to include new memory-owned tables.
- Added unit and runtime DB tests.

### Verification

- `corepack pnpm --filter @retail-agent/api db:generate`: pass after setting `DATABASE_URL`.
- `corepack pnpm --filter @retail-agent/api build`: pass.
- `corepack pnpm --filter @retail-agent/api test`: pass, 77/77.
- `corepack pnpm --filter @retail-agent/api db:push`: pass.
- `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent`: pass.

### Runtime issue found and fixed

- First runtime run failed because `MemoryBehaviorSignal.productId` correctly enforces a Product FK and the runtime script used an unseeded product id.
- Fixed the runtime test by seeding an isolated product. Kept the FK strict for production correctness.

### Remaining

- Privacy export.
- Far compaction/decay.
- Prompt-injection and cross-user privacy tests.
- 100-case real-request harness.
- Lead integration.

## 2026-05-22 14:20

### Goal

Close Storage/Memory Agent runtime gate.

### Work done

- Added privacy export through `StorageMemoryAgentService.exportUserMemory`.
- Added `GET /api/v1/account/memory/export`.
- Added retention cleanup for expired memory items.
- Added deterministic `summarizeMidToFar`.
- Added query-aware budget ordering:
  - personal/preference/behavior requests prioritize far profile and preferences;
  - normal history requests prioritize near and mid summaries.
- Added 100-case real-request harness and pass report.

### Verification

- First 100-case run passed 93/100 and revealed far profile was starved by budget.
- Second run passed 98/100 and revealed mid summaries were starved after the far-priority fix.
- Final ordering fix passed:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 79/79.
  - `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent`: pass.
  - `corepack pnpm --filter @retail-agent/api test:runtime:storage-memory-agent:100`: pass, 100/100.

### Decision

Storage/Memory Agent close gate is passed. Lead integration is left for the Lead Agent runtime plan.
