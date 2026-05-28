# Production-Grade Plan Cho Retail Chatbot Agent

- NgÃ y cáº­p nháº­t: 2026-05-14
- Task name: `ai-agent-retail-assistant`
- Tráº¡ng thÃ¡i: production-grade planning trÆ°á»›c khi implementation

## 1. Má»¥c tiÃªu sáº£n pháº©m

XÃ¢y dá»±ng chatbot agent cho doanh nghiá»‡p retail cÃ³ thá»ƒ phá»¥c vá»¥ khÃ¡ch hÃ ng trong luá»“ng mua sáº¯m thá»±c táº¿:

- Chat tá»± nhiÃªn vá»›i khÃ¡ch vá» nhu cáº§u, ngÃ¢n sÃ¡ch, sá»Ÿ thÃ­ch, ngá»¯ cáº£nh sá»­ dá»¥ng.
- TÆ° váº¥n, so sÃ¡nh, giáº£i thÃ­ch sáº£n pháº©m dá»±a trÃªn dá»¯ liá»‡u Ä‘Ã¡ng tin cáº­y.
- TÃ¬m kiáº¿m sáº£n pháº©m theo tÃªn, danh má»¥c, thuá»™c tÃ­nh, giÃ¡, tá»“n kho, khuyáº¿n mÃ£i.
- Äá» xuáº¥t sáº£n pháº©m phÃ¹ há»£p, sáº£n pháº©m thay tháº¿, combo, upsell/cross-sell.
- Quáº£n lÃ½ giá» hÃ ng: thÃªm, sá»­a sá»‘ lÆ°á»£ng, xoÃ¡, Ã¡p mÃ£ giáº£m giÃ¡, tÃ­nh phÃ­ ship.
- Há»— trá»£ chá»‰nh sá»­a Ä‘Æ¡n hÃ ng trong giá»›i háº¡n nghiá»‡p vá»¥.
- Táº¡o Ä‘Æ¡n nhÃ¡p, xÃ¡c nháº­n Ä‘Æ¡n, táº¡o link thanh toÃ¡n hoáº·c chuyá»ƒn sang checkout.
- Tra cá»©u tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng, thanh toÃ¡n, váº­n chuyá»ƒn, Ä‘á»•i tráº£.
- Handoff sang nhÃ¢n viÃªn khi confidence tháº¥p, khiáº¿u náº¡i, payment lá»—i hoáº·c tÃ¡c vá»¥ vÆ°á»£t quyá»n.

Má»¥c tiÃªu khÃ´ng pháº£i demo chatbot tráº£ lá»i hay, mÃ  lÃ  retail agent cÃ³ thá»ƒ váº­n hÃ nh production, cÃ³ kiá»ƒm soÃ¡t hÃ nh Ä‘á»™ng, audit, observability, hiá»‡u nÄƒng vÃ  báº£o máº­t.

## 2. Pháº¡m vi há»‡ thá»‘ng

### In scope

- Web chat frontend cho khÃ¡ch hÃ ng.
- Admin/Ops console cho nhÃ¢n viÃªn váº­n hÃ nh.
- Backend API cho chat, session, product, recommendation, cart, order, payment, support.
- Agent orchestration layer dÃ¹ng LLM qua API/tool calling.
- Retrieval layer cho FAQ, policy, product knowledge.
- Integration adapter cho catalog, inventory, order, payment, shipping.
- Observability, audit log, rate limit, security hardening, CI/CD readiness.

### Out of scope trong source nÃ y

- KhÃ´ng train model.
- KhÃ´ng host model inference trá»±c tiáº¿p trong repo.
- KhÃ´ng lÆ°u model weight.
- KhÃ´ng xÃ¢y recommendation ML pipeline phá»©c táº¡p á»Ÿ MVP náº¿u chÆ°a cÃ³ dá»¯ liá»‡u sáº¡ch.
- KhÃ´ng cho model gá»i trá»±c tiáº¿p database, payment gateway, ERP, OMS.

## 3. Dependencies

- Plan tá»•ng Ä‘iá»u phá»‘i: `plans/archive/initial-roadmap/master-implementation-roadmap.md`.
- Backend/data chi tiáº¿t: `plans/backend/architecture-data.md`.
- Model chi tiáº¿t: `plans/platform/model-integration.md`.
- Frontend/UI chi tiáº¿t: `plans/frontend/uiux-dashboard.md`.
- Hardening/release: `plans/platform/production-hardening.md`.

