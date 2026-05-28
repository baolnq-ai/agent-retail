# Master Implementation Roadmap - AI Agent Retail

- NgÃ y cáº­p nháº­t: 2026-05-14
- Task name: `master-implementation-roadmap`
- Tráº¡ng thÃ¡i: plan tá»•ng Ä‘á»ƒ triá»ƒn khai production-grade
- Repo hiá»‡n táº¡i: cáº§n xÃ¡c nháº­n vÃ¬ thÆ° má»¥c lÃ m viá»‡c hiá»‡n chÆ°a Ä‘Æ°á»£c nháº­n diá»‡n lÃ  git repository
- Repository target dá»± kiáº¿n: `https://github.com/baolnq-ai/agent-retail.git`

## 1. Má»¥c tiÃªu

XÃ¢y dá»±ng retail chatbot agent production-grade cÃ³ thá»ƒ chat, tÆ° váº¥n, tÃ¬m kiáº¿m, Ä‘á» xuáº¥t, giáº£i thÃ­ch sáº£n pháº©m, quáº£n lÃ½ giá» hÃ ng, há»— trá»£ mua hÃ ng, chá»‰nh sá»­a Ä‘Æ¡n trong giá»›i háº¡n nghiá»‡p vá»¥, tra cá»©u Ä‘Æ¡n vÃ  handoff sang nhÃ¢n viÃªn.

Há»‡ thá»‘ng dÃ¹ng model server ná»™i bá»™ Ä‘Ã£ cÃ³:

- Chat model: `https://replace-with-your-vllm-gateway.example.invalid`, vLLM OpenAI-compatible, model `google/gemma-4-E4B-it`, `max_model_len=128000`.
- Embedding/rerank service: `https://replace-with-your-embed-rerank-gateway.example.invalid`, FastAPI custom.
  - Health: `GET /health`.
  - Embedding: `POST /api/v1/embed` vá»›i body `{ "texts": ["..."] }`.
  - Rerank: `POST /api/v1/rerank` vá»›i body `{ "query": "...", "documents": ["..."] }`.

LÆ°u Ã½ báº¯t buá»™c: pháº£i verify UTF-8 end-to-end báº±ng Node/browser, header `application/json; charset=utf-8`, response decoder UTF-8, database encoding/collation UTF-8. KhÃ´ng káº¿t luáº­n cháº¥t lÆ°á»£ng model chá»‰ tá»« output PowerShell náº¿u console bá»‹ mojibake.

## 2. NguyÃªn táº¯c thiáº¿t káº¿

- Chatbot lÃ  interface; backend lÃ  nÆ¡i quyáº¿t Ä‘á»‹nh nghiá»‡p vá»¥.
- Model khÃ´ng truy cáº­p trá»±c tiáº¿p database, payment, order, inventory.
- Má»i hÃ nh Ä‘á»™ng nháº¡y cáº£m pháº£i cÃ³ confirmation UI vÃ  audit log.
- Frontend render structured blocks, khÃ´ng parse HTML/text tá»± do tá»« model.
- Tá»‘i Æ°u hiá»‡u nÄƒng tá»« Ä‘áº§u: streaming, cache, index, timeout, circuit breaker.
- Production trÆ°á»›c demo: observability, security, test, CI/CD, data quality.
- Náº¿u `testing-skill` chÆ°a tá»“n táº¡i, dÃ¹ng checklist testing trong tá»«ng plan lÃ m chuáº©n táº¡m thá»i cho Ä‘áº¿n khi skill Ä‘Æ°á»£c bá»• sung.
- KhÃ´ng tÃ­nh smoke test, mock-only test hoáº·c fallback path lÃ  pass cho chá»©c nÄƒng production. Má»—i chá»©c nÄƒng chá»‰ pass khi cÃ³ runtime test tháº­t, request HTTP tháº­t tá»›i service Ä‘ang cháº¡y, vÃ  káº¿t quáº£ Ä‘Ãºng 100% theo acceptance criteria Ä‘Ã£ Ä‘á»‹nh nghÄ©a.

## 3. Bá»™ plan chi tiáº¿t

- `plans/archive/initial-roadmap/ai-agent-retail-assistant.md`: Ä‘á»‹nh hÆ°á»›ng production tá»•ng quan, scope, kiáº¿n trÃºc, báº£o máº­t, reliability.
- `plans/platform/model-integration.md`: tÃ­ch há»£p chat model, embedding, rerank, gateway, evaluation.
- `plans/backend/architecture-data.md`: backend modules, database, API, sample data.
- `plans/frontend/uiux-dashboard.md`: customer chat UI, ops console, design system, dashboard.
- `plans/platform/production-hardening.md`: security, performance, observability, CI/CD, release readiness.

