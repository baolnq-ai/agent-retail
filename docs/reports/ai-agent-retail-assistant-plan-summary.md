# TÃ³m Táº¯t Bá»™ Plan Production-Grade Cho AI Agent Retail

- Thá»i gian cáº­p nháº­t: 2026-05-14
- GitHub target: `https://github.com/baolnq-ai/agent-retail.git`
- Má»¥c tiÃªu: láº­p bá»™ plan chuáº©n chá»‰nh Ä‘á»ƒ triá»ƒn khai retail chatbot agent cÃ³ backend/frontend/dashboard Ä‘áº§y Ä‘á»§, dÃ¹ng model server ná»™i bá»™, tá»‘i Æ°u hiá»‡u nÄƒng, báº£o máº­t vÃ  váº­n hÃ nh production.

## Model server Ä‘Ã£ kiá»ƒm tra

### Chat model

- URL: `https://replace-with-your-vllm-gateway.example.invalid`
- API: vLLM OpenAI-compatible.
- Model: `google/gemma-4-E4B-it`
- Endpoint OK:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
- Context: `max_model_len=128000`

### Embedding/rerank

- URL: `https://replace-with-your-embed-rerank-gateway.example.invalid`
- API: FastAPI custom.
- Endpoint OK:
  - `GET /health`
  - `GET /openapi.json`
  - `POST /api/v1/embed`
  - `POST /api/v1/rerank`

Ghi chÃº: test qua PowerShell tháº¥y output tiáº¿ng Viá»‡t cÃ³ dáº¥u hiá»‡u mojibake; khi code cáº§n verify UTF-8 báº±ng Node/browser client.

## Bá»™ plan Ä‘Ã£ táº¡o

- `plans/archive/initial-roadmap/master-implementation-roadmap.md` â€” plan tá»•ng quy trÃ¬nh triá»ƒn khai theo phase.
- `plans/platform/model-integration.md` â€” tÃ­ch há»£p chat model, embedding, rerank qua ModelGateway.
- `plans/backend/architecture-data.md` â€” backend modules, database, API, sample data thá»±c táº¿.
- `plans/frontend/uiux-dashboard.md` â€” UI/UX customer chat, ops console, dashboard, theme, animation, typography.
- `plans/platform/production-hardening.md` â€” security, performance, observability, testing, CI/CD, release readiness.
- `plans/archive/initial-roadmap/ai-agent-retail-assistant.md` â€” plan production tá»•ng quan ban Ä‘áº§u.

## Kiáº¿n trÃºc khuyáº¿n nghá»‹

```txt
agent-retail/
  apps/
    api/       # Backend API + agent orchestration
    web/       # Customer chat + ops console
  packages/
    shared/    # Types, schemas, message block contracts
    ui/        # Shared design system náº¿u cáº§n
  infra/
  docs/
  plans/
  logs/
```

## Stack khuyáº¿n nghá»‹

- Backend: NestJS + TypeScript.
- Frontend: Next.js + TypeScript.
- DB: PostgreSQL.
- Vector: pgvector.
- Cache/queue: Redis.
- Search: PostgreSQL full-text/trigram + pgvector; OpenSearch phase sau náº¿u catalog lá»›n.
- UI: Tailwind + shadcn/ui + Radix.
- Animation: Motion for React.
- Testing: unit, integration, contract, Playwright E2E, AI eval.

## Frontend design direction

- KhÃ´ng lÃ m chatbot text Ä‘Æ¡n giáº£n.
- LÃ m commerce journey UI: need discovery -> product discovery -> comparison -> cart -> order confirmation -> payment -> tracking/support.
- Backend tráº£ structured blocks; frontend render blocks.
- Customer UI cáº§n product cards, cart drawer, order confirmation card, payment card, tracking card, quick replies.
- Ops console cáº§n dashboard, conversation inbox, transcript, tool timeline, customer/cart/order/payment context, takeover chat.

## Database/service direction

- PostgreSQL lÃ  source of truth.
- pgvector cho knowledge/product embeddings.
- Redis cho cache, session hot path, rate limit, locks, queue.
- Object storage cho product images/import/attachments náº¿u cáº§n.
- KhÃ´ng dÃ¹ng Redis lÃ m source of truth cho cart/order.

## Quy trÃ¬nh triá»ƒn khai

1. Chuáº©n hoÃ¡ repo vÃ  workflow.
2. Backend foundation.
3. ModelGateway.
4. Catalog/search/knowledge.
5. Cart/order/payment.
6. Agent orchestration.
7. Customer frontend.
8. Ops console/dashboard.
9. Production hardening.

## CÃ¡c Ä‘iá»ƒm cáº§n chá»‘t trÆ°á»›c khi code

- Backend framework cuá»‘i: NestJS hay Fastify.
- Frontend framework cuá»‘i: Next.js hay Vite/React.
- Payment tháº­t dÃ¹ng provider nÃ o hay mock trÆ°á»›c.
- Catalog nguá»“n tháº­t tá»« Excel/API/ERP hay seed data trÆ°á»›c.
- CÃ³ cáº§n login khÃ¡ch hÃ ng ngay MVP khÃ´ng.
- CÃ³ muá»‘n tÃ´i clone/push trá»±c tiáº¿p vÃ o GitHub repo target trong session nÃ y khÃ´ng.