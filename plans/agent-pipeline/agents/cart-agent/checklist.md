# Checklist: Cart SQL RAG Agent

- Created: 2026-05-21 16:32
- Updated: 2026-05-22 13:40
- Related status: `plans/agent-pipeline/agents/cart-agent/status.md`

## Design

- [x] Define Cart Agent as Cart SQL RAG Agent.
- [x] Define goal protocol instead of rigid tasks.
- [x] Define private SQL/RAG/write tools.
- [x] Define private interaction history.
- [x] Define real-request 100-case requirement.
- [x] Analyze current Prisma DB schema for Cart Agent gaps.
- [x] Add migration detail for required cart tables.
- [x] Define complete tool inventory: 1 public interface + 36 private tools.
- [x] Decide LLM response-only mode, no vLLM toolcall dependency for Cart Agent.
- [x] Finalize DB schema draft for ledger/memory/interaction/pending tables.
- [x] Finalize first TypeScript runtime contracts.
- [ ] Finalize migration order and generated migration artifact.
- [x] Add schema refs and version-guard policy to private tool registry.

## Implementation

- [x] Add Prisma models: `CartEvent`, `CartAgentMemory`, `CartAgentInteraction`, `PendingCartAction`.
- [ ] Add repository/allowlisted SQL tools.
- [x] Add first SQL/tool allowlist guard.
- [x] Add first Cart SQL RAG planner wrapper.
- [x] Add result grounding/evaluator for current cart manager output.
- [x] Add private write executor validation with idempotency/version guard.
- [x] Add CartEvent/idempotency persistence boundary.
- [x] Add DB transaction write executor with idempotency persistence.
- [x] Add verifier/runtime integration for resolved single-product fast path.
- [x] Add interaction history writer via `AgentHistoryService`.
- [x] Add DB-backed `CartAgentInteraction` writer.
- [x] Add DB-backed near `CartAgentMemory` writer.
- [x] Add deterministic mid/far `CartAgentMemory` summarizer.
- [x] Feed persisted near/mid/far memory back into `CartAgentResult.memory`.
- [x] Add `PendingCartAction` lifecycle service.
- [x] Add DB-backed clear pending create/confirm path.
- [x] Add first trace/pipeline events for `cart-agent`.

## Tests

- [x] Contract tests for request/result/tool-style output.
- [x] Service-level transaction tests for cart event ledger.
- [x] Targeted real DB runtime test for cart event ledger.
- [x] Real DB runtime test for every direct item write tool.
- [x] Deterministic mutation tests for every direct item write tool.
- [ ] Real DB idempotency tests for every write tool.
- [x] Real DB idempotency replay test for add-item.
- [x] Unit tests for CartEvent/idempotency replay boundary.
- [x] Stale-version regression test.
- [x] Runtime fast-path test for resolved cart write.
- [x] First real DB concurrency/isolation test for overlapping version-guarded write.
- [ ] Broader concurrency suite for every write tool.
- [x] First interaction history test.
- [x] DB-backed interaction/memory service tests.
- [x] Runtime state persistence test for interaction, memory and pending lifecycle.
- [x] Unit test DB pending clear create/confirm execution path.
- [x] Runtime test DB pending clear create/confirm execution path.
- [x] Unit/runtime tests for mid/far Cart Agent memory summarization.
- [x] Unit/runtime regression after memory retrieval path.
- [x] SQL/tool allowlist guardrail tests.
- [x] Private tool registry schema-ref and version-guard tests.
- [x] Direct Cart Agent real-request 100-case suite implemented.
- [x] Direct Cart Agent real-request 100-case suite pass 100%.
- [ ] Cross-agent 100-case matrix expansion after Search/RAG/Support/Sales agents are implemented.

## Close Criteria

- [ ] `status.md` all phases done.
- [ ] `logs/log-plan-agent-pipeline/cart-agent.md` has final pass report.
- [ ] `logs/planning/agent-pipeline/agents/cart-agent.md` mirrored or summarized.
- [ ] No unverified claims in final user-facing response flow.
