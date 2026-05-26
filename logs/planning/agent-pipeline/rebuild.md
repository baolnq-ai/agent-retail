# Log: Agent Pipeline Rebuild

- Created: 2026-05-21 13:46
- Updated: 2026-05-21 13:46
- Type: planning
- Related plans: `plans/agent-pipeline/`

## 2026-05-21 13:46

### Goal

Khởi tạo bộ plan để code lại chatbot pipeline theo kiến trúc Lead Agent điều phối các agent chuyên trách.

### Work done

- Tạo folder `plans/agent-pipeline/`.
- Tạo folder `docs/agent-pipeline/`.
- Tạo folder `test/agent-pipeline/`.
- Tạo log tổng `logs/planning/agent-pipeline/rebuild.md`.
- Tạo quy định làm việc cho plan/doc/log/test.
- Tạo plan tổng rebuild pipeline.
- Tạo plan riêng cho Lead Agent.
- Tạo doc định nghĩa vai trò từng agent.

### Decisions

- Dùng Lead Agent làm planner/evaluator trung tâm.
- Mỗi agent là hệ thống riêng theo contract, nhưng chưa tách backend riêng ở phase đầu.
- Chỉ tách backend riêng khi có nhu cầu scale, state, queue, runtime hoặc security boundary độc lập.

### Verification

- Chưa chạy test code vì task hiện tại là lập plan và tài liệu.
- Test case nền đã được đặt trong `test/agent-pipeline/`.

### Next

- Review plan với user.
- Sau khi được duyệt, bắt đầu phase schema/contract v2 và Lead Agent.

## 2026-05-21 13:58

### Goal

Bổ sung plan production để chốt có dùng LangGraph/LangChain không và server cần tool call gì.

### Work done

- Tạo `plans/agent-pipeline/platform/production-framework-and-tooling.md`.
- Tạo `docs/agent-pipeline/platform/production-framework-decision.md`.
- Tạo `test/agent-pipeline/platform/production-toolcall-cases.md`.
- Cập nhật master plan để phase đầu tiên chốt framework/tooling trước khi code.

### Decisions

- Không dùng LangChain ReAct auto-loop làm lõi cho cart/order production.
- Cần spike LangGraph JS vì pipeline cần state graph, streaming, trace, checkpoint/human-in-the-loop về sau.
- Side effect như cart write phải đi qua executor typed tool, có idempotency key và guardrail.

### Verification

- Chưa chạy test code vì đây là bước planning.
- Test case production đã được ghi trong `test/agent-pipeline/platform/production-toolcall-cases.md`.

## 2026-05-21 14:18

### Goal

Chuyển thứ tự thiết kế để làm Cart Agent trước Lead Agent, vì Lead Agent cần biết contract các agent domain trước khi điều phối.

### Work done

- Dời Lead Agent plan sang `plans/agent-pipeline/agents/lead-agent/plan.md` và đánh dấu deferred.
- Tạo `plans/agent-pipeline/agents/cart-agent/plan.md`.
- Tạo `docs/agent-pipeline/agents/cart-agent/design.md`.
- Tạo `logs/planning/agent-pipeline/agents/cart-agent.md`.
- Tạo `test/agent-pipeline/agents/cart-agent/cases.md`.
- Cập nhật master plan, plan index, docs index và test index.

### DB assessment

- DB hiện có `Cart`, `CartItem`, `Order`, `PaymentIntent`, `IdempotencyKey`.
- Thiếu `CartEvent`, `CartAgentMemory`, `PendingCartAction`.
- Cart CRUD hiện chưa có idempotency riêng và chưa có audit ledger đủ để agent hiểu lịch sử thêm/xóa/cập nhật.

### Decision

Cart Agent production sẽ đi theo hướng state graph deterministic, event-sourced cart ledger, near/mid/far memory và typed tools. Lead Agent viết cuối.

## 2026-05-21 16:00

### Goal

Sắp xếp lại cây thư mục docs, logs và test cho agent-pipeline để tránh rối khi số lượng agent/plan tăng.

### Work done

- Di chuyển docs nền sang `docs/agent-pipeline/architecture/` và `docs/agent-pipeline/platform/`.
- Di chuyển Cart Agent doc sang `docs/agent-pipeline/agents/cart-agent/design.md`.
- Di chuyển test theo agent/platform:
  - `test/agent-pipeline/agents/cart-agent/`
  - `test/agent-pipeline/agents/lead-agent/`
  - `test/agent-pipeline/platform/`
- Di chuyển logs vào `logs/planning/agent-pipeline/` và `logs/planning/agent-pipeline/agents/`.
- Cập nhật link trong plans, docs index, test index và logs.
- Thêm README cho `docs/agent-pipeline/` và `logs/planning/agent-pipeline/`.

