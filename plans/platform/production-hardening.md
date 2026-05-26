# Plan Production Hardening - AI Agent Retail

- Ngày cập nhật: 2026-05-14
- Task name: `production-hardening`
- Trạng thái: plan con cho bảo mật, hiệu năng, observability, testing, CI/CD và release readiness

## 1. Mục tiêu

Chuẩn hoá bảo mật, hiệu năng, observability, testing, CI/CD và release readiness cho retail chatbot agent trước khi pilot/release.

## 2. Dependencies

- Phụ thuộc: backend APIs, frontend flows, ModelGateway, cart/order/payment, ops console.
- Thực hiện chính sau `plans/archive/initial-roadmap/master-implementation-roadmap.md` Phase 1-7.
- Block cho: push/review/pilot production.

## 3. Required resources / prerequisites

- App backend/frontend đã chạy được.
- Test DB/Redis hoặc staging environment.
- Model servers reachable hoặc mock mode rõ ràng.
- CI provider/repo workflow đã chốt.
- Secret management strategy đã chốt.
- Payment sandbox/mock đã chốt.
- Observability backend đã chọn.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong plan này.

## 4. Security hardening

### API security

- Auth/session strategy rõ ràng.
- Staff RBAC cho ops console.
- Rate limit theo IP/session/customer/endpoint.
- CORS allowlist.
- CSRF protection nếu dùng cookie.
- Input validation bằng schema cho mọi endpoint.
- Output encoding, không render HTML từ model.
- Secure headers.
- Secret chỉ ở secret manager/env, không commit.

### AI security

- Model không gọi trực tiếp DB/payment/order.
- Tool allowlist theo intent/state.
- Validate tool arguments và outputs.
- Prompt injection detection cho user input và retrieved content.
- Không đưa secret/system prompt/internal config vào model context.
- PII redaction trước khi gửi model nếu policy yêu cầu.
- Confirmation bắt buộc cho create/edit/cancel order, create payment.

### Payment/order security

- Payment webhook signature verification.
- Replay protection bằng provider event id + timestamp tolerance.
- Idempotency key cho order/payment mutation.
- Transaction lock khi confirm order/create payment.
- Audit event cho mọi mutation nhạy cảm.

## 5. Performance hardening

Latency targets:

- Product search p95 < 300ms trên MVP dataset.
- Cart calculation p95 < 500ms.
- Knowledge retrieval + rerank p95 < 800ms.
- Agent turn có model p95 < 6000ms.
- Ops dashboard overview p95 < 1000ms.

Techniques:

- Streaming response cho chat.
- Intent routing trước khi gọi primary model.
- Cache product detail/policy retrieval/model answer phù hợp.
- Redis rate limit/cache/locks.
- PostgreSQL indexes cho hot queries.
- pgvector index cho embeddings.
- Rerank top-k nhỏ, không rerank quá nhiều docs.
- Timeout từng dependency.
- Circuit breaker cho model/payment/inventory.
- Background jobs cho ingestion/analytics/summarization.
- Frontend virtualize transcript/table.
- Lazy load dashboard charts.

## 6. Observability

### Logs

Structured JSON logs với:

- `timestamp`
- `level`
- `service`
- `correlationId`
- `conversationId`
- `customerIdHash`
- `intent`
- `toolName`
- `latencyMs`
- `modelId`
- `errorCode`

Không log raw PII, raw payment payload, raw prompt đầy đủ nếu có dữ liệu nhạy cảm.

### Metrics

- Request rate/error rate/latency.
- Chat turn latency.
- Model latency/token usage/fallback rate.
- Embedding/rerank latency/error.
- Tool call success/failure.
- Search zero-result rate.
- Cart/order/payment conversion funnel.
- Payment webhook failures.
- Handoff rate/SLA.
- Dashboard query latency.

### Tracing

Trace flow:

```txt
chat request
  -> safety
  -> intent classifier
  -> retrieval/search
  -> tool call
  -> model call
  -> response block rendering
```

### Alerts

- Model server down/unhealthy.
- Embedding/rerank server down.
- Payment webhook failure spike.
- Order confirmation error.
- p95 latency vượt threshold.
- Token/model cost spike nếu dùng paid provider sau.
- Handoff backlog.

## 7. Testing strategy

### Backend

- Unit tests domain services.
- Integration DB/Redis.
- Contract tests API/tool/model gateway.
- Idempotency/concurrency tests.
- Payment webhook replay/out-of-order tests.
- Security tests auth/RBAC/rate limit/input validation.

### Frontend

- Component tests.
- Accessibility tests.
- Playwright E2E core flows.
- Mobile responsive tests.
- Visual regression nếu có Storybook.
- XSS tests cho message/product content.
- Manual browser verification for UI changes.

### AI evaluation

- Intent dataset.
- Tool selection assertions.
- Retrieval quality tests.
- Rerank relevance tests.
- Hallucination checks.
- Prompt injection red-team.
- UTF-8 Vietnamese tests.
- Latency benchmarks với model servers `replace-with-your-vllm-gateway.example.invalid` và `replace-with-your-embed-rerank-gateway.example.invalid`.