## 4. Kiáº¿n trÃºc triá»ƒn khai Ä‘á» xuáº¥t

```txt
agent-retail/
  apps/
    api/                  # Backend API + agent orchestration
    web/                  # Customer chat + ops console
  packages/
    shared/               # Types, schemas, block contracts
    ui/                   # Shared design system náº¿u cáº§n
  infra/
    docker/
    migrations/
  docs/
  plans/
  logs/
```

Stack máº·c Ä‘á»‹nh náº¿u chÆ°a cÃ³ quyáº¿t Ä‘á»‹nh khÃ¡c:

- Backend: NestJS + TypeScript.
- Frontend: Next.js + TypeScript.
- Package manager: pnpm.
- DB chÃ­nh: PostgreSQL 16+.
- Vector: PostgreSQL + pgvector cho MVP.
- Cache/queue/session hot path: Redis.
- Search: PostgreSQL full-text + trigram + pgvector lÃºc Ä‘áº§u; OpenSearch chá»‰ khi catalog lá»›n.
- Object storage: S3-compatible/MinIO náº¿u cáº§n upload/import.
- Observability: OpenTelemetry + structured logs JSON.

## 5. Required resources / prerequisites

Cáº§n chá»‘t trÆ°á»›c khi implementation:

- XÃ¡c nháº­n repo workflow: clone target repo, init git táº¡i thÆ° má»¥c hiá»‡n táº¡i, hay chá»‰ lÃ m local plan.
- XÃ¡c nháº­n backend framework: máº·c Ä‘á»‹nh NestJS náº¿u user khÃ´ng chá»n khÃ¡c.
- XÃ¡c nháº­n frontend framework: máº·c Ä‘á»‹nh Next.js náº¿u user khÃ´ng chá»n khÃ¡c.
- XÃ¡c nháº­n package manager vÃ  Node version.
- XÃ¡c nháº­n payment MVP: máº·c Ä‘á»‹nh mock adapter trÆ°á»›c.
- XÃ¡c nháº­n catalog source: máº·c Ä‘á»‹nh seed data ná»™i bá»™ trÆ°á»›c.
- XÃ¡c nháº­n auth MVP: máº·c Ä‘á»‹nh anonymous session + phone/email khi checkout.
- PostgreSQL local/staging connection.
- Redis local/staging connection.
- Model servers `replace-with-your-vllm-gateway.example.invalid` vÃ  `replace-with-your-embed-rerank-gateway.example.invalid` reachable tá»« mÃ´i trÆ°á»ng cháº¡y app/test.

## 6. Dependencies giá»¯a cÃ¡c plan

```txt
plan-master-implementation-roadmap
  -> plan-backend-architecture-data
       -> plan-model-integration
       -> plan-frontend-uiux-dashboard
  -> plan-production-hardening
```

Thá»© tá»± thá»±c thi khuyáº¿n nghá»‹:

1. Chuáº©n hoÃ¡ repo/workflow.
2. Backend foundation vÃ  shared schemas.
3. ModelGateway.
4. Catalog/search/knowledge.
5. Cart/order/payment.
6. Agent orchestration.
7. Customer frontend.
8. Ops console.
9. Production hardening.

## 7. Quy trÃ¬nh báº¯t buá»™c cho má»i phase

Má»—i phase chá»‰ Ä‘Æ°á»£c xem lÃ  hoÃ n thÃ nh khi Ä‘á»§ cÃ¡c bÆ°á»›c sau:

1. Äá»c skill cáº§n thiáº¿t cá»§a phase.
2. Thá»±c hiá»‡n Ä‘Ãºng scope phase.
3. Cháº¡y testing phase theo `testing-skill` náº¿u cÃ³, náº¿u chÆ°a cÃ³ thÃ¬ dÃ¹ng checklist testing trong plan.
4. Cáº­p nháº­t documentation theo `documentation-skill` náº¿u phase táº¡o/thay Ä‘á»•i hÃ nh vi Ä‘Ã¡ng ghi láº¡i.
5. Ghi log quÃ¡ trÃ¬nh theo `logging-skill`.
6. Chá»‰ chuyá»ƒn phase sau khi pass criteria rÃµ rÃ ng.