### Decision

Từ nay mọi tài liệu agent-pipeline dùng cấu trúc domain-first:

```txt
docs/agent-pipeline/{architecture,platform,agents/<agent>}
test/agent-pipeline/{platform,agents/<agent>}
logs/planning/agent-pipeline/{rebuild.md,agents/<agent>.md}
```

## 2026-05-21 16:12

### Goal

Sắp xếp lại cây thư mục `plans` cho đồng bộ với docs, test và logs.

### Work done

- Đổi folder cũ `plans/agent pipeline/` sang `plans/agent-pipeline/` để tránh dấu cách.
- Chia plan theo cấu trúc:
  - `plans/agent-pipeline/architecture/`
  - `plans/agent-pipeline/platform/`
  - `plans/agent-pipeline/agents/cart-agent/`
  - `plans/agent-pipeline/agents/lead-agent/`
- Di chuyển các plan:
  - working rules -> `architecture/working-rules.md`
  - master plan -> `architecture/master-pipeline-rebuild.md`
  - framework/tooling -> `platform/production-framework-and-tooling.md`
  - cart agent -> `agents/cart-agent/plan.md`
  - lead agent -> `agents/lead-agent/plan.md`
- Cập nhật reference trong docs, logs, tests và plan index.

### Decision

Từ nay plan agent-pipeline dùng cùng cấu trúc domain-first với docs/test/logs:

```txt
plans/agent-pipeline/{architecture,platform,agents/<agent>}
```

## 2026-05-21 20:10

### Goal

Add dashboard trace requirements so new pipeline agents do not break the existing Agent Dashboard.

### Work done

- Added `plans/agent-pipeline/platform/dashboard-trace-visualization.md`.
- Added `docs/agent-pipeline/platform/dashboard-trace-visualization.md`.
- Added `test/agent-pipeline/platform/dashboard-trace-cases.md`.
- Added `logs/planning/agent-pipeline/dashboard-trace.md`.
- Updated master/platform/Lead plans and indexes.

### Decisions

- Dashboard trace must be icon-first and text-light.
- New agents must render with recognizable icons and short code fallback.
- DB/service/tool/LLM/text/file nodes must have their own visual kind.
- Legacy dashboard trace ids must keep rendering until old runtime is removed.

### Verification

- Planning only; no frontend code changed in this step.

## 2026-05-21 21:05

### Goal

Start implementation without stopping after each phase: lock pipeline v2 contracts, trace visibility, and orchestration routing foundation.

### Work done

- Added backend pipeline v2 contract model:
  - `apps/api/src/models/agent-pipeline-v2.models.ts`
- Added production agent registry:
  - `apps/api/src/services/agents/agent-pipeline-v2.registry.ts`
- Wired orchestrator to emit `pipelineAgents` for the new agent set while keeping legacy runtime agents compatible.
- Improved intent detection for Vietnamese without accents so routing does not depend on old mojibake text patterns.
- Updated backend trace model and trace graph support for:
  - Lead, Storage/Memory, History, Search, Recommendation, Cart, RAG, Security, Customer Support, Sales.
  - Postgres, Qdrant/vector DB, LLM service, pipeline executor.
  - Edge directions `guard` and `write`.
- Updated dashboard graph compatibility and CSS visual states for new agent/node/edge kinds.
- Added regression tests:
  - `apps/api/tests/agent-pipeline-v2-registry.test.mjs`
  - `apps/api/tests/agent-orchestrator-v2.test.mjs`
  - `apps/api/tests/agent-trace-contract.test.mjs`
  - `apps/web/tests/agent-dashboard-graph.test.mjs`

### Verification

- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/api test`: pass, 27/27.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass after build regenerated Next type artifacts.

### Next

- Continue replacing legacy agent services one by one behind the v2 registry contract.
- First production runtime target: Cart Agent SQL RAG read/write response contract and real request-output evaluation cases.

## 2026-05-22 00:45

### Goal

Add frontend Agent Dashboard runtime animation requirement to the master pipeline rebuild plan.

### Work done

- Updated master plan phase 9 to require canvas playback based on real `ExecutionPlan`/trace order.
- Added verification rules: animate from user message through Lead, used agents, DB/tool/service nodes, then response.
- Clarified that non-used agents must not animate for a request.
- Linked detailed behavior to `platform/dashboard-trace-visualization.md`.

### Decision

Agent Dashboard must describe the actual route of a question, not just show a static architecture map. Animation must be lightweight and smooth because it is a canvas playback layer, not a heavy layout animation.

### Verification

- Planning/docs only in this step.