## 8. CI/CD

Pipeline tối thiểu:

1. Install dependencies.
2. Lint.
3. Typecheck.
4. Unit tests.
5. Integration tests with test DB/Redis.
6. Frontend build.
7. Backend build.
8. Security/dependency audit.
9. Migration check.
10. E2E smoke nếu environment có sẵn.

Deploy requirements:

- Separate env: local, staging, production.
- `.env.example` đầy đủ nhưng không chứa secret.
- Migrations có rollback/forward fix plan.
- Rolling deploy hoặc blue/green.
- Health check dependency-aware.
- Prompt/model config versioned.

## 9. Release checklist

- All tests pass.
- Seed data usable.
- Model health OK.
- UTF-8 verified.
- Payment mock/sandbox OK.
- Dashboard alert rules configured.
- Admin RBAC verified.
- Rate limits configured.
- Logs redacted.
- Runbook written.
- Known risks documented.
- Repo/git workflow confirmed before push.

## 10. Phase thực hiện

### Phase 1. Security baseline

- Thời gian: 1 ngày.
- Dependencies: auth/session, APIs, ops console routes.
- Skills cần đọc trước: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Auth/session checks.
  - RBAC.
  - Validation.
  - CORS/CSRF.
  - Rate limit.
  - Secure headers.
- Testing bắt buộc:
  - Security smoke tests.
  - Auth/RBAC negative tests.
  - Validation rejection tests.
- Documentation bắt buộc:
  - Document security settings and expected env.
- Logging bắt buộc:
  - Log security test result and known gaps.
- Pass criteria:
  - Security smoke tests pass.

### Phase 2. Observability baseline

- Thời gian: 1 ngày.
- Dependencies: backend request pipeline, model gateway, tool calls.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Structured logs.
  - Metrics.
  - Traces.
  - Dashboard basics.
- Testing bắt buộc:
  - Trace một chat turn đầy đủ.
  - Verify log redaction.
  - Verify correlation id propagation.
- Documentation bắt buộc:
  - Document log fields, metric names, trace flow.
- Logging bắt buộc:
  - Log observability validation.
- Pass criteria:
  - Trace một chat turn đầy đủ và không lộ PII/raw payment.

### Phase 3. Performance tuning

- Thời gian: 1-2 ngày.
- Dependencies: core APIs and UI flows.
- Skills cần đọc trước: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Indexes.
  - Cache.
  - Query tuning.
  - Frontend performance fixes.
- Testing bắt buộc:
  - Smoke load.
  - p95 latency measurement.
  - Frontend Lighthouse/Core Web Vitals smoke.
- Documentation bắt buộc:
  - Document performance targets and result.
- Logging bắt buộc:
  - Log latency before/after and remaining bottlenecks.
- Pass criteria:
  - p95 đạt target trên smoke load đã chốt.

### Phase 4. AI reliability eval

- Thời gian: 1-2 ngày.
- Dependencies: ModelGateway, agent orchestration, retrieval.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Eval suite.
  - Red-team prompts.
  - Prompt/model tuning.
- Testing bắt buộc:
  - Intent/tool/retrieval eval.
  - Prompt injection tests.
  - Hallucination checks.
  - UTF-8 tests.
- Documentation bắt buộc:
  - Document eval dataset, thresholds, known model limits.
- Logging bắt buộc:
  - Log eval summary and failed examples.
- Pass criteria:
  - Đạt threshold intent/tool/retrieval đã chốt.

### Phase 5. Release readiness

- Thời gian: 0.5-1 ngày.
- Dependencies: Phase 1-4.
- Skills cần đọc trước: `documentation-skill`, `logging-skill`, `push-code-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - CI/CD finalization.
  - Docs/runbook.
  - Final checklist.
  - Prepare push/review only after user confirms repo workflow.
- Testing bắt buộc:
  - Full regression.
  - Build backend/frontend.
  - Migration check.
  - E2E smoke if environment available.
- Documentation bắt buộc:
  - Runbook, deployment notes, known risks.
- Logging bắt buộc:
  - Log final release readiness.
- Pass criteria:
  - Sẵn sàng pilot/review, không còn blocker P0.

## 11. Definition of Done

- Security baseline pass.
- Observability có logs/metrics/traces và redaction.
- Performance targets đạt trên smoke load.
- AI eval đạt threshold.
- CI/CD pipeline tối thiểu có đủ lint/typecheck/test/build/audit.
- Runbook và known risks documented.
- Push chỉ thực hiện sau khi user xác nhận và theo `push-code-skill`.

## 12. Rủi ro

- Full permission local không thay thế security product; app vẫn phải có guardrails.
- Model nội bộ down làm chat giảm chất lượng -> fallback deterministic/handoff.
- Dashboard query nặng -> aggregate tables/materialized views nếu cần.
- Logs chứa PII -> redaction middleware bắt buộc.
- Push nhầm repo/branch -> phải xác nhận repo/git workflow trước khi push.