## 8. Phase thá»±c hiá»‡n

### Phase 0. Chuáº©n hoÃ¡ repo vÃ  workflow

- Thá»i gian: 0.5 ngÃ y.
- Dependencies: chÆ°a cÃ³.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `plan-skill`, `documentation-skill`, `logging-skill`.
- Implementation:
  - XÃ¡c nháº­n repo/git workflow.
  - Kiá»ƒm tra README, CLAUDE.md, skill files.
  - Chá»‘t package manager, Node version, Docker strategy.
  - Thiáº¿t láº­p cáº¥u trÃºc `apps/api`, `apps/web`, `packages/shared` náº¿u báº¯t Ä‘áº§u code.
- Testing báº¯t buá»™c:
  - Verify skeleton boot Ä‘Æ°á»£c báº±ng runtime process tháº­t.
  - Verify script install/build/test tá»‘i thiá»ƒu cháº¡y Ä‘Æ°á»£c.
  - Gá»­i HTTP request tháº­t tá»›i health endpoint cá»§a app Ä‘ang cháº¡y; chá»‰ pass náº¿u response status/body Ä‘Ãºng.
- Documentation báº¯t buá»™c:
  - Cáº­p nháº­t README hoáº·c docs setup náº¿u cÃ³ thay Ä‘á»•i workflow.
- Logging báº¯t buá»™c:
  - Ghi log phase vÃ o file log task theo `logging-skill`.
- Pass criteria:
  - Repo cÃ³ cáº¥u trÃºc rÃµ.
  - Scripts cÆ¡ báº£n cháº¡y Ä‘Æ°á»£c.
  - KhÃ´ng cÃ³ secret Ä‘Æ°á»£c commit.

### Phase 1. Backend foundation

- Thá»i gian: 1-2 ngÃ y.
- Dependencies: Phase 0.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Config/env validation.
  - Structured logging, request id/correlation id.
  - PostgreSQL connection, migrations.
  - Redis connection.
  - Error format chuáº©n, API versioning, health checks.
  - Auth/session base.
- Testing báº¯t buá»™c:
  - Unit test config/env validation.
  - Integration DB/Redis.
  - Health check dependency status.
- Documentation báº¯t buá»™c:
  - Ghi setup env, health endpoints, module structure.
- Logging báº¯t buá»™c:
  - Ghi log káº¿t quáº£ implementation/test phase.
- Pass criteria:
  - API boot á»•n.
  - Test phase xanh.
  - Health tráº£ Ä‘á»§ dependency status.

### Phase 2. ModelGateway vÃ  AI adapter

- Thá»i gian: 1-1.5 ngÃ y.
- Dependencies: Phase 1, `plans/platform/model-integration.md`.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Adapter vLLM chat server `replace-with-your-vllm-gateway.example.invalid`.
  - Adapter embedding/rerank `replace-with-your-embed-rerank-gateway.example.invalid`.
  - Timeout, retry, circuit breaker.
  - Model health check.
  - UTF-8 verification test.
- Testing báº¯t buá»™c:
  - Contract test chat/embed/rerank.
  - Latency smoke.
  - UTF-8 Vietnamese response check.
- Documentation báº¯t buá»™c:
  - Document model env vars, API contracts, fallback behavior.
- Logging báº¯t buá»™c:
  - Log smoke/eval result, latency, server reachability.
- Pass criteria:
  - Gateway gá»i Ä‘Æ°á»£c chat, embed, rerank.
  - KhÃ´ng cÃ³ code gá»i direct model URL ngoÃ i gateway.

### Phase 3. Catalog/search/knowledge

- Thá»i gian: 2-3 ngÃ y.
- Dependencies: Phase 1, Phase 2 náº¿u dÃ¹ng embedding/rerank.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Product, variant, inventory, category schema.
  - Sample retail data thá»±c táº¿.
  - Search keyword + vector + rerank.
  - FAQ/policy knowledge ingestion.
- Testing báº¯t buá»™c:
  - Migration + seed repeatable.
  - Search relevance tests.
  - Embedding vector stored.
  - Rerank order Ä‘Ãºng trÃªn query máº«u.
- Documentation báº¯t buá»™c:
  - Document schema, seed data, search behavior, ingestion flow.
- Logging báº¯t buá»™c:
  - Log search/eval káº¿t quáº£ phase.
