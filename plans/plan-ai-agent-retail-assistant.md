# Production-Grade Plan Cho Retail Chatbot Agent

- Ngày cập nhật: 2026-05-14
- Task name: `ai-agent-retail-assistant`
- Trạng thái: production-grade planning trước khi implementation

## 1. Mục tiêu sản phẩm

Xây dựng chatbot agent cho doanh nghiệp retail có thể phục vụ khách hàng trong luồng mua sắm thực tế:

- Chat tự nhiên với khách về nhu cầu, ngân sách, sở thích, ngữ cảnh sử dụng.
- Tư vấn, so sánh, giải thích sản phẩm dựa trên dữ liệu đáng tin cậy.
- Tìm kiếm sản phẩm theo tên, danh mục, thuộc tính, giá, tồn kho, khuyến mãi.
- Đề xuất sản phẩm phù hợp, sản phẩm thay thế, combo, upsell/cross-sell.
- Quản lý giỏ hàng: thêm, sửa số lượng, xoá, áp mã giảm giá, tính phí ship.
- Hỗ trợ chỉnh sửa đơn hàng trong giới hạn nghiệp vụ.
- Tạo đơn nháp, xác nhận đơn, tạo link thanh toán hoặc chuyển sang checkout.
- Tra cứu trạng thái đơn hàng, thanh toán, vận chuyển, đổi trả.
- Handoff sang nhân viên khi confidence thấp, khiếu nại, payment lỗi hoặc tác vụ vượt quyền.

Mục tiêu không phải demo chatbot trả lời hay, mà là retail agent có thể vận hành production, có kiểm soát hành động, audit, observability, hiệu năng và bảo mật.

## 2. Phạm vi hệ thống

### In scope

- Web chat frontend cho khách hàng.
- Admin/Ops console cho nhân viên vận hành.
- Backend API cho chat, session, product, recommendation, cart, order, payment, support.
- Agent orchestration layer dùng LLM qua API/tool calling.
- Retrieval layer cho FAQ, policy, product knowledge.
- Integration adapter cho catalog, inventory, order, payment, shipping.
- Observability, audit log, rate limit, security hardening, CI/CD readiness.

### Out of scope trong source này

- Không train model.
- Không host model inference trực tiếp trong repo.
- Không lưu model weight.
- Không xây recommendation ML pipeline phức tạp ở MVP nếu chưa có dữ liệu sạch.
- Không cho model gọi trực tiếp database, payment gateway, ERP, OMS.

## 3. Dependencies

- Plan tổng điều phối: `plans/plan-master-implementation-roadmap.md`.
- Backend/data chi tiết: `plans/plan-backend-architecture-data.md`.
- Model chi tiết: `plans/plan-model-integration.md`.
- Frontend/UI chi tiết: `plans/plan-frontend-uiux-dashboard.md`.
- Hardening/release: `plans/plan-production-hardening.md`.

## 4. Required resources / prerequisites

- Repo/git workflow cần xác nhận trước khi code/push.
- Backend framework mặc định: NestJS + TypeScript nếu chưa chốt khác.
- Frontend framework mặc định: Next.js + TypeScript nếu chưa chốt khác.
- PostgreSQL + pgvector.
- Redis.
- Model servers:
  - Chat: `https://replace-with-your-vllm-gateway.example.invalid`.
  - Embed/rerank: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- Payment MVP mặc định: mock adapter.
- Catalog MVP mặc định: seed data nội bộ.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong các plan làm chuẩn tạm thời.

## 5. Kiến trúc production đề xuất

Khuyến nghị dùng modular monolith production-ready cho giai đoạn đầu, tách module rõ theo domain.

Lý do:

- Ít overhead vận hành hơn microservices.
- Dễ tối ưu latency end-to-end.
- Dễ enforce transaction boundary cho cart/order/payment.
- Vẫn có thể tách service sau nếu traffic hoặc team size tăng.

Module backend chính:

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

Frontend chính:

- Customer Chat UI.
- Agent Ops Console.

## 6. Model strategy

Source này chỉ gọi model qua adapter/gateway. Không host model trong repo.

Required capabilities:

1. Primary chat/reasoning model.
2. Fast routing/intent classification.
3. Embedding model.
4. Reranker model.
5. Moderation/safety classifier hoặc rule-based policy.
6. Optional vision model phase sau.
7. Optional personalization/ranking model phase sau.

ModelGateway bắt buộc có:

- Chuẩn hoá request/response.
- Timeout, retry có kiểm soát, circuit breaker.
- Model fallback theo intent.
- Prompt versioning.
- Token/cost tracking nếu provider hỗ trợ.
- Cache phù hợp.
- PII redaction nếu policy yêu cầu.
- Không log raw PII/payment data.

## 7. Luồng agent chuẩn production

Message processing flow:

