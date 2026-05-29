# Plan: Retail Chatbot 100Q Agent Benchmark

- Created: 2026-05-25 09:31
- Updated: 2026-05-25 10:28
- Status: closed
- Related log: `logs/planning/retail-chatbot-100q-agent-benchmark.md`

## Goal

Run a strict 100-question retail chatbot benchmark through the real agent pipeline and frontend, fix exposed issues at general agent/tool/prompt/status/UI boundaries, and prove the final state with report plus screenshots for chat suggestions, loading/status and dashboard animation/layout.

## Scope

- In:
  - 100-question benchmark covering retail product advice, compare, product detail, cart, policy, support, noisy/off-topic, safety and prompt-injection cases.
  - Core response checks: intent, latency, source/product alignment, policy grounding, cart behavior, safe bounded replies and trace errors.
  - Frontend checks: visible answer, suggested quick replies/product suggestions, loading/status states, and dashboard node/edge/animation audit.
  - Iterative fix workflow: when false results appear, fix general agent flow/prompt/tool/routing/UI logic, then run a fresh 100-question set from the start.
- Out:
  - Hardcoded answers for benchmark prompts.
  - Fake/mock-only passing.
  - Hiding failures by weakening evaluator requirements without documented requirement change.

## Skills

- plan-skill
- backend-skill
- frontend-skill
- testing-skill
- logging-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Create plan/log and inspect existing 30Q benchmark/evidence | done | Plan + log |
| 2 | Build 100Q runner and frontend/dashboard evidence script | done | `tests/agent-pipeline/retail-chatbot-benchmark-100/` |
| 3 | Run baseline 100Q, read failures and classify root causes | done | Variant A report |
| 4 | Fix agent/UI issues generally and rerun with a new 100Q set | done | Variants B-F reports |
| 5 | Capture frontend suggestion/status/dashboard evidence and audit screenshots | done | `tests/retail-chatbot-100q-agent-evidence-2026-05-25/` |
| 6 | Run regression tests, hygiene scans, close and move plan | done | Test output + closed plan |

## Verification

- `corepack pnpm --filter @retail-agent/api test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web build`
- Real API benchmark with 100 fresh prompts after fixes.
- Frontend/CDP screenshots for answer, suggestions, loading/status and dashboard animation/layout.
- Evidence hygiene: README links, duplicate image hash scan, secret pattern scan, no temp artifacts.

## Close criteria

- Final 100-question benchmark completes with no fail and only documented low-risk warnings.
- Every fix is general agent/prompt/tool/pipeline/UI behavior, not per-question answer patches.
- Product and quick-reply suggestions are checked from the real chat UI, not only JSON.
- Dashboard reviewed by screenshots and audit: no node overlap, readable direction/color semantics, animation frame differs from initial layout frame.
- Plan/log/evidence are updated, plan is closed and moved out of `plans/running/`.

## Close Summary

- Final benchmark variant E: 100/100 completed, 99 pass, 1 warn, 0 fail.
- Latency avg/p50/p95: 2341/2379/3966 ms.
- Frontend CDP audit: pass for loading/status, product rail, quick replies, policy source and safety bounded reply.
- Dashboard CDP audit: 10 nodes, 12 edges, 0 overlap pairs, 5 legend items, animation changed.
- Regression: API test 94/94, web typecheck pass, web test 3/3, web build pass.
