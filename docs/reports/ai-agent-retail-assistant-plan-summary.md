# Tóm Tắt Bộ Plan Production-Grade Cho AI Agent Retail

- Thời gian cập nhật: 2026-05-14
- GitHub target: `https://github.com/baolnq-ai/agent-retail.git`
- Mục tiêu: lập bộ plan chuẩn chỉnh để triển khai retail chatbot agent có backend/frontend/dashboard đầy đủ, dùng model server nội bộ, tối ưu hiệu năng, bảo mật và vận hành production.

## Model server đã kiểm tra

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

Ghi chú: test qua PowerShell thấy output tiếng Việt có dấu hiệu mojibake; khi code cần verify UTF-8 bằng Node/browser client.

## Bộ plan đã tạo

- `plans/archive/initial-roadmap/master-implementation-roadmap.md` — plan tổng quy trình triển khai theo phase.
- `plans/platform/model-integration.md` — tích hợp chat model, embedding, rerank qua ModelGateway.
- `plans/backend/architecture-data.md` — backend modules, database, API, sample data thực tế.
- `plans/frontend/uiux-dashboard.md` — UI/UX customer chat, ops console, dashboard, theme, animation, typography.
- `plans/platform/production-hardening.md` — security, performance, observability, testing, CI/CD, release readiness.
- `plans/archive/initial-roadmap/ai-agent-retail-assistant.md` — plan production tổng quan ban đầu.

## Kiến trúc khuyến nghị

```txt
agent-retail/
  apps/
    api/       # Backend API + agent orchestration
    web/       # Customer chat + ops console
  packages/
    shared/    # Types, schemas, message block contracts
    ui/        # Shared design system nếu cần
  infra/
  docs/
  plans/
  logs/
```

## Stack khuyến nghị

- Backend: NestJS + TypeScript.
- Frontend: Next.js + TypeScript.
- DB: PostgreSQL.
- Vector: pgvector.
- Cache/queue: Redis.
- Search: PostgreSQL full-text/trigram + pgvector; OpenSearch phase sau nếu catalog lớn.
- UI: Tailwind + shadcn/ui + Radix.
- Animation: Motion for React.
- Testing: unit, integration, contract, Playwright E2E, AI eval.

## Frontend design direction

- Không làm chatbot text đơn giản.
- Làm commerce journey UI: need discovery -> product discovery -> comparison -> cart -> order confirmation -> payment -> tracking/support.
- Backend trả structured blocks; frontend render blocks.
- Customer UI cần product cards, cart drawer, order confirmation card, payment card, tracking card, quick replies.
- Ops console cần dashboard, conversation inbox, transcript, tool timeline, customer/cart/order/payment context, takeover chat.

## Database/service direction

- PostgreSQL là source of truth.
- pgvector cho knowledge/product embeddings.
- Redis cho cache, session hot path, rate limit, locks, queue.
- Object storage cho product images/import/attachments nếu cần.
- Không dùng Redis làm source of truth cho cart/order.

## Quy trình triển khai

1. Chuẩn hoá repo và workflow.
2. Backend foundation.
3. ModelGateway.
4. Catalog/search/knowledge.
5. Cart/order/payment.
6. Agent orchestration.
7. Customer frontend.
8. Ops console/dashboard.
9. Production hardening.

## Các điểm cần chốt trước khi code

- Backend framework cuối: NestJS hay Fastify.
- Frontend framework cuối: Next.js hay Vite/React.
- Payment thật dùng provider nào hay mock trước.
- Catalog nguồn thật từ Excel/API/ERP hay seed data trước.
- Có cần login khách hàng ngay MVP không.
- Có muốn tôi clone/push trực tiếp vào GitHub repo target trong session này không.