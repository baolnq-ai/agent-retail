# Plan: Dashboard Chatbot QA Redesign

- Created: 2026-05-25 08:02
- Updated: 2026-05-25 08:34
- Status: closed
- Related log: `logs/planning/dashboard-chatbot-qa-redesign.md`

## Goal

Make the agent dashboard easier to read, move noisy lower trace descriptions into compact/detail surfaces, fix graph route animation and bidirectional edge colors, improve chat loading/status feedback, and add a practical 20-question chatbot QA suite that reads outputs instead of passing blindly.

## Scope

- In:
  - Agent dashboard layout, graph spacing, edge colors, playback animation and detail popup.
  - Chat widget status presentation and typing/loading animation.
  - 20 realistic chatbot questions, including retail/web-related and noisy off-topic prompts.
  - Browser screenshots and report evidence.
- Out:
  - Rebuilding backend agent architecture.
  - Changing model provider configuration.
  - Marking chatbot quality as production-ready without output review.

## Skills

- plan-skill
- frontend-skill
- testing-skill
- logging-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Capture current UX issues and create plan/log | done | This plan + session log |
| 2 | Redesign dashboard graph, details and route animation | done | `test/dashboard-chatbot-qa-evidence-2026-05-25/app/01-dashboard-compact-graph.png` |
| 3 | Improve chat loading/status UI | done | `test/dashboard-chatbot-qa-evidence-2026-05-25/function/03-chat-loading-status-dots.png` |
| 4 | Add 20-question chatbot QA list and output evaluator | done | `test/agent-pipeline/chatbot-qa/cases.md`; QA report JSON |
| 5 | Run verification and package evidence | done | Evidence README + PNGs + test output |

## Verification

- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/api test`
- `corepack pnpm --filter @retail-agent/web build`
- `node test/agent-pipeline/chatbot-qa/runtime-chatbot-qa-20.mjs`
- Browser screenshot evidence for:
  - compact dashboard graph without node overlap;
  - detail popup;
  - visible route animation/legend;
  - chat loading/status animation.
- Chatbot QA report reads output for 20 prompts and records pass/warn/fail criteria.

## Close criteria

- Dashboard top section is cleaner and lower details no longer dominate the screen.
- Graph nodes are spaced with collision handling and bidirectional edges are distinguishable.
- Route animation visibly moves from source to target and has color meaning.
- Chat loading state shows clear status and a smoother 3-dot animation.
- 20-question QA suite exists with practical prompts and output review rules.
- Evidence folder has readable README, screenshots and no obvious secret-bearing artifacts.

## File Lifecycle

- While running: keep this plan in `plans/running/dashboard-chatbot-qa-redesign.md`.
- When completed and verified: set status to `completed`, then `closed`.
- After close: move the plan to `plans/frontend/dashboard-chatbot-qa-redesign.md` because the scope is frontend dashboard/chat UX with QA evidence.
- Closed on 2026-05-25 08:34 and moved to `plans/frontend/dashboard-chatbot-qa-redesign.md`.
