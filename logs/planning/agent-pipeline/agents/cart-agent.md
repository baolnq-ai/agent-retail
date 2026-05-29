# Log: Cart Agent Plan

- Created: 2026-05-21 14:18
- Updated: 2026-05-22 13:40
- Type: planning
- Related plan: `plans/agent-pipeline/agents/cart-agent/plan.md`

## 2026-05-21 14:18

### Goal

Lập plan Cart Agent trước Lead Agent, đánh giá DB hiện tại và xác định pipeline production mạnh nhất cho domain giỏ hàng.

### Work done

- Đọc `apps/api/prisma/schema.prisma`.
- Đọc `CommerceService`, `CartManagerAgentService`, `commerce.models.ts`, `agent-execution.models.ts`.
- Đánh giá DB hiện tại thiếu cart event ledger, cart memory riêng, idempotency cho cart CRUD, pending action table riêng.
- Tạo `plans/agent-pipeline/agents/cart-agent/plan.md`.
- Tạo `docs/agent-pipeline/agents/cart-agent/design.md`.
- Tạo `tests/agent-pipeline/agents/cart-agent/cases.md`.
- Dời Lead Agent sang `plans/agent-pipeline/agents/lead-agent/plan.md` và đánh dấu deferred để viết cuối.

### Decision

Cart Agent production nên dùng state graph deterministic + event-sourced cart ledger + typed tools. Nếu LangGraph JS spike pass thì dùng LangGraph cho graph/checkpoint/streaming/trace; nếu không thì custom state machine với cùng contract.

### Verification

- Chưa chạy test code vì task hiện tại là plan.
- Test case thiết kế đã được ghi trong `tests/agent-pipeline/agents/cart-agent/cases.md`.

## 2026-05-21 14:32

### Goal

Rà lại pipeline Cart Agent để đảm bảo vừa chính xác vừa không làm trì trệ hệ thống.

### Work done

- Bổ sung fast path cho CRUD rõ target.
- Bổ sung smart path cho câu mơ hồ cần near history.
- Bổ sung slow/background path cho summary near/mid/far.
- Bổ sung latency target và accuracy rules.
- Bổ sung mô tả đơn giản Cart Agent nhận gì, làm gì, trả gì.
- Bổ sung test case hiệu năng và concurrency.

### Decision

Cart Agent không được gọi LLM trong CRUD rõ target. LLM chỉ hỗ trợ hiểu câu mơ hồ hoặc tóm tắt memory. Summary mid/far phải chạy nền hoặc ngoài critical path.

## 2026-05-21 14:48

### Goal

Cập nhật Cart Agent từ tư duy CRUD tool sang domain agent có agent-to-agent response giàu ngữ cảnh.

### Work done

- Bổ sung Cart Agent task protocol.
- Bổ sung multi-task request/response.
- Bổ sung facts/issues/agentMessage/leadInstruction trong `CartAgentResult`.
- Bổ sung ví dụ Lead gọi Cart Agent để kiểm tra sản phẩm trong giỏ và tính tổng tiền.
- Bổ sung case hết hàng, không tìm thấy sản phẩm, target chưa resolve.
- Bổ sung test case CA-021 đến CA-025.

### Decision

Cart Agent phải trao đổi với Lead/Executor bằng structured facts + natural agent handoff. CRUD chỉ là một nhóm năng lực, không phải toàn bộ agent.

## 2026-05-21 15:02

### Goal

Điều chỉnh Cart Agent để nhận goal từ Lead Agent thay vì task cứng, và tự lập private sub-plan gọi tool riêng.

### Work done

- Đổi agent-to-agent task protocol thành goal protocol.
- Bổ sung internal planner/private sub-plan.
- Bổ sung private SQL/cart/logic tools chỉ Cart Agent được gọi.
- Bổ sung internal result evaluation: SQL lỗi, empty rows, out of stock, conflict, verify fail.
- Bổ sung partial response khi một tool fail nhưng tool khác có facts hợp lệ.
- Bổ sung test case CA-026 đến CA-028.

### Decision

Lead Agent chỉ giao mục tiêu và ngữ cảnh. Cart Agent tự quyết định tool nội bộ, tự check lỗi, tự hợp nhất facts/issues rồi trả response cho Lead.

## 2026-05-21 15:16

### Goal

Chốt Cart Agent là SQL RAG Agent.

### Work done

