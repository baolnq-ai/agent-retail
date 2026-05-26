# Evidence: Dashboard Chatbot QA Redesign

- Created: 2026-05-25
- Scope: dashboard graph readability, detail popup, route animation/status, chat loading status, chatbot QA output review.
- App URLs used:
  - Runtime app: `http://127.0.0.1:7000`
  - Production screenshot server: `http://127.0.0.1:7090`
  - API: `http://127.0.0.1:7010`

## Result

- Dashboard evidence captured from production web build.
- Chat loading/status evidence captured from the running app on port `7000` because API CORS is configured for that origin.
- Chatbot QA suite completed 20/20 prompts: 19 pass, 1 warn, 0 fail.
- Remaining warning: `QA-006` misclassified "robot hút bụi ... thú cưng" as `cart_action` instead of recommendation.

## Evidence Folders

| Folder | Purpose |
| --- | --- |
| [`app/`](app/README.md) | Dashboard graph screenshot evidence. |
| [`function/`](function/README.md) | Popup detail and chat loading/status screenshots. |

## Related Files

- Plan: `plans/running/dashboard-chatbot-qa-redesign.md`
- Log: `logs/planning/dashboard-chatbot-qa-redesign.md`
- QA cases: `test/agent-pipeline/chatbot-qa/cases.md`
- QA runtime report: `logs/planning/dashboard-chatbot-qa-redesign-chatbot-report.json`

## Verification Commands

- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/api test`
- `corepack pnpm --filter @retail-agent/web build`
- `node test/agent-pipeline/chatbot-qa/runtime-chatbot-qa-20.mjs`
