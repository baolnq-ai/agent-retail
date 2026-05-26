# Log: Dashboard Trace Visualization

- Created: 2026-05-21 20:10
- Updated: 2026-05-22 10:24
- Type: planning
- Related plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`

## 2026-05-21 20:10

### Goal

Add dashboard/trace visualization requirements to the agent-pipeline rebuild so new agents do not break the dashboard.

### Work Done

- Added dashboard trace visualization plan.
- Added platform doc.
- Added dashboard trace test cases.
- Defined required icon registry for agents, DB, service, tool, LLM, text and file nodes.
- Defined compatibility rule for legacy trace ids.

### Decisions

- Dashboard should be icon-first, text-light.
- Use common lucide icons where possible.
- Every node must have fallback icon, short code and accessible label.
- Security, Support, RAG, Qdrant, Postgres and tool nodes must render in sample traces before UI implementation closes.

### Verification

- Planning only; no UI code changed in this step.

## 2026-05-21 20:20

### Goal

Start implementation for dashboard trace v2 compatibility.

### Work Started

- Marked dashboard trace plan as `in_progress`.
- Added `plans/agent-pipeline/platform/dashboard-trace-status.md` for live status tracking.
- Starting implementation with frontend icon/node registry and tests.

### Verification

- Not run yet; implementation just started.

## 2026-05-21 20:35

### Work Done

- Updated `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`.
- Added new pipeline agent ids to dashboard registry:
  - Lead, Cart, Search, Recommendation, Storage/Memory, History, RAG, Security, Customer Support, Sales.
- Added infra node support:
  - Postgres, Qdrant/vector DB, LLM service, pipeline executor.
- Added graph edge directions:
  - `guard`, `write`.
- Added fallback helpers:
  - `shortCodeFromId`
  - `formatUnknownNodeLabel`
- Added visual CSS states for new node/edge kinds.
- Added `apps/web/tests/agent-dashboard-graph.test.mjs`.

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- production `next start` HTTP check for `/agent-dashboard`: pass.

### Remaining

- Browser visual check with sample full-pipeline trace.
- Dense trace grouping for many low-level tool/service nodes.

## 2026-05-21 21:05

### Work Done

- Wired backend trace model to pipeline v2 ids.
- Added trace node kinds `vector_db` and `llm`.
- Added edge directions `guard` and `write`.
- Added backend graph nodes for `pipeline-executor`, `postgres-db`, `qdrant-db`, `llm-service`, `security-result`, and `support-case`.
- Added backend graph edges from Lead Agent to the new specialist agents and infra nodes.
- Added API source contract test to ensure dashboard trace ids do not regress.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `corepack pnpm --filter @retail-agent/web build`: pass.

### Remaining

- Browser visual pass with a dense real trace fixture.
- Optional grouping/collapse for very dense low-level service/tool nodes.

## 2026-05-22 00:45

### Goal

Add explicit requirement for runtime canvas playback animation on Agent Dashboard.

### Work Done

- Updated master pipeline plan to require dashboard canvas playback for real execution paths.
- Updated dashboard trace visualization plan with:
  - `TracePlaybackEvent` contract;
  - canvas playback requirements;
  - ordered edge animation;
  - loop from user message to assistant response;
  - reduced-motion fallback;
  - performance targets.
- Updated dashboard trace status.
- Updated dashboard trace test cases with playback/performance scenarios.
- Updated dashboard trace doc.

### Decision

Dashboard animation must be driven by actual trace events/edges, not by a guessed static pipeline. For a simple question, only the agents, DBs, services and tools actually used should animate. Moving effects should be canvas-based/lightweight and must not make the web UI lag.

### Verification

- Planning/docs only in this step; no runtime UI code changed.

## 2026-05-22 03:05

### Goal

Implement dashboard playback without coding blind, then verify the frontend through typecheck, unit tests, production build and HTTP route checks.

### Work Done

- Updated `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`.
- Added `TracePlaybackCanvas` using `requestAnimationFrame`.
- Added playback from ordered `playbackEvents` when present, with fallback to ordered graph edges.
- Added pause/replay controls.
- Added reduced-motion handling.
- Made SVG graph edges static so all paths no longer animate/blink at once.
- Updated `apps/web/src/app/styles.css` for canvas overlay and controls.
- Added runtime HTTP check for `/agent-dashboard` in `apps/web/tests/runtime-agent-dashboard.mjs`.
- Updated `apps/web/package.json` so `test:runtime` checks home and dashboard.
- Fixed home page resilience: if the product API is unavailable, home falls back to local sample products instead of returning 500.

### Verification

- Baseline before UI edit:
  - `corepack pnpm --filter @retail-agent/web typecheck`: pass.
  - `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- After UI edit:
  - `corepack pnpm --filter @retail-agent/web typecheck`: pass.
  - `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
  - `corepack pnpm --filter @retail-agent/web build`: pass.
- Runtime monitoring:
  - First `test:runtime` caught a real issue: home route returned 500 when API products were unavailable.
  - After fallback fix: `corepack pnpm --filter @retail-agent/web test:runtime` pass; home and `/agent-dashboard` returned 200 from a production Next server.

### Remaining

- Add real playback fixtures for product/search/cart/RAG/support/security traces.
- Run a browser visual pass when Playwright/browser tooling is available, because HTTP checks cannot prove pixel smoothness.

## 2026-05-22 03:18

### Goal

Make runtime traces show actual tools and infrastructure nodes, not only high-level agent nodes.

### Work Done

- Updated `apps/api/src/services/pipeline-trace-bridge.service.ts`.
- Trace bridge now derives tool nodes from `toolName`.
- Trace bridge maps tools to infrastructure:
  - catalog/cart/memory/history/support reads and writes -> `postgres-db`;
  - semantic search and RAG tools -> `qdrant-db`;
  - security/rerank/recommendation scoring -> `llm-service`.
- Playback events now include caller -> agent -> tool -> infra -> tool -> agent -> executor where applicable.
- Updated `apps/api/tests/pipeline-trace-bridge.test.mjs` with search/cart and RAG/support/security fixture coverage.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.

### Remaining

- Browser visual/screenshot review is still needed before closing dashboard trace visualization.

## 2026-05-22 03:48

### Goal

Run a real browser visual pass for the dashboard graph/canvas instead of relying only on source tests.

### Work Done

- Added dashboard visual fixture mode: `/agent-dashboard?demoTrace=1`.
- The fixture is local to the dashboard route and does not affect normal `/agent-dashboard` behavior.
- Repositioned common tool nodes around their owner agent/dependency:
  - `tool-rag-search-policy`
  - `tool-support-handle-case`
  - `tool-security-review-output`
- Reduced oversized graph card heading.
- Captured Chrome headless screenshot:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-demo.png`

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `corepack pnpm --filter @retail-agent/web test:runtime`: pass; home and `/agent-dashboard` return 200.
- `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.
- Manual screenshot review: graph renders with Lead, RAG, Support, Security, Qdrant, Postgres, LLM and tool nodes; canvas signal is visible and no longer all-edge blinking.

### Remaining

- Add product/recommendation/cart mutation demo screenshots before closing plan 02.

## 2026-05-22 09:59

### Goal

Finish the additional dashboard visual fixtures and verify the graph by browser screenshots, not only source tests.

### Work Done

- Extended dashboard demo trace mode:
  - `/agent-dashboard?demoTrace=cart`
  - `/agent-dashboard?demoTrace=recommendation`
- Added cart mutation and recommendation/search demo traces with agent/tool/DB/LLM nodes.
- Updated the dashboard source test to assert the new `demoTrace` query-param contract.
- Repositioned dense cart-flow nodes so Search, Cart, Recommendation, Postgres and tool nodes no longer overlap.
- Captured Chrome headless screenshots:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-cart.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-recommendation.png`

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `corepack pnpm --filter @retail-agent/web test:runtime`: pass; home and `/agent-dashboard` return 200 from production Next server.
- `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.
- Manual screenshot review:
  - cart trace renders Lead -> Search -> tool/Postgres -> Cart/write -> Recommendation -> Sales/LLM without node overlap;
  - recommendation trace renders Lead -> Memory/Postgres -> Search/Qdrant/rerank -> Recommendation -> Sales/LLM with readable node spacing;
  - canvas playback layer is visible and SVG edges stay static, so the graph no longer blinks every edge at once.

### Remaining

- Plan 02 is still not closed because the dashboard must consume the live latest trace from actual request execution, not only demo fixtures.
- Dense trace collapse/grouping remains open for very large real traces.

## 2026-05-22 10:04

### Goal

Wire playback events into the live latest trace response so the dashboard canvas does not need to guess animation order from static graph data.

### Work Done

- Updated `apps/api/src/services/agent.service.ts`.
- Live `AgentTrace` now builds `playbackEvents` from ordered graph edges before it is recorded by `AgentTraceService`.
- Added stable compact playback event ids for live traces.
- Updated `apps/api/tests/agent-trace-contract.test.mjs` to protect the live playback contract.

### Verification

- First API test run caught an assertion that was too tied to source formatting.
- Fixed the assertion to check the actual contract creation point.
- `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.