- Cập nhật plan gọi Cart Agent là `Cart SQL RAG Agent`.
- Bổ sung SQL RAG pipeline: schema retriever, query guard, cart retriever, result grounder, response composer.
- Bổ sung private RAG tools: `cart.rag.get_schema_context`, `cart.rag.retrieve_cart_context`, `cart.rag.ground_rows_to_facts`.
- Bổ sung SQL safety rules: không raw SQL tự do từ LLM, chỉ allowlisted query/tool, parameterized input, scope theo user/cart.
- Bổ sung test case CA-029 đến CA-031.

### Decision

Cart Agent dùng SQL RAG trên cart schema/state/events/memory. LLM được dùng để hiểu goal và lập private plan, nhưng truy vấn DB phải đi qua allowed SQL/Prisma tools có guardrail production.

## 2026-05-21 15:26

### Goal

Bổ sung lịch sử riêng cho Cart Agent để hiểu các nhắc lại về tương tác trước.

### Work done

- Bổ sung `CartAgentInteraction`.
- Phân biệt `CartEvent` và `CartAgentInteraction`.
- Bổ sung private tools retrieve interaction history.
- Cập nhật runtime logic để lưu/retrieve interaction history.
- Bổ sung test case CA-032 đến CA-034.

### Decision

Cart Agent phải có lịch sử riêng của agent-to-agent interaction, không chỉ dựa vào cart state hoặc cart event. Khi user/Lead nhắc “lúc nãy”, Cart Agent dùng interaction history kết hợp SQL cart state hiện tại để trả lời đúng.

## 2026-05-21 15:38

### Goal

Bổ sung yêu cầu realistic test suite 100 case và pass 100% cho Cart SQL RAG Agent.

### Work done

- Tạo `tests/agent-pipeline/agents/cart-agent/real-request-100-cases.md`.
- Chia 100 case theo 10 nhóm: auth/read, inspect/totals, add, update/remove, SQL RAG, interaction history, ambiguity, error, concurrency/performance, cross-agent regression.
- Cập nhật plan Cart Agent yêu cầu phase realistic test suite pass 100%.
- Cập nhật test index.

### Decision

Cart Agent không được đóng plan nếu realistic suite chưa pass 100%, trừ case bất khả thi có waiver và log rõ. Mục tiêu là tinh chỉnh tới khi toàn bộ 100 case đạt.

## 2026-05-21 15:46

### Goal

Siết lại test suite 100 case thành real-request evaluation, không phải checklist hoặc mock chơi.

### Work done

- Đổi test suite thành `Cart SQL RAG Agent Real Request 100`.
- Bổ sung harness bắt buộc: seed DB, gửi request thật qua API/agent runtime, capture response, inspect DB side effect, inspect trace/tool events, evaluator pass/fail.
- Bổ sung yêu cầu mỗi case assert output, facts/issues, DB rows, trace và forbidden claims.
- Cập nhật plan Cart Agent phase 13 thành real-request evaluation suite.

### Decision

Cart Agent chỉ được coi là pass khi 100 request thật được đánh giá bằng output thật + DB side effect thật + trace thật. Không tính các case chỉ đọc plan/checklist là test pass.

## 2026-05-21 16:32

### Goal

Tạo job folder/status/checklist để theo dõi Cart Agent dễ hơn trong cùng một nơi.

### Work done

- Tạo `plans/agent-pipeline/agents/cart-agent/README.md`.
- Tạo `plans/agent-pipeline/agents/cart-agent/status.md`.
- Tạo `plans/agent-pipeline/agents/cart-agent/checklist.md`.
- Tạo log theo yêu cầu tại `logs/log-plan-agent-pipeline/cart-agent.md`.
- Cập nhật `plans/agent-pipeline/agents/cart-agent/plan.md` để trỏ tới status/checklist/log mới.

### Decision

Cart Agent job vẫn ở trạng thái `planned`. Plan đã đầy đủ về hướng kiến trúc, nhưng chưa xong vì chưa có DB migration, contracts, implementation, real-request harness và pass report.
## 2026-05-21 16:58

### Goal

Bổ sung đầy đủ phân tích DB, số lượng tool cần làm và quyết định không dùng toolcall LLM/vLLM cho Cart Agent.

### Work done