## 4. Required resources / prerequisites

- Repo/git workflow cáº§n xÃ¡c nháº­n trÆ°á»›c khi code/push.
- Backend framework máº·c Ä‘á»‹nh: NestJS + TypeScript náº¿u chÆ°a chá»‘t khÃ¡c.
- Frontend framework máº·c Ä‘á»‹nh: Next.js + TypeScript náº¿u chÆ°a chá»‘t khÃ¡c.
- PostgreSQL + pgvector.
- Redis.
- Model servers:
  - Chat: `https://replace-with-your-vllm-gateway.example.invalid`.
  - Embed/rerank: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- Payment MVP máº·c Ä‘á»‹nh: mock adapter.
- Catalog MVP máº·c Ä‘á»‹nh: seed data ná»™i bá»™.
- Náº¿u `testing-skill` chÆ°a tá»“n táº¡i, dÃ¹ng checklist testing trong cÃ¡c plan lÃ m chuáº©n táº¡m thá»i.

## 5. Kiáº¿n trÃºc production Ä‘á» xuáº¥t

Khuyáº¿n nghá»‹ dÃ¹ng modular monolith production-ready cho giai Ä‘oáº¡n Ä‘áº§u, tÃ¡ch module rÃµ theo domain.

LÃ½ do:

- Ãt overhead váº­n hÃ nh hÆ¡n microservices.
- Dá»… tá»‘i Æ°u latency end-to-end.
- Dá»… enforce transaction boundary cho cart/order/payment.
- Váº«n cÃ³ thá»ƒ tÃ¡ch service sau náº¿u traffic hoáº·c team size tÄƒng.

Module backend chÃ­nh:

- `Auth & Identity`
- `Conversation`
- `Agent Orchestrator`
- `Model Gateway`
- `Knowledge Retrieval`
- `Catalog`
- `Recommendation`
- `Cart`
- `Order`
- `Payment`
- `Shipping/Fulfillment Adapter`
- `Human Handoff`
- `Audit & Compliance`
- `Observability`

Frontend chÃ­nh:

- Customer Chat UI.
- Agent Ops Console.

## 6. Model strategy

Source nÃ y chá»‰ gá»i model qua adapter/gateway. KhÃ´ng host model trong repo.

Required capabilities:

1. Primary chat/reasoning model.
2. Fast routing/intent classification.
3. Embedding model.
4. Reranker model.
5. Moderation/safety classifier hoáº·c rule-based policy.
6. Optional vision model phase sau.
7. Optional personalization/ranking model phase sau.

ModelGateway báº¯t buá»™c cÃ³:

- Chuáº©n hoÃ¡ request/response.
- Timeout, retry cÃ³ kiá»ƒm soÃ¡t, circuit breaker.
- Model fallback theo intent.
- Prompt versioning.
- Token/cost tracking náº¿u provider há»— trá»£.
- Cache phÃ¹ há»£p.
- PII redaction náº¿u policy yÃªu cáº§u.
- KhÃ´ng log raw PII/payment data.

## 7. Luá»“ng agent chuáº©n production

Message processing flow:

1. Nháº­n message tá»« frontend.
2. XÃ¡c thá»±c session/customer, kiá»ƒm tra rate limit.
3. LÆ°u inbound message vá»›i correlation id.
4. Cháº¡y safety/input policy check.
5. Classify intent nhanh.
6. Load conversation state tá»‘i thiá»ƒu cáº§n thiáº¿t.
7. Gá»i retrieval/search/tool theo intent.
8. Gá»i primary model vá»›i context Ä‘Ã£ kiá»ƒm soÃ¡t.
9. Validate tool call output vÃ  response schema.
10. Náº¿u action nháº¡y cáº£m: yÃªu cáº§u xÃ¡c nháº­n khÃ¡ch.
11. Ghi audit log/tool log.
12. Tráº£ response dáº¡ng structured blocks cho frontend.

Backend má»›i quyáº¿t Ä‘á»‹nh:

- GiÃ¡ cuá»‘i cÃ¹ng.
- Tá»“n kho cuá»‘i cÃ¹ng.
- Voucher há»£p lá»‡.
- KhÃ¡ch cÃ³ Ä‘Æ°á»£c sá»­a/huá»· Ä‘Æ¡n khÃ´ng.
- Tráº¡ng thÃ¡i thanh toÃ¡n.
- Tráº¡ng thÃ¡i giao hÃ ng.
- Khi nÃ o cáº§n xÃ¡c nháº­n/handoff.

## 8. Data model tá»‘i thiá»ƒu

- `Customer`
- `ConversationSession`
- `Message`
- `ToolCall`
- `Product`
- `ProductVariant`
- `Inventory`
- `Cart`
- `OrderDraft`
- `Order`
- `PaymentIntent`
- `KnowledgeDocument`
- `AuditEvent`

Táº¥t cáº£ entity quan trá»ng cáº§n optimistic locking/version Ä‘á»ƒ trÃ¡nh sá»­a Ä‘Ã¨ giá» hÃ ng/Ä‘Æ¡n hÃ ng.

## 9. Hiá»‡u nÄƒng vÃ  reliability targets

Latency targets:

- First response perceived: dÆ°á»›i 1.5-2.5s cho cÃ¢u há»i Ä‘Æ¡n giáº£n.
- Product search API: p95 dÆ°á»›i 300ms vá»›i index tá»‘t.
- Cart calculation: p95 dÆ°á»›i 500ms.
- Retrieval + rerank: p95 dÆ°á»›i 800ms.
- Full agent turn cÃ³ tool: p95 dÆ°á»›i 4-6s tuá»³ model provider.

Reliability requirements:

- Streaming response cho chat.
- Intent routing trÆ°á»›c Ä‘á»ƒ trÃ¡nh gá»i model lá»›n khi khÃ´ng cáº§n.
- Cache product/policy/retrieval phÃ¹ há»£p.
- Circuit breaker cho model provider, payment, inventory, shipping.
- Timeout rÃµ cho tá»«ng dependency.
- Idempotency cho má»i mutation.
- Payload minimization khi gá»­i context cho model.
- Prompt/context compression cho há»™i thoáº¡i dÃ i.

## 10. Báº£o máº­t production

NguyÃªn táº¯c:

- Zero direct model-to-database/payment.
- Least privilege cho service accounts.
- RBAC cho staff console.
- Má»i mutation nháº¡y cáº£m cáº§n confirmation token hoáº·c explicit customer confirmation.
- KhÃ´ng lÆ°u tháº» thanh toÃ¡n.
- KhÃ´ng log PII/payment sensitive data.

AI-specific security:

- Prompt injection detection cho user input vÃ  retrieved documents.
- Retrieval content pháº£i cÃ³ source trust level.
- KhÃ´ng Ä‘Æ°a secret, internal policy nháº¡y cáº£m, raw system prompt vÃ o model context.
- Tool allowlist theo intent vÃ  state.
- Tool output validation trÆ°á»›c khi Ä‘Æ°a láº¡i model.
- Sensitive actions luÃ´n cáº§n confirmation.
- Handoff khi user yÃªu cáº§u bypass policy, refund báº¥t thÆ°á»ng, tranh cháº¥p, payment mismatch.

## 11. Observability

Logs structured tá»‘i thiá»ƒu cÃ³:

- `correlationId`
- `conversationId`
- `customerIdHash`
- `intent`
- `toolName`
- `latencyMs`
- `modelProvider/modelName`
- `tokenUsage/cost` náº¿u cÃ³
- `errorCode`
- `orderId/paymentId` masked náº¿u cáº§n

Metrics tá»‘i thiá»ƒu:

- Chat request rate, error rate, p50/p95/p99 latency.
- Model latency, timeout, fallback rate, token cost náº¿u cÃ³.
- Retrieval hit rate, no-result rate, rerank latency.
- Tool success/failure rate.
- Product search zero-result rate.
- Cart add/update failure rate.
- Order conversion funnel.
- Payment success/failure/webhook retry.
- Handoff rate vÃ  SLA nhÃ¢n viÃªn.

## 12. Testing strategy báº¯t buá»™c

Backend:

- Unit test domain service: cart, order, payment, policy.
- Integration test vá»›i database tháº­t hoáº·c test container.
- Contract test cho tool schema vÃ  API response.
- Idempotency test cho order/payment.
- Webhook replay/duplicate/out-of-order test.
- Security test: auth, RBAC, rate limit, validation.

Frontend:

- Component test cho chat, product card, cart drawer, order confirmation.
- E2E golden paths.
- Accessibility test.
- Mobile responsive test.
- XSS test vá»›i message/product content.
- Manual browser verification cho UI changes.

AI/Agent evaluation:

- Bá»™ 100-300 cÃ¢u há»™i thoáº¡i máº«u theo intent.
- Tool-call assertion.
- Retrieval evaluation.
- Hallucination check.
- Red-team prompt injection cÆ¡ báº£n.
- Regression eval khi Ä‘á»•i prompt/model.
- Latency/cost benchmark.

## 13. Phase thá»±c hiá»‡n tá»•ng quan

### Phase 0. Chá»‘t nghiá»‡p vá»¥ vÃ  SLA

- Thá»i gian: 0.5 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `plan-skill`, `documentation-skill`, `logging-skill`.
- Implementation:
  - Chá»‘t kÃªnh Ä‘áº§u tiÃªn: web chat.
  - Chá»‘t catalog/inventory/order/payment source.
  - Chá»‘t chÃ­nh sÃ¡ch order edit/cancel/refund.
  - Chá»‘t KPI: conversion, answer accuracy, p95 latency, handoff rate, payment success.
  - Chá»‘t model provider/gateway strategy.
- Testing báº¯t buá»™c:
  - Review checklist scope/SLA/policy/model capability.
- Documentation báº¯t buá»™c:
  - Ghi quyáº¿t Ä‘á»‹nh nghiá»‡p vá»¥ vÃ o docs/plan liÃªn quan.
- Logging báº¯t buá»™c:
  - Log quyáº¿t Ä‘á»‹nh vÃ  open questions cÃ²n láº¡i.
- Pass criteria:
  - CÃ³ scope, SLA, policy vÃ  model capability matrix.

### Phase 1. Backend foundation

- Thá»i gian: 1-2 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Setup modular monolith.
  - Auth/session, config, logging, validation, error handling.
  - Database schema vÃ  migration base.
  - Observability base.
  - ModelGateway interface vá»›i mock provider trÆ°á»›c náº¿u cáº§n.
- Testing báº¯t buá»™c:
  - Health check, structured log, test pipeline, DB migration.
- Documentation báº¯t buá»™c:
  - Backend setup docs.
- Logging báº¯t buá»™c:
  - Log implementation/test result.
- Pass criteria:
  - Health check, structured log, test pipeline, DB migration cháº¡y Ä‘Æ°á»£c.

### Phase 2. Catalog/search/knowledge

- Thá»i gian: 2-3 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Product APIs.
  - Hybrid search.
  - Knowledge ingestion.
  - Retrieval + citation.
- Testing báº¯t buá»™c:
  - Search p95 trÃªn sample data.
  - Retrieval eval threshold.
- Documentation báº¯t buá»™c:
  - Search/knowledge docs.
- Logging báº¯t buá»™c:
  - Log eval and latency result.
- Pass criteria:
  - Search/retrieval Ä‘áº¡t threshold Ä‘Ã£ chá»‘t.

### Phase 3. Cart/order/payment domain

- Thá»i gian: 3-4 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Cart service.
  - Order draft/confirm.
  - Order edit policy.
  - Payment intent/link adapter.
  - Webhook verification/idempotency.
- Testing báº¯t buá»™c:
  - Integration cart -> order -> payment sandbox/mock.
  - Duplicate/replay tests.
- Documentation báº¯t buá»™c:
  - State machine/payment docs.
- Logging báº¯t buá»™c:
  - Log integration result.
- Pass criteria:
  - Cart -> order -> payment flow pass.

### Phase 4. Agent orchestration

- Thá»i gian: 2-3 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Intent router.
  - Tool registry/schema.
  - Confirmation workflow.
  - Guardrails/handoff.
  - Prompt versioning vÃ  evaluation suite.
- Testing báº¯t buá»™c:
  - Tool-call assertion, prompt injection smoke, confirmation policy.
- Documentation báº¯t buá»™c:
  - Agent/prompt/tool docs.
- Logging báº¯t buá»™c:
  - Log eval result.