- Pass criteria:
  - Query máº«u tráº£ káº¿t quáº£ tá»‘t, cÃ³ citation/source.

### Phase 4. Cart/order/payment domain

- Thá»i gian: 3-4 ngÃ y.
- Dependencies: Phase 1, Phase 3.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Cart service cÃ³ optimistic locking.
  - Order draft/confirm/edit/cancel state machine.
  - Payment intent mock + adapter interface.
  - Audit log mutation.
- Testing báº¯t buá»™c:
  - Integration cart -> order -> payment mock.
  - Concurrent cart update.
  - Idempotency duplicate order/payment.
  - Edit/cancel policy theo state.
- Documentation báº¯t buá»™c:
  - Document state machine, idempotency, payment mock contract.
- Logging báº¯t buá»™c:
  - Log test vÃ  known risks phase.
- Pass criteria:
  - KhÃ´ng táº¡o trÃ¹ng order/payment.
  - Edit policy Ä‘Ãºng state.
  - Audit mutation Ä‘áº§y Ä‘á»§.

### Phase 5. Agent orchestration

- Thá»i gian: 2-3 ngÃ y.
- Dependencies: Phase 2, Phase 3, Phase 4.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Intent taxonomy.
  - Tool registry/schema.
  - Conversation state.
  - Confirmation workflow.
  - Handoff rule.
  - Prompt templates versioned.
- Testing báº¯t buá»™c:
  - 100 há»™i thoáº¡i máº«u.
  - Tool-call assertion.
  - Prompt injection smoke.
  - Confirmation required cho mutation nháº¡y cáº£m.
- Documentation báº¯t buá»™c:
  - Document tool registry, prompt policy, confirmation rules.
- Logging báº¯t buá»™c:
  - Log eval metrics vÃ  failure cases.
- Pass criteria:
  - Agent khÃ´ng mutate nghiá»‡p vá»¥ náº¿u chÆ°a confirm.
  - Tool calls validate schema.
  - Fallback/handoff hoáº¡t Ä‘á»™ng.

### Phase 6. Customer frontend

- Thá»i gian: 3-4 ngÃ y.
- Dependencies: shared block schema, chat/cart/order APIs.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Chat UI streaming.
  - Message blocks: text, product list, comparison, cart, order, payment, tracking.
  - Cart drawer, confirmation card, quick replies.
  - Theme, typography, animation, responsive.
- Testing báº¯t buá»™c:
  - Component tests.
  - Accessibility checks.
  - Playwright golden path.
  - Manual browser verification for UI changes.
- Documentation báº¯t buá»™c:
  - Document block schema usage and frontend setup.
- Logging báº¯t buá»™c:
  - Log browser test result and issues.
- Pass criteria:
  - KhÃ¡ch cÃ³ thá»ƒ chat -> xem gá»£i Ã½ -> thÃªm giá» -> xÃ¡c nháº­n Ä‘Æ¡n trÃªn desktop/mobile.

### Phase 7. Ops console/dashboard

- Thá»i gian: 2-3 ngÃ y.
- Dependencies: admin APIs, auth/RBAC, conversation/order/payment data.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `frontend-skill`, `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Conversation inbox.
  - Transcript + tool timeline.
  - Customer/cart/order/payment context.
  - Human takeover.
  - KPI dashboard.
- Testing báº¯t buá»™c:
  - RBAC tests.
  - Staff workflow E2E.
  - Dashboard data correctness.
- Documentation báº¯t buá»™c:
  - Document ops workflow and dashboard metrics.
- Logging báº¯t buá»™c:
  - Log staff workflow test and dashboard validation.
- Pass criteria:
  - NhÃ¢n viÃªn xá»­ lÃ½ Ä‘Æ°á»£c case lá»—i/handoff.

### Phase 8. Hardening vÃ  release readiness

- Thá»i gian: 2-4 ngÃ y.
- Dependencies: Phase 1-7.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `push-code-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Security review.
  - Load/performance smoke.
  - Observability dashboard/alerts.
  - CI/CD.
  - README, docs, runbook.
- Testing báº¯t buá»™c:
  - Full regression.
  - Security smoke.
  - Release checklist.
- Documentation báº¯t buá»™c:
  - Runbook, deployment docs, known risks.
- Logging báº¯t buá»™c:
  - Log final validation and release readiness.
