# Log: Retail Chatbot 30Q Benchmark And Dashboard Fix

- Created: 2026-05-25 08:42 +07:00
- Type: planning/frontend-backend-testing
- Related plan: `plans/agent-pipeline/retail-chatbot-30q-benchmark-and-dashboard-fix.md`

## 2026-05-25 08:42

### Goal

Run a stricter benchmark and fix real dashboard/status/pipeline problems instead of passing with shallow tests.

### Initial Issues From Review

- Dashboard still has overlapping/near-overlapping nodes on policy trace and animation is not perceived as continuous.
- Edge colors and direction semantics are not clear enough.
- Chat status can say misleading phase labels for policy/support flows.
- Previous 20-question QA exposed at least one real false route: robot vacuum for pets became `cart_action` instead of recommendation.

### Rules For This Round

- Do not hardcode answers to benchmark prompts.
- Fix routing/prompt/tool/status logic at general boundaries.
- Use real frontend/API flow and keep screenshot evidence.
- Rerun from the start after fixes.

## 2026-05-25 09:25

### Changes

- Fixed chat stream status so frontend receives real prepare-phase statuses instead of stale generic labels.
- Made chat status step mapping deterministic from status text and updated loading dots animation.
- Reworked dashboard graph to keep only core/important nodes, hide the chat launcher on the dashboard route, and animate route particles continuously on canvas.
- Optimized realtime pipeline by keeping LLM audit gates behind env flags and using deterministic agent contracts/guardrails for the hot path.
- Improved intent routing taxonomy for product discovery, policy/support, compare, and cart mutation phrases without per-question answer patches.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 94/94.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- Final benchmark: 30/30 pass, 0 warn, 0 fail, accuracy 100/100, latency avg/p50/p95 2299/2441/3415 ms.
- Frontend CDP evidence captured chat loading, product answer, safety answer, policy answer, dashboard layout, and two dashboard animation frames.

### Evidence

- `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/README.md`
- `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/reports/benchmark-30-report.md`
- `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/frontend-cdp-audit.json`