### Remaining

- Plan 02 still remains open for dense grouping/stress and explicit security-block/support complaint fixtures.

## 2026-05-22 10:17

### Goal

Close dashboard trace visualization after adding the remaining security/support/dense visual fixtures.

### Work Done

- Added `/agent-dashboard?demoTrace=support` as an explicit support complaint/RAG route fixture.
- Added `/agent-dashboard?demoTrace=security` as a security-block fixture.
- Added `/agent-dashboard?demoTrace=dense` as a dense trace stress fixture.
- Added `compactVisibleGraphNodes` so large traces keep primary agents/infra visible and group overflow runtime nodes as `grouped-runtime-nodes`.
- Adjusted security node positions after screenshot review to avoid overlap.
- Captured and reviewed:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-support.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-security.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-dense.png`

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `corepack pnpm --filter @retail-agent/web test:runtime`: pass; home and `/agent-dashboard` return 200 from production Next server.
- `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.

### Result

- Dashboard trace visualization plan close gate passed.
- Top-level row 02 can be checked.

## 2026-05-22 10:24

### Goal

Apply the user's UX refinement: dashboard nodes should prioritize icon/short code and a small note underneath so dense graphs do not overlap or look noisy.

### Work Done

- Updated node rendering to use compact labels via `formatCompactNodeLabel`.
- Reduced node widths and typography so the visible node surface is code-first, note-second.
- Kept full label/details in `title` and `aria-label` so shortened visual labels do not remove context.
- Captured compact dense screenshot:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-dense-compact.png`

### Verification

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- `corepack pnpm --filter @retail-agent/web test:runtime`: pass.
- Screenshot review: dense trace is cleaner; nodes use short badges (`LD`, `SRCH`, `TOOL`, `LLM`) plus compact labels and small detail notes.