- Pass criteria:
  - Sáºµn sÃ ng review/pilot.
  - Chá»‰ push khi repo/git workflow Ä‘Ã£ Ä‘Æ°á»£c user xÃ¡c nháº­n vÃ  tuÃ¢n thá»§ `push-code-skill`.

## 9. KPI ká»¹ thuáº­t

- Chat API simple p95 < 1500ms náº¿u khÃ´ng cáº§n model lá»›n.
- Agent turn cÃ³ model + tool p95 < 6000ms.
- Product search p95 < 300ms trÃªn sample catalog.
- Cart calculation p95 < 500ms.
- Tool call success rate > 99% á»Ÿ luá»“ng core.
- Payment/order idempotency 100% trong test duplicate.
- E2E golden path pass 100% trÆ°á»›c release.

## 10. Definition of Done tá»•ng thá»ƒ

Task tá»•ng chá»‰ hoÃ n thÃ nh khi:

- Táº¥t cáº£ phase pass criteria hoÃ n táº¥t.
- Backend lint/typecheck/unit/integration pass.
- Backend runtime tests pass báº±ng HTTP request tháº­t tá»›i service Ä‘ang cháº¡y; khÃ´ng tÃ­nh smoke/fallback lÃ  pass.
- Frontend lint/typecheck/component/E2E pass.
- Frontend runtime tests pass trÃªn browser tháº­t hoáº·c Playwright vá»›i app Ä‘ang cháº¡y.
- AI eval Ä‘áº¡t threshold Ä‘Ã£ chá»‘t báº±ng request tháº­t tá»›i model gateway khi model server reachable; fallback chá»‰ Ä‘Æ°á»£c test nhÆ° tÃ¬nh huá»‘ng lá»—i, khÃ´ng thay tháº¿ happy path.
- UTF-8 Vietnamese verified end-to-end.
- Documentation Ä‘Æ°á»£c cáº­p nháº­t theo `documentation-skill`.
- Logs implementation Ä‘Æ°á»£c ghi theo `logging-skill`.
- Security smoke pass, khÃ´ng commit secret.
- README/setup/runbook Ä‘á»§ Ä‘á»ƒ ngÆ°á»i khÃ¡c cháº¡y dá»± Ã¡n.
- Push chá»‰ thá»±c hiá»‡n sau khi user xÃ¡c nháº­n repo/git workflow vÃ  theo `push-code-skill`.

## 11. Open questions cáº§n chá»‘t trÆ°á»›c khi code

- DÃ¹ng NestJS hay Fastify cho backend? Khuyáº¿n nghá»‹ NestJS.
- DÃ¹ng Next.js hay Vite cho frontend? Khuyáº¿n nghá»‹ Next.js.
- Package manager vÃ  Node version lÃ  gÃ¬? Khuyáº¿n nghá»‹ pnpm + Node LTS.
- Payment tháº­t sáº½ lÃ  VNPay, MoMo, PayOS, Stripe hay mock trÆ°á»›c? Khuyáº¿n nghá»‹ mock trÆ°á»›c.
- Catalog nguá»“n tháº­t lÃ  Excel, API, ERP, hay seed data ná»™i bá»™? Khuyáº¿n nghá»‹ seed data trÆ°á»›c.
- CÃ³ cáº§n Ä‘Äƒng nháº­p khÃ¡ch hÃ ng ngay MVP khÃ´ng, hay anonymous session + phone/email á»Ÿ checkout? Khuyáº¿n nghá»‹ anonymous session.
- CÃ³ cáº§n clone/push trá»±c tiáº¿p repo GitHub trong session nÃ y khÃ´ng?
- CÃ³ cáº§n táº¡o `testing-skill` riÃªng khÃ´ng, hay dÃ¹ng checklist testing trong plan cho MVP?

## 12. Rá»§i ro chÃ­nh

- ChÆ°a chá»‘t repo/git workflow nhÆ°ng plan yÃªu cáº§u push -> pháº£i há»i trÆ°á»›c khi push/init/clone.
- `testing-skill` chÆ°a tá»“n táº¡i -> dÃ¹ng checklist táº¡m thá»i hoáº·c táº¡o skill bá»• sung.
- Model server ná»™i bá»™ downtime -> gateway cáº§n health check, circuit breaker, fallback/handoff.
- UTF-8 lá»—i -> test qua Node/browser, DB encoding UTF-8.
- Over-engineering quÃ¡ sá»›m -> giá»¯ modular monolith, chá»‰ tÃ¡ch service khi cÃ³ nhu cáº§u thá»±c.
