# Architecture

- Updated: 2026-05-18
- Status: current production-readiness overview.

## Monorepo layout

```txt
AI-Agent-retail/
  apps/
    api/   # NestJS/Fastify backend, Prisma, commerce, auth, agent orchestration
    web/   # Next.js customer storefront, chat widget, account/cart/dashboard pages
  packages/
    shared/ # Shared workspace package when common contracts are needed
  infra/
    docker/ # Local PostgreSQL/Redis compose stack
  docs/     # Canonical project documentation
  logs/     # Human task logs and generated runtime/setup logs
```

## Runtime services

| Area | Implementation |
| --- | --- |
| API | NestJS 11 on Fastify, default local port `7010` |
| Web | Next.js 16 App Router, default local port `7000` |
| Database | PostgreSQL via Prisma, local Docker port `55432` |
| Cache | Redis via local Docker port `56379` |
| Chat model | OpenAI-compatible `/v1/chat/completions` runtime setting |
| Model listing | OpenAI-compatible `/v1/models` runtime ping |
| Embedding/rerank | Custom base URL with `/api/v1/embed`, `/api/v1/rerank`, `/health` |

## Backend modules

- Auth: account registration/login/logout with HttpOnly cookie sessions.
- Commerce: account-bound active cart, cart item add/remove/update, order/payment mock flow.
- Catalog/knowledge: product and policy lookup used by retrieval and RAG context.
- Chat memory: account-bound recent turns, rolling summary, preferences, recent recommendations, pending cart plan.
- Agent services: user analysis, cart manager, orchestrator, trace store, model gateway.
- Observability: latest agent trace endpoints for dashboard visualization.

## Frontend surfaces

- Home/storefront with global chat widget.
- Products page for catalog browsing.
- Account page for login/register and memory deletion.
- Cart page for account-bound cart management.
- Agent dashboard for pipeline trace, memory, retrieval, cart tools, and errors.
- API settings page for runtime OpenAI-compatible model configuration and ping checks.

## Security baseline

- Auth uses HttpOnly cookies; do not move tokens to localStorage.
- Passwords are stored as hashes only.
- Session tokens are stored as hashes only.
- `.env` and `.env.*` are ignored; `.env.example` is the documented template.
- Runtime settings must not echo raw API keys back to the browser.
- Logs/docs must not contain passwords, cookies, raw tokens, or private API keys.
- CORS is explicit for local frontend origins and credentials.

## Data ownership

- Cart, memory, preferences, and interaction events are account-bound.
- Deleting account memory removes chat history, rolling summary, extracted preferences, recommendations, and behavior events, but not the user account, password hash, sessions, cart, or orders.
