![RetailHome AI Agent](apps/web/public/banner.jpg)

# RetailHome AI Agent

Production-oriented AI retail assistant monorepo with account auth, account-bound cart, multi-agent sales workflow, runtime model settings, and an observability dashboard.

- Updated: 2026-05-18
- Stack: NestJS/Fastify API, Next.js web, Prisma/PostgreSQL, Redis, OpenAI-compatible chat model gateway.

## Features

- Customer storefront with product browsing and global chat widget.
- Account registration/login/logout with HttpOnly cookie sessions.
- Account-bound active cart; no guest/default cart behavior in chat flows.
- Database-backed chat memory, rolling summary, preferences, behavior events, and memory deletion controls.
- Multi-agent sales pipeline: memory, user analysis, retrieval, cart manager, and sales response composer.
- Cart tool execution with verified results and dashboard trace visibility.
- Runtime API settings dashboard for OpenAI-compatible chat model and embedding/rerank service.
- Agent dashboard for graph, timeline, memory, retrieval, cart tools, LLM context, and non-fatal errors.

## Architecture

```txt
AI-Agent-retail/
  apps/
    api/   # NestJS/Fastify backend, Prisma, auth, commerce, agent orchestration
    web/   # Next.js frontend, storefront, chat, account, cart, dashboards
  infra/
    docker/ # PostgreSQL and Redis compose stack
  docs/     # Canonical documentation
  logs/     # Human task logs plus generated setup/runtime logs
```

Read the canonical docs:

- [Architecture](docs/architecture.md)
- [Agent pipeline](docs/agent-pipeline.md)
- [Operations](docs/operations.md)
- [Development](docs/development.md)
- [CI/CD and push workflow](docs/ci-cd.md)

## Quick start

Requirements:

- Node.js 20+
- Corepack/pnpm
- Docker, unless using existing PostgreSQL/Redis services
- Bash-compatible shell

Start everything:

```bash
./setup.sh
```

Stop everything:

```bash
./stop.sh
```

Default local URLs:

- Web: `http://127.0.0.1:7000`
- API: `http://127.0.0.1:7010`
- Health: `http://127.0.0.1:7010/health`

## Environment

Copy `.env.example` to `.env` or let `setup.sh` create it.

Important variables:

```txt
API_PORT=7010
WEB_PORT=7000
DATABASE_URL=postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public
REDIS_URL=redis://localhost:56379
CHAT_MODEL_BASE_URL=http://<openai-compatible-host>
CHAT_MODEL_ID=<model-id>
EMBED_RERANK_BASE_URL=http://<embedding-rerank-host>
```

Do not commit `.env` or raw secrets. Runtime API keys can be configured in the web dashboard and must not be logged.

## Manual development

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

Run API and web manually:

```bash
corepack pnpm --filter @retail-agent/api dev
corepack pnpm --filter @retail-agent/web dev
```

Prepare database:

```bash
corepack pnpm --filter @retail-agent/api db:generate
corepack pnpm --filter @retail-agent/api db:push
corepack pnpm --filter @retail-agent/api db:seed
```

## Validation

Run before reporting changes as complete:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @retail-agent/web build
```

Runtime tests require local services and model endpoints:

```bash
corepack pnpm test:runtime
```

## CI/CD

The baseline GitHub Actions workflow runs:

- dependency install with pnpm;
- workspace typecheck;
- workspace tests;
- web production build.

Runtime model tests are kept local/pre-release because private model endpoints may not be reachable from CI.

## Security notes

- Auth uses HttpOnly cookies.
- Passwords are hashed before storage.
- Session tokens are hashed before storage.
- `.env` and `.env.*` are ignored; `.env.example` is the only committed template.
- Do not log passwords, cookies, raw session tokens, or private API keys.
- Final assistant responses must only claim cart actions that have verified tool results.

## Push checklist

Before asking to commit or push:

1. Review changed files.
2. Run typecheck/tests/build.
3. Update docs and human task logs when behavior or operations change.
4. Ensure generated runtime logs, `.env`, and secrets are not included.
5. Commit/push only when explicitly requested.