- Pass criteria:
  - Agent khÃ´ng tá»± Ã½ mutate order/payment náº¿u chÆ°a xÃ¡c nháº­n.

### Phase 5. Frontend customer chat

- Thá»i gian: 3-4 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Chat UI streaming.
  - Product cards.
  - Cart drawer.
  - Order confirmation/payment card.
  - Order tracking.
- Testing báº¯t buá»™c:
  - E2E golden path desktop/mobile.
  - Manual browser verification.
- Documentation báº¯t buá»™c:
  - Frontend setup/block docs.
- Logging báº¯t buá»™c:
  - Log browser test result.
- Pass criteria:
  - Customer golden path pass.

### Phase 6. Ops console

- Thá»i gian: 2-3 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `frontend-skill`, `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Conversation list/detail.
  - Tool call timeline.
  - Order/payment context.
  - Human takeover.
  - KPI dashboard tá»‘i thiá»ƒu.
- Testing báº¯t buá»™c:
  - Staff workflow, RBAC, dashboard correctness.
- Documentation báº¯t buá»™c:
  - Ops docs.
- Logging báº¯t buá»™c:
  - Log staff workflow result.
- Pass criteria:
  - NhÃ¢n viÃªn can thiá»‡p há»™i thoáº¡i vÃ  xá»­ lÃ½ case lá»—i.

### Phase 7. Hardening production

- Thá»i gian: 2-4 ngÃ y.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `push-code-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Security review.
  - Load/performance test.
  - AI red-team.
  - Observability dashboard/alert.
  - Runbook váº­n hÃ nh.
- Testing báº¯t buá»™c:
  - Full regression, security smoke, performance smoke.
- Documentation báº¯t buá»™c:
  - Runbook, known risks, release checklist.
- Logging báº¯t buá»™c:
  - Log final readiness.
- Pass criteria:
  - Release checklist xanh, known risks Ä‘Æ°á»£c ghi rÃµ.

## 14. Backlog Æ°u tiÃªn

P0:

- ModelGateway.
- Tool schema validation.
- Product search/detail.
- Cart/order/payment idempotency.
- Confirmation flow.
- Webhook verification.
- Structured logging + correlation id.
- Basic chat UI + cart/order cards.
- E2E golden path.

P1:

- Hybrid retrieval + reranker.
- Ops console handoff.
- Order edit policy Ä‘áº§y Ä‘á»§.
- Prompt/model eval suite.
- Performance cache.
- RBAC/staff audit.

P2:

- Personalization.
- Omnichannel.
- Vision/image search.
- Campaign engine.
- Advanced analytics/A-B testing.

## 15. Definition of Done

- Táº¥t cáº£ phase pass criteria hoÃ n táº¥t.
- Backend deterministic cho nghiá»‡p vá»¥ retail.
- Agent orchestration cÃ³ tool schema, confirmation vÃ  guardrails.
- Frontend customer golden path pass.
- Ops console handoff workflow pass.
- Security/performance/observability baseline pass.
- Documentation vÃ  logs Ä‘Æ°á»£c cáº­p nháº­t.
- Push chá»‰ thá»±c hiá»‡n sau khi repo/git workflow Ä‘Æ°á»£c user xÃ¡c nháº­n vÃ  theo `push-code-skill`.

## 16. Rá»§i ro chÃ­nh

- Dá»¯ liá»‡u sáº£n pháº©m báº©n -> schema báº¯t buá»™c, validation ingestion, dashboard data quality.
- LLM hallucination -> retrieval citation, tool-only facts, fallback/handoff.
- Latency cao -> routing model nhá», cache, streaming, timeout, provider fallback.
- Táº¡o/sá»­a Ä‘Æ¡n sai -> confirmation token, state machine, audit, optimistic locking.
- Payment lá»—i/trÃ¹ng callback -> webhook signature, idempotency, transaction lock, reconciliation.
- Prompt injection -> trust boundary, document sanitization, tool allowlist, policy classifier.
- Chi phÃ­ model tÄƒng -> token budget, cache, model routing, cost alert náº¿u dÃ¹ng provider paid.
- `testing-skill` chÆ°a cÃ³ -> dÃ¹ng checklist testing trong plan hoáº·c bá»• sung skill trÆ°á»›c khi code.
