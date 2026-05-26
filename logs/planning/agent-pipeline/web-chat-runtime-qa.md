# Web + Chat Runtime QA

## 2026-05-22

Scope: production web route smoke tests, API regression tests, real `/api/v1/chat` soak test with 50 sequential requests.

Commands run:

- `corepack pnpm --filter @retail-agent/web test:runtime` -> pass.
- `corepack pnpm --filter @retail-agent/api test` -> pass, 92/92.
- `node apps/api/tests/runtime-agent-chat-soak-50.mjs` -> completed 50 real chat requests, 39/50 passed.

Fixes completed in this QA pass:

- Fixed Nest DI for `StorageMemoryAgentService` and `SearchAgentService` when production API starts from compiled JS.
- Fixed `.env` precedence so explicit runtime `API_PORT`/test env values override repo `.env`.
- Added production web runtime route test for `/`, `/products`, product detail, `/cart`, `/account`, `/test-api`, `/agent-settings`, and dashboard demo trace.
- Added 50-turn real chat soak script and JSON report output at `logs/planning/agent-pipeline/chat-soak-50-report.json`.
- Product pipeline fixes:
  - Explicit `prod_...` IDs are resolved before lexical search.
  - Catalog search strips Vietnamese accents for ASCII queries such as `noi chien` and `duoi 3 trieu`.
  - User analysis cannot downgrade clear product intents or explicit product IDs to `smalltalk/none`.
  - Response builder keeps product rail when product-manager has selected products even if recommendation LLM hides the rail.
- Cart/action safety fixes:
  - Cart action tool summaries are sanitized before reaching user text; raw `prod_...` IDs and English tool strings are removed.
  - Final safe fallback no longer exposes evaluator complaints or internal debug text.
- Model gateway now retries transient 5xx/network/timeout JSON calls up to 3 attempts.

Current blocker:

- The 50-turn soak still fails 11 cases. Remaining failures are concentrated in cart state continuity and vague follow-up/history resolution, plus one intermittent product rail case.
- Latest soak result: 39/50 pass. See `logs/planning/agent-pipeline/chat-soak-50-report.json`.

Next fix target:

1. Capture response snapshots for failed soak cases, not only assertion messages.
2. Fix authenticated cart state continuity after add/update/total requests returning intermittent 500.
3. Fix follow-up references such as `san pham vua de xuat`, `cai do`, and `tong ket lua chon` so history/storage resolves product rails consistently.
4. Re-run `test:runtime:chat-soak:50` until 50/50 pass.