1. Nhận message từ frontend.
2. Xác thực session/customer, kiểm tra rate limit.
3. Lưu inbound message với correlation id.
4. Chạy safety/input policy check.
5. Classify intent nhanh.
6. Load conversation state tối thiểu cần thiết.
7. Gọi retrieval/search/tool theo intent.
8. Gọi primary model với context đã kiểm soát.
9. Validate tool call output và response schema.
10. Nếu action nhạy cảm: yêu cầu xác nhận khách.
11. Ghi audit log/tool log.
12. Trả response dạng structured blocks cho frontend.

Backend mới quyết định:

- Giá cuối cùng.
- Tồn kho cuối cùng.
- Voucher hợp lệ.
- Khách có được sửa/huỷ đơn không.
- Trạng thái thanh toán.
- Trạng thái giao hàng.
- Khi nào cần xác nhận/handoff.

## 8. Data model tối thiểu

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

Tất cả entity quan trọng cần optimistic locking/version để tránh sửa đè giỏ hàng/đơn hàng.

## 9. Hiệu năng và reliability targets

Latency targets:

- First response perceived: dưới 1.5-2.5s cho câu hỏi đơn giản.
- Product search API: p95 dưới 300ms với index tốt.
- Cart calculation: p95 dưới 500ms.
- Retrieval + rerank: p95 dưới 800ms.
- Full agent turn có tool: p95 dưới 4-6s tuỳ model provider.

Reliability requirements:

- Streaming response cho chat.
- Intent routing trước để tránh gọi model lớn khi không cần.
- Cache product/policy/retrieval phù hợp.
- Circuit breaker cho model provider, payment, inventory, shipping.
- Timeout rõ cho từng dependency.
- Idempotency cho mọi mutation.
- Payload minimization khi gửi context cho model.
- Prompt/context compression cho hội thoại dài.

## 10. Bảo mật production

Nguyên tắc:

- Zero direct model-to-database/payment.
- Least privilege cho service accounts.
- RBAC cho staff console.
- Mọi mutation nhạy cảm cần confirmation token hoặc explicit customer confirmation.
- Không lưu thẻ thanh toán.
- Không log PII/payment sensitive data.

AI-specific security:

- Prompt injection detection cho user input và retrieved documents.
- Retrieval content phải có source trust level.
- Không đưa secret, internal policy nhạy cảm, raw system prompt vào model context.
- Tool allowlist theo intent và state.
- Tool output validation trước khi đưa lại model.
- Sensitive actions luôn cần confirmation.
- Handoff khi user yêu cầu bypass policy, refund bất thường, tranh chấp, payment mismatch.

## 11. Observability

Logs structured tối thiểu có:

- `correlationId`
- `conversationId`
- `customerIdHash`
- `intent`
- `toolName`
- `latencyMs`
- `modelProvider/modelName`
- `tokenUsage/cost` nếu có
- `errorCode`
- `orderId/paymentId` masked nếu cần

Metrics tối thiểu:

- Chat request rate, error rate, p50/p95/p99 latency.
- Model latency, timeout, fallback rate, token cost nếu có.
- Retrieval hit rate, no-result rate, rerank latency.
- Tool success/failure rate.
- Product search zero-result rate.
- Cart add/update failure rate.
- Order conversion funnel.
- Payment success/failure/webhook retry.
- Handoff rate và SLA nhân viên.

## 12. Testing strategy bắt buộc

Backend:

- Unit test domain service: cart, order, payment, policy.
- Integration test với database thật hoặc test container.
- Contract test cho tool schema và API response.
- Idempotency test cho order/payment.
- Webhook replay/duplicate/out-of-order test.
- Security test: auth, RBAC, rate limit, validation.

Frontend:

- Component test cho chat, product card, cart drawer, order confirmation.
- E2E golden paths.
- Accessibility test.
- Mobile responsive test.
- XSS test với message/product content.
- Manual browser verification cho UI changes.

AI/Agent evaluation:

- Bộ 100-300 câu hội thoại mẫu theo intent.
- Tool-call assertion.
- Retrieval evaluation.
- Hallucination check.
- Red-team prompt injection cơ bản.
- Regression eval khi đổi prompt/model.
- Latency/cost benchmark.

## 13. Phase thực hiện tổng quan

### Phase 0. Chốt nghiệp vụ và SLA

- Thời gian: 0.5 ngày.
- Skills cần đọc trước: `plan-skill`, `documentation-skill`, `logging-skill`.
- Implementation:
  - Chốt kênh đầu tiên: web chat.
  - Chốt catalog/inventory/order/payment source.
  - Chốt chính sách order edit/cancel/refund.
  - Chốt KPI: conversion, answer accuracy, p95 latency, handoff rate, payment success.
  - Chốt model provider/gateway strategy.
- Testing bắt buộc:
  - Review checklist scope/SLA/policy/model capability.
- Documentation bắt buộc:
  - Ghi quyết định nghiệp vụ vào docs/plan liên quan.
- Logging bắt buộc:
  - Log quyết định và open questions còn lại.
- Pass criteria:
  - Có scope, SLA, policy và model capability matrix.

### Phase 1. Backend foundation

