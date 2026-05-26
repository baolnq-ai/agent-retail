# Log: Retail Chatbot 100Q Agent Benchmark

- Created: 2026-05-25 09:31 +07:00
- Type: planning/frontend-backend-testing
- Related plan: `plans/agent-pipeline/retail-chatbot-100q-agent-benchmark.md`

## 2026-05-25 09:31

### Goal

Expand the prior 30-question validation to a stricter 100-question benchmark, while also checking the real frontend suggestions and dashboard rendering/animation.

### Rules For This Round

- Fix failures through general agent pipeline, prompts, tools, routing, status, or UI behavior.
- Do not hardcode benchmark answers or add brittle fallback paths.
- If a fix is needed, rerun from the beginning using a different 100-question set.
- Review output details and screenshots before marking pass.

### Initial Context

- Prior 30Q benchmark passed, but this round must increase coverage and verify visible quick replies/product suggestions from the chat UI.
- Existing 30Q runner and CDP screenshot script will be reused only as scaffolding.

## 2026-05-25 09:38

### Progress

- Added `test/agent-pipeline/retail-chatbot-benchmark-100/runtime-chatbot-benchmark-100.mjs`.
- Added `test/agent-pipeline/retail-chatbot-benchmark-100/frontend-dashboard-evidence-cdp.mjs`.
- Both scripts passed `node --check`.
- API health and web home route are reachable before baseline.

### Next

- Run 100-question variant A baseline, read fail/warn causes, then fix only general agent/UI logic if needed.

## 2026-05-25 09:45

### Baseline A

- Ran 100-question variant A through the real API.
- Result: 73 pass, 3 warn, 24 fail; accuracy 91/100; latency avg/p50/p95 2275/2558/3905 ms.
- Main root causes:
  - Product discovery phrases without explicit product nouns were falling to smalltalk/cart context.
  - Compare phrases using "A voi/va B" without "so sanh" were routed as recommend.
  - Policy/support phrases like fee, missing accessory, delivery issue and support call were not all routed to policy/support.
  - Unsafe/out-of-scope prompts could still pull product/policy sources.

### Fix

- Expanded general routing taxonomy in `agent-orchestrator.service.ts`.
- Expanded rule user-analysis discovery/cart gating in `user-analysis-agent.service.ts`.
- Built API and restarted it from `dist/main.js`.

### Next

- Run fresh 100-question variant B from the beginning after the fix.

## 2026-05-25 10:28

### Iterations

- Variant B after first fix: 90 pass, 0 warn, 10 fail.
- Variant C after second fix: 97 pass, 1 warn, 2 fail.
- Variant D exposed policy wording and time/cart ambiguity regressions.
- Variant F passed, then API regression caught a product-mention-alone contract issue.
- Final variant E after the last contract fix: 99 pass, 1 warn, 0 fail; accuracy 100/100; latency avg/p50/p95 2341/2379/3966 ms.

### Final Fixes

- Expanded policy/support intent priority without turning policy wording into product recommendation.
- Tightened cart action/status detection so `hẹn giờ` is not confused with `giỏ`.
- Expanded compare detection for `nên chọn X hay Y`.
- Kept product mention alone from becoming recommendation unless there is real buying/advice intent.
- Strengthened text/product rail alignment when visible product cards exist.

### Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 94/94.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.
- `corepack pnpm --filter @retail-agent/web build`: pass.
- Frontend CDP evidence: pass for chat loading/status, product suggestions, quick replies, policy source and safety answer.
- Dashboard CDP evidence: pass, 10 nodes, 0 overlap pairs, 5 legend items, animation changed.
- Evidence hygiene: no duplicate PNGs, no secret pattern hits, main README files exist.

### Evidence

- `test/retail-chatbot-100q-agent-evidence-2026-05-25/README.md`
- `test/retail-chatbot-100q-agent-evidence-2026-05-25/reports/benchmark-100-e-report.md`
- `test/retail-chatbot-100q-agent-evidence-2026-05-25/frontend-dashboard-cdp-audit.json`
