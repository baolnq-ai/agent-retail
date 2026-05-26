# Log: Run And Source Review

- Created: 2026-05-25 07:35 +07:00
- Type: planning/runtime-review
- Related tracker: `plans/agent-pipeline/execution-tracker.md`

## Goal

Run the local project and re-read the current source/plans to identify where the agent-flow and test work is currently paused.

## Runtime

- First `setup.ps1` attempt blocked while waiting for PostgreSQL/Redis because Docker Desktop daemon was not running.
- Started Docker Desktop and reran `setup.ps1` successfully.
- Runtime is online:
  - Web: `http://127.0.0.1:7000`
  - API: `http://127.0.0.1:7010`
  - API health returned `status=ok` and `database=ok`.
  - Docker Compose services `postgres` and `redis` are healthy.

## Source Review

- The repo is a pnpm monorepo with `apps/api`, `apps/web`, and `packages/shared`.
- API is NestJS/Fastify with Prisma/Postgres persistence.
- Web is Next.js with storefront, chat widget, account/cart pages, API test route, and agent dashboard.
- Agent pipeline v2 model/registry/executor/trace bridge exist in source and are covered by API tests.
- Current tracker status is `in_progress`; ordered row 07 `Recommendation Agent runtime` is next.
- Cart Agent direct runtime passed 100/100 previously, but its ordered row remains `partial` because cross-agent cases belong to later Search/RAG/Support/Sales/Lead integration plans.
- Storage/Memory, History, and Search Agent rows are marked `passed`.

## Verification

- `corepack pnpm --filter @retail-agent/api test`: pass, 93/93.
- `corepack pnpm --filter @retail-agent/web test`: pass, 3/3.

## Notes

- Worktree already contained many modified/untracked files before this review; no source file was reverted.
- Only this review log was added during the session.