- Thời gian: 1-2 ngày.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Setup modular monolith.
  - Auth/session, config, logging, validation, error handling.
  - Database schema và migration base.
  - Observability base.
  - ModelGateway interface với mock provider trước nếu cần.
- Testing bắt buộc:
  - Health check, structured log, test pipeline, DB migration.
- Documentation bắt buộc:
  - Backend setup docs.
- Logging bắt buộc:
  - Log implementation/test result.
- Pass criteria:
  - Health check, structured log, test pipeline, DB migration chạy được.

### Phase 2. Catalog/search/knowledge

- Thời gian: 2-3 ngày.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Product APIs.
  - Hybrid search.
  - Knowledge ingestion.
  - Retrieval + citation.
- Testing bắt buộc:
  - Search p95 trên sample data.
  - Retrieval eval threshold.
- Documentation bắt buộc:
  - Search/knowledge docs.
- Logging bắt buộc:
  - Log eval and latency result.
- Pass criteria:
  - Search/retrieval đạt threshold đã chốt.

### Phase 3. Cart/order/payment domain

- Thời gian: 3-4 ngày.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Cart service.
  - Order draft/confirm.
  - Order edit policy.
  - Payment intent/link adapter.
  - Webhook verification/idempotency.
- Testing bắt buộc:
  - Integration cart -> order -> payment sandbox/mock.
  - Duplicate/replay tests.
- Documentation bắt buộc:
  - State machine/payment docs.
- Logging bắt buộc:
  - Log integration result.
- Pass criteria:
  - Cart -> order -> payment flow pass.

### Phase 4. Agent orchestration

- Thời gian: 2-3 ngày.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Intent router.
  - Tool registry/schema.
  - Confirmation workflow.
  - Guardrails/handoff.
  - Prompt versioning và evaluation suite.
- Testing bắt buộc:
  - Tool-call assertion, prompt injection smoke, confirmation policy.
- Documentation bắt buộc:
  - Agent/prompt/tool docs.
- Logging bắt buộc:
  - Log eval result.
- Pass criteria:
  - Agent không tự ý mutate order/payment nếu chưa xác nhận.

### Phase 5. Frontend customer chat

- Thời gian: 3-4 ngày.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Chat UI streaming.
  - Product cards.
  - Cart drawer.
  - Order confirmation/payment card.
  - Order tracking.
- Testing bắt buộc:
  - E2E golden path desktop/mobile.
  - Manual browser verification.
- Documentation bắt buộc:
  - Frontend setup/block docs.
- Logging bắt buộc:
  - Log browser test result.
- Pass criteria:
  - Customer golden path pass.

### Phase 6. Ops console

- Thời gian: 2-3 ngày.
- Skills cần đọc trước: `frontend-skill`, `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Conversation list/detail.
  - Tool call timeline.
  - Order/payment context.
  - Human takeover.
  - KPI dashboard tối thiểu.
- Testing bắt buộc:
  - Staff workflow, RBAC, dashboard correctness.
- Documentation bắt buộc:
  - Ops docs.
- Logging bắt buộc:
  - Log staff workflow result.
- Pass criteria:
  - Nhân viên can thiệp hội thoại và xử lý case lỗi.

### Phase 7. Hardening production

- Thời gian: 2-4 ngày.
- Skills cần đọc trước: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `push-code-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Security review.
  - Load/performance test.
  - AI red-team.
  - Observability dashboard/alert.
  - Runbook vận hành.
- Testing bắt buộc:
  - Full regression, security smoke, performance smoke.
- Documentation bắt buộc:
  - Runbook, known risks, release checklist.
- Logging bắt buộc:
  - Log final readiness.
- Pass criteria:
  - Release checklist xanh, known risks được ghi rõ.

## 14. Backlog ưu tiên

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
- Order edit policy đầy đủ.
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

- Tất cả phase pass criteria hoàn tất.
- Backend deterministic cho nghiệp vụ retail.
- Agent orchestration có tool schema, confirmation và guardrails.
- Frontend customer golden path pass.
- Ops console handoff workflow pass.
- Security/performance/observability baseline pass.
- Documentation và logs được cập nhật.
- Push chỉ thực hiện sau khi repo/git workflow được user xác nhận và theo `push-code-skill`.

## 16. Rủi ro chính

- Dữ liệu sản phẩm bẩn -> schema bắt buộc, validation ingestion, dashboard data quality.
- LLM hallucination -> retrieval citation, tool-only facts, fallback/handoff.
- Latency cao -> routing model nhỏ, cache, streaming, timeout, provider fallback.
- Tạo/sửa đơn sai -> confirmation token, state machine, audit, optimistic locking.
- Payment lỗi/trùng callback -> webhook signature, idempotency, transaction lock, reconciliation.
- Prompt injection -> trust boundary, document sanitization, tool allowlist, policy classifier.
- Chi phí model tăng -> token budget, cache, model routing, cost alert nếu dùng provider paid.
- `testing-skill` chưa có -> dùng checklist testing trong plan hoặc bổ sung skill trước khi code.
