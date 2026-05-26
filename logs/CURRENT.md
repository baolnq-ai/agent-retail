# Current Log Index

- Updated: 2026-05-25 12:50 +07:00
- Purpose: quick map of latest human logs versus generated runtime logs.

## Latest Human Logs

| Time | Status | Log | Related Plan | Evidence |
| --- | --- | --- | --- | --- |
| 2026-05-25 11:59 | closed | [planning/repository-doc-log-plan-index.md](planning/repository-doc-log-plan-index.md) | [../plans/platform/repository-doc-log-plan-index.md](../plans/platform/repository-doc-log-plan-index.md) | README/CURRENT indexes |
| 2026-05-25 12:50 | closed | [planning/dashboard-flow-continuous-animation.md](planning/dashboard-flow-continuous-animation.md) | [../plans/frontend/dashboard-flow-continuous-animation.md](../plans/frontend/dashboard-flow-continuous-animation.md) | [../test/dashboard-flow-continuous-evidence-2026-05-25](../test/dashboard-flow-continuous-evidence-2026-05-25/README.md) |
| 2026-05-25 11:19 | closed | [planning/real-catalog-web-redesign.md](planning/real-catalog-web-redesign.md) | [../plans/frontend/real-catalog-web-redesign.md](../plans/frontend/real-catalog-web-redesign.md) | [../test/real-catalog-web-redesign-evidence-2026-05-25](../test/real-catalog-web-redesign-evidence-2026-05-25/README.md) |
| 2026-05-25 10:28 | closed | [planning/retail-chatbot-100q-agent-benchmark.md](planning/retail-chatbot-100q-agent-benchmark.md) | [../plans/agent-pipeline/retail-chatbot-100q-agent-benchmark.md](../plans/agent-pipeline/retail-chatbot-100q-agent-benchmark.md) | [../test/retail-chatbot-100q-agent-evidence-2026-05-25](../test/retail-chatbot-100q-agent-evidence-2026-05-25/README.md) |

## Generated Logs

| Folder | Meaning | Read When |
| --- | --- | --- |
| `runtime/backend/` | API process output | Debugging running API |
| `runtime/frontend/` | Web process output | Debugging running frontend |
| `setup/` | Setup/stop script logs | Debugging local environment |

## Maintenance Rule

- Human decisions go in `logs/planning/*.md` or `logs/implementation/*.md`.
- Runtime `.log` files are evidence for debugging, not the project status source of truth.
- Update this file after each substantial task.
