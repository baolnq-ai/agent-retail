# Plan: Retail Chatbot 30Q Benchmark And Dashboard Fix

- Created: 2026-05-25 08:42
- Updated: 2026-05-25 09:25
- Status: closed
- Related log: `logs/planning/retail-chatbot-30q-benchmark-and-dashboard-fix.md`

## Goal

Run a stricter 30-question retail chatbot benchmark through the real frontend/API flow, fix false results at the pipeline/tool/prompt/status level, redesign dashboard animation/layout based on screenshots, and only close when evidence shows fast, accurate, grounded, safe responses.

## Scope

- In:
  - Dashboard graph layout, color semantics, continuous animation and non-overlap behavior.
  - Chat loading/status labels driven by real phase/intent instead of misleading generic steps.
  - Agent intent/status pipeline fixes when benchmark exposes false routing.
  - 30-question benchmark with real retail, cart, policy, support, off-topic/noise and prompt-injection prompts.
  - Frontend screenshots and detailed report for performance, accuracy, grounding, safety, source/product alignment.
- Out:
  - Hardcoded per-question answer patches.
  - Mock-only validation.
  - Passing on fallback/mock data.

## Skills

- plan-skill
- backend-skill
- frontend-skill
- testing-skill
- logging-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Create plan/log and audit current failures | done | Plan + log |
| 2 | Fix dashboard animation/layout with screenshot review | done | `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/dashboard/` |
| 3 | Fix chat status/loading and backend status events | done | `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/frontend/01-chat-loading-status-dots.png` |
| 4 | Build 30-question benchmark runner/report | done | `tests/agent-pipeline/retail-chatbot-benchmark-30/` |
| 5 | Run benchmark, read outputs, fix false routing/grounding/performance issues | done | Iteration reports and final report |
| 6 | Final full rerun with new 30-question set and evidence package | done | `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/README.md` |

## Verification

- `corepack pnpm --filter @retail-agent/api test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web build`
- Real frontend/API benchmark with 30 fresh prompts after fixes.
- Screenshot evidence for dashboard animation/layout, chat status/loading, and representative chatbot answers.

## Close Summary

- Final benchmark `F30-*`: 30/30 pass, 0 warn, 0 fail.
- Latency avg/p50/p95: 2299/2441/3415 ms.
- Dashboard CDP audit: 12 nodes, 11 edges, 0 overlap pairs.
- Evidence package: `tests/retail-chatbot-30q-benchmark-evidence-2026-05-25/`.

## Close criteria

- 30-question final benchmark completes with no fail and only documented low-risk warnings.
- Average and p95 response times are reported and meet the benchmark threshold or are explicitly blocked by model latency.
- Product recommendations align with returned product blocks and catalog/source constraints.
- Policy/support/off-topic/noise/prompt-injection prompts are handled safely without hallucination.
- Dashboard animation is continuous, legible, colored by meaning, and nodes do not overlap in reviewed screenshots.
- Plan is moved from `plans/running/` to `plans/frontend/` or `plans/agent-pipeline/platform/` after close.
