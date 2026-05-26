# Status: Dashboard Trace Visualization

- Created: 2026-05-21 20:20
- Updated: 2026-05-22 10:24
- Overall status: completed
- Current phase: close gate passed; dashboard trace visualization ready for plan 03+
- Related plan: `plans/agent-pipeline/platform/dashboard-trace-visualization.md`
- Related log: `logs/planning/agent-pipeline/dashboard-trace.md`

## Phase Status

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Define node/edge trace contract v2 | done | API/web tests pass |
| 2 | Implement dashboard icon registry and fallback icons | done | Source test pass |
| 3 | Add layout support for all new agents | done | New registry/layout ids added |
| 4 | Add grouped DB/service/tool nodes | done | Postgres/Qdrant/LLM/service nodes wired; dense demo groups overflow runtime nodes |
| 5 | Add compatibility for legacy trace ids | done | Legacy ids retained |
| 6 | Add automated dashboard tests | done | `apps/web/tests/agent-dashboard-graph.test.mjs` pass |
| 7 | Add canvas trace playback animation | done | `TracePlaybackCanvas`; edge CSS static; Web typecheck/test/runtime pass |
| 8 | Add real request playback fixtures | done | Live `AgentTrace` stores `playbackEvents`; API 52/52 covers search/cart and RAG/support/security infra nodes; Chrome screenshots pass for support/RAG, cart, recommendation, security and dense demo traces |

## Current Notes

- Start with dashboard trace compatibility before deeper pipeline code so future agent work remains observable.
- Verification run:
  - `corepack pnpm --filter @retail-agent/web typecheck`: pass.
  - `corepack pnpm --filter @retail-agent/web test`: pass.
  - `corepack pnpm --filter @retail-agent/web build`: pass.
  - production `next start` HTTP check for `/agent-dashboard`: pass.
- Remaining: no open item for this platform plan; future agent plans should keep adding real trace cases as they implement runtime.
- Canvas playback now animates one ordered route segment at a time via `requestAnimationFrame`; SVG edges are static background paths to avoid all-edge blinking.
- Runtime monitoring:
  - `corepack pnpm --filter @retail-agent/web typecheck`: pass.
  - `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
  - `corepack pnpm --filter @retail-agent/web test:runtime`: pass, home and `/agent-dashboard` HTTP checks.
- Backend trace fixture coverage:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.
  - Trace bridge now adds tool nodes plus Postgres/Qdrant/LLM service nodes from tool names.
- Browser visual evidence:
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-demo.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-cart.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-recommendation.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-support.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-security.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-dense.png`
  - `logs/planning/agent-pipeline/dashboard-trace-agent-dashboard-dense-compact.png`
  - Demo routes: `/agent-dashboard?demoTrace=1`, `/agent-dashboard?demoTrace=cart`, `/agent-dashboard?demoTrace=recommendation`
  - Additional routes: `/agent-dashboard?demoTrace=support`, `/agent-dashboard?demoTrace=security`, `/agent-dashboard?demoTrace=dense`
- New requirement: dashboard must animate the actual runtime path on canvas, from user message through Lead/agent/tool/DB/service nodes to assistant response, then loop smoothly.
- Backend verification run:
  - `corepack pnpm --filter @retail-agent/api test`: pass, 52/52.
- Live trace update:
  - `AgentTrace` now stores `playbackEvents` generated from live graph edges before `AgentTraceService.record(trace)`.
- UX refinement:
  - Nodes now prioritize short code/icon badges plus compact labels and small notes to reduce overlap on dense traces.