- Rà lại schema hiện tại: `Cart`, `CartItem`, `Product`, `Order`, `IdempotencyKey`, chat memory, preference và interaction events.
- Ghi rõ gap: thiếu `CartEvent`, `CartAgentMemory`, `CartAgentInteraction`, `PendingCartAction`, idempotency/version rule cho cart write và active-cart uniqueness mạnh.
- Ghi migration detail vào `plans/agent-pipeline/agents/cart-agent/plan.md`.
- Chốt tool inventory: 1 public interface `cart.agent.run_goal` + 36 private tools.
- Chốt LLM response-only mode: LLM chỉ trả structured plan/analysis, backend executor mới được gọi tool.
- Cập nhật `docs/agent-pipeline/agents/cart-agent/design.md`, `status.md`, `checklist.md` và log job chính.

### Decision

Không bật vLLM toolcall cho Cart Agent. Backend giữ quyền gọi SQL/write tool để đảm bảo production safety, idempotency, transaction, verifier và testability.
## 2026-05-21 21:35

### Goal

Start Cart Agent implementation with a real runtime contract before larger DB migration work.

### Work done

- Added `apps/api/src/models/cart-agent.models.ts`.
- Added `apps/api/src/services/agents/cart-sql-rag-agent.service.ts`.
- Registered `CartSqlRagAgentService` in Nest `AppModule`.
- Wired `AgentService` to call `CartSqlRagAgentService.runGoal()` instead of calling the old cart manager directly.
- `runGoal()` now returns private plan steps, grounded facts, issues, operation list, memory summary, and Lead Agent handoff.
- Cart Agent writes first private interaction history through `AgentHistoryService`.
- Added `apps/api/tests/cart-sql-rag-agent.test.mjs`.
- Updated `status.md` and `checklist.md`.

### Verification

- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/api test`: pass, 30/30.

### Remaining

- Add DB-backed `CartEvent`, `CartAgentMemory`, `CartAgentInteraction`, and `PendingCartAction`.
- Replace compatibility wrapper with allowlisted SQL/private tool executor.
- Implement real-request 100-case harness and pass report.

## 2026-05-22 10:24

### Goal

Continue ordered plan 03 after dashboard plan close: harden Cart Agent DB/tool policy before implementing write executor.

### Work Done

- Confirmed Prisma schema already contains the required Cart Agent tables:
  - `CartEvent`
  - `CartAgentMemory`
  - `CartAgentInteraction`
  - `PendingCartAction`
- Extended `CartAgentToolDefinition` with:
  - `inputSchemaRef`
  - `outputSchemaRef`
  - `requiresCartVersion`
- Added policy that direct cart mutation tools require both idempotency and cart version guard.
- Added test coverage for schema refs, raw SQL exclusion and cart version guard policy.
- Updated Cart Agent status/checklist.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 53/53.

### Remaining

- Generate/verify migration artifact if the current schema change is not already migrated.
- Implement allowlisted SQL/private tool executor.
- Add DB-backed ledger writes and idempotent cart write tests.

## 2026-05-22 10:31

### Goal

Add the first private tool executor boundary before implementing DB transactions.

### Work Done

- Added `apps/api/src/services/agents/cart-agent-private-tool.executor.ts`.
- Registered `CartAgentPrivateToolExecutorService` in `AppModule`.
- Executor now prepares/validates private Cart Agent tool execution:
  - rejects unknown tools such as `cart.sql.raw`;
  - requires auth scope for protected tools;
  - requires idempotency key for write tools;
  - requires `expectedCartVersion` for direct cart mutations;
  - requires product/quantity fields for product write tools;
  - builds redacted `CartEvent` ledger drafts for future DB transaction writes.
- Added `apps/api/tests/cart-agent-private-tool-executor.test.mjs`.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 56/56.

### Remaining

- Implement DB transaction writer that persists `CartEvent`, idempotency response and cart mutation atomically.
- Add DB integration tests for ledger/idempotency/concurrency.

## 2026-05-22 10:34

### Goal

Add the persistence boundary for Cart Agent ledger/idempotency before connecting real cart mutations.

### Work Done

- Added `apps/api/src/services/agents/cart-agent-ledger.service.ts`.
- Registered `CartAgentLedgerService` in `AppModule`.
- Ledger persistence now:
  - checks idempotency scope per private tool;
  - replays cached response without duplicate `CartEvent`;
  - writes `CartEvent` draft data;
  - stores idempotency response for future retry.
- Added `apps/api/tests/cart-agent-ledger-service.test.mjs`.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 59/59.

### Remaining

- Wrap cart item mutation + ledger + idempotency in one DB transaction.
- Add real DB integration tests for add/remove/update/clear and concurrent retry behavior.

## 2026-05-22 10:45

### Goal

Implement the guarded cart item mutation transaction boundary for Cart Agent.

### Work Done

- Added `apps/api/src/services/agents/cart-agent-mutation-writer.service.ts`.
- Registered `CartAgentMutationWriterService` in `AppModule`.
- Mutation writer now supports:
  - `cart.write.add_item`;
  - `cart.write.set_quantity`;
  - `cart.write.increment_item`;
  - `cart.write.decrement_item`;
  - `cart.write.remove_item`;
  - `cart.write.clear`.
- Enforced private tool validation, user/cart scope, expected cart version, inventory guard and idempotency replay before mutation.
- Recalculates subtotal/grand total, increments cart version and persists `CartEvent` + idempotency response with version/quantity/totals evidence.
- Added `apps/api/tests/cart-agent-mutation-writer-service.test.mjs`.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 63/63.

### Remaining

- Add reload verifier contract and connect mutation writer into the active `CartSqlRagAgentService` path.
- Add real DB integration/concurrency tests once the runtime path is connected.

## 2026-05-22 11:00

### Goal

Connect the Cart Agent mutation writer into the active Cart SQL RAG runtime path.

### Work Done

- Updated `CartAgentMutationWriterService` to return verified cart snapshot and verification evidence.
- Updated `CartSqlRagAgentService` to use the mutation writer fast path for resolved single-product cart writes.
- Kept ambiguous, multi-product, clear and pending-confirmation flows on the existing manager path.
- Added regression test proving the resolved add-to-cart path calls the mutation writer, skips the old manager, returns updated cart facts and emits verify evidence.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 64/64.

### Remaining

- Add real DB integration/concurrency tests for every cart write tool.
- Expand runtime fast path coverage for set/increment/decrement/remove.

## 2026-05-22 11:10

### Goal

Broaden mutation writer tests across all direct cart item write tools before running DB isolation tests.

### Work Done

- Added deterministic transaction-harness coverage for set quantity, increment, decrement and remove.
- Added out-of-stock rejection coverage that asserts no item mutation, event write or idempotency write happens.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 66/66.

### Remaining

- Real DB transaction/isolation test harness.
- Runtime fast path coverage for set/increment/decrement/remove through `CartSqlRagAgentService`.

## 2026-05-22 11:25

### Goal

Run a targeted real Postgres runtime verification for the Cart Agent mutation writer.

### Work Done

- Added `apps/api/tests/runtime-cart-agent-mutation-writer.mjs`.
- Started local Postgres from repo compose: `docker compose -f infra/docker/docker-compose.yml up -d postgres`.
- Ran `db:push`.
- First runtime attempt exposed stale generated Prisma client missing `cartEvent`; ran `db:generate` and reran.
- Runtime script verifies:
  - add item writes cart item, totals, version and `CartEvent`;
  - retry with same idempotency key replays without duplicate event;
  - stale expected cart version returns conflict and writes no event;
  - test data is cleaned up.

### Verification

- `corepack pnpm --filter @retail-agent/api db:generate`: pass.
- `corepack pnpm --filter @retail-agent/api build`: pass.
- `node apps/api/tests/runtime-cart-agent-mutation-writer.mjs`: pass.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass after Postgres health settled.
- `corepack pnpm --filter @retail-agent/api test`: pass, 66/66.

### Remaining

- Real DB coverage for set/increment/decrement/remove/clear.
- Real concurrency/isolation tests with overlapping writes.

## 2026-05-22 11:40

### Goal

Expand the real Postgres runtime check to all direct Cart Agent write tools.

### Work Done

- Extended `apps/api/tests/runtime-cart-agent-mutation-writer.mjs`.
- Runtime script now verifies add replay, set quantity, increment, decrement, remove, clear and stale conflict.

### Verification

- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.

### Remaining

- Real concurrency/isolation tests with overlapping writes.
- Runtime fast path coverage for set/increment/decrement/remove through `CartSqlRagAgentService`.

## 2026-05-22 11:50

### Goal

Close the first real DB concurrency gate for Cart Agent direct writes.

### Work Done

- Moved cart version claim before item mutation in `CartAgentMutationWriterService`.
- Extended runtime script with overlapping add requests using the same expected cart version.
- Runtime now asserts one completed write, one conflict, one event and no quantity over-add.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 66/66.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.

### Remaining

- Broader concurrency matrix for set/increment/decrement/remove/clear.
- DB-backed pending action + Cart Agent memory persistence.

## 2026-05-22 12:10

### Goal

Add DB-backed Cart Agent state persistence for interaction history, near memory and pending action lifecycle.

### Work Done

- Added `apps/api/src/services/agents/cart-agent-state.service.ts`.
- Registered `CartAgentStateService` in `AppModule`.
- `CartSqlRagAgentService` now writes:
  - shared `AgentHistoryService` history;
  - DB-backed `CartAgentInteraction`;
  - DB-backed near `CartAgentMemory`.
- Added unit tests for interaction persistence, near memory upsert and pending action create/get/resolve.
- Added `apps/api/tests/runtime-cart-agent-state.mjs` and included it in `test:runtime:cart-agent`.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 68/68.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.

### Remaining

- Migrate actual pending confirmation execution from legacy chat memory to `PendingCartAction`.
- Add mid/far memory summarization and retrieval.

## 2026-05-22 12:25

### Goal

Move clear-cart pending confirmation into DB-backed `PendingCartAction` flow.

### Work Done

- `CartSqlRagAgentService` creates a DB pending action when user asks to clear a non-empty cart.
- `confirm_pending` loads active DB pending action and executes `cart.write.clear` via mutation writer.
- `cancel_pending` resolves active DB pending action as cancelled.
- Added unit coverage for clear -> pending and confirm -> clear mutation.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 70/70.

### Remaining

- Runtime API/DB verification for clear -> pending -> confirm/cancel.
- Multi-item pending flow after Search/Recommendation integration is stronger.

## 2026-05-22 12:45

### Goal

Verify DB-backed pending clear flow on real Postgres runtime services.

### Work Done

- Added `apps/api/tests/runtime-cart-agent-pending-flow.mjs`.
- `test:runtime:cart-agent` now runs:
  - mutation writer runtime;
  - state persistence runtime;
  - pending clear runtime.
- Runtime pending script seeds a real cart with item, creates DB pending action via Cart SQL RAG, confirms it, clears cart through mutation writer, and checks DB rows.

### Verification

- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.
- `corepack pnpm --filter @retail-agent/api test`: pass, 70/70.

### Remaining

- Mid/far memory summarization and retrieval.
- 100-case real-request evaluation harness.

## 2026-05-22 13:05

### Goal

Implement deterministic mid/far Cart Agent memory summarization.

### Work Done

- Extended `CartAgentStateService` with `summarizeMemory()`.
- Summarizer reads recent `CartAgentInteraction` and `CartEvent` rows.
- Writes:
  - `mid` cart summary memory keyed by cart;
  - `far` user behavior memory keyed by user.
- Runtime state script now checks mid/far rows on Postgres.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 71/71.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.

### Remaining

- 100-case real-request evaluation harness and pass report.
- Retrieval path that feeds mid/far memory back into Cart Agent planning.

## 2026-05-22 13:20

### Goal

Add direct Cart Agent 100-case real-request evaluation harness.

### Work Done

- Added `apps/api/tests/runtime-cart-agent-real-request-100.mjs`.
- Added package script `test:runtime:cart-agent:100`.
- Harness runs 100 real Cart SQL RAG requests on Postgres for auth, empty read, add, set, increment, decrement, remove, clear pending and state memory.
- Harness writes report to `logs/planning/agent-pipeline/cart-agent-real-request-100-report.json`.
- Updated `tests/agent-pipeline/agents/cart-agent/real-request-100-cases.md` with latest pass and scope note.

### Verification

- First run failed 80/100 because harness passed quantity as a number instead of `UserAnalysis.quantity` object; fixed evaluator input.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent:100`: pass, 100/100.
- `corepack pnpm --filter @retail-agent/api test`: pass, 71/71.

### Remaining

- Cross-agent cases from the original matrix still depend on Search/RAG/Support/Sales implementation.
- Decide whether Cart Agent row 03 can close now or should wait for mid/far retrieval into planning.

## 2026-05-22 13:40

### Goal

Close-review Cart Agent direct runtime and move remaining cross-agent coverage to later specialist rows.

### Work Done

- Added retrieval path from persisted `CartAgentMemory` back into `CartAgentResult.memory`.
- Reran direct runtime and 100-case evaluation.
- Kept the ordered Cart Agent row `partial` because original matrix cases involving Search/RAG/Support/Sales require those agents to be implemented first.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 72/72.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent`: pass.
- `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent:100`: pass, 100/100.

### Remaining

- Cross-agent Search/RAG/Support/Sales integration cases.
- Full final chat/runtime suite after Lead Agent orchestration is rebuilt.
