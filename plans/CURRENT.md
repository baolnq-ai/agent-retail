# Current Project Work Index

- Updated: 2026-05-25 12:50 +07:00
- Purpose: quick answer for "what was worked on last, what is active, and where is the evidence?"

## Active Work

| Status | Item | Owner Area | Plan | Log | Evidence |
| --- | --- | --- | --- | --- | --- |
| none | No open plan in `plans/running/` | project | - | - | - |

## Latest Closed Work

| Closed Time | Status | Item | Area | Plan | Log | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-25 12:50 | closed | Dashboard continuous flow animation cleanup | Frontend dashboard | [frontend/dashboard-flow-continuous-animation.md](frontend/dashboard-flow-continuous-animation.md) | [logs/planning/dashboard-flow-continuous-animation.md](../logs/planning/dashboard-flow-continuous-animation.md) | [test/dashboard-flow-continuous-evidence-2026-05-25](../test/dashboard-flow-continuous-evidence-2026-05-25/README.md) |
| 2026-05-25 11:19 | closed | Real catalog data and retail web redesign | Frontend + API catalog | [frontend/real-catalog-web-redesign.md](frontend/real-catalog-web-redesign.md) | [logs/planning/real-catalog-web-redesign.md](../logs/planning/real-catalog-web-redesign.md) | [test/real-catalog-web-redesign-evidence-2026-05-25](../test/real-catalog-web-redesign-evidence-2026-05-25/README.md) |
| 2026-05-25 10:28 | closed | 100-question retail chatbot benchmark | Agent pipeline | [agent-pipeline/retail-chatbot-100q-agent-benchmark.md](agent-pipeline/retail-chatbot-100q-agent-benchmark.md) | [logs/planning/retail-chatbot-100q-agent-benchmark.md](../logs/planning/retail-chatbot-100q-agent-benchmark.md) | [test/retail-chatbot-100q-agent-evidence-2026-05-25](../test/retail-chatbot-100q-agent-evidence-2026-05-25/README.md) |
| 2026-05-25 09:25 | closed | 30-question chatbot benchmark and dashboard fix | Agent pipeline + frontend | [agent-pipeline/retail-chatbot-30q-benchmark-and-dashboard-fix.md](agent-pipeline/retail-chatbot-30q-benchmark-and-dashboard-fix.md) | [logs/planning/retail-chatbot-30q-benchmark-and-dashboard-fix.md](../logs/planning/retail-chatbot-30q-benchmark-and-dashboard-fix.md) | [test/retail-chatbot-30q-benchmark-evidence-2026-05-25](../test/retail-chatbot-30q-benchmark-evidence-2026-05-25/README.md) |
| 2026-05-25 08:34 | closed | Dashboard/chatbot QA redesign | Frontend + QA | [frontend/dashboard-chatbot-qa-redesign.md](frontend/dashboard-chatbot-qa-redesign.md) | [logs/planning/dashboard-chatbot-qa-redesign.md](../logs/planning/dashboard-chatbot-qa-redesign.md) | [test/dashboard-chatbot-qa-evidence-2026-05-25](../test/dashboard-chatbot-qa-evidence-2026-05-25/README.md) |

## How To Read This Repo

1. Start here for status: `plans/CURRENT.md`.
2. Read `plans/README.md` for the folder map.
3. Read `docs/CURRENT.md` for canonical docs and latest evidence.
4. Read `logs/CURRENT.md` for the latest human-written session logs.
5. Use `test/*evidence*/README.md` only when you need proof screenshots, reports, or UI artifacts.

## Rules Going Forward

- Put in-progress work in `plans/running/`.
- When done, close the plan and move it to `plans/frontend/`, `plans/backend/`, `plans/agent-pipeline/`, or `plans/platform/`.
- Every closed plan should have a matching human log in `logs/planning/` and evidence path when UI/benchmark/runtime proof exists.
- Update this file after each substantial task.
