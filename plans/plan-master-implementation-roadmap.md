# Master Implementation Roadmap - AI Agent Retail

- Ngày cập nhật: 2026-05-14
- Task name: `master-implementation-roadmap`
- Trạng thái: plan tổng để triển khai production-grade
- Repo hiện tại: cần xác nhận vì thư mục làm việc hiện chưa được nhận diện là git repository
- Repository target dự kiến: `https://github.com/baolnq-ai/agent-retail.git`

## 1. Mục tiêu

Xây dựng retail chatbot agent production-grade có thể chat, tư vấn, tìm kiếm, đề xuất, giải thích sản phẩm, quản lý giỏ hàng, hỗ trợ mua hàng, chỉnh sửa đơn trong giới hạn nghiệp vụ, tra cứu đơn và handoff sang nhân viên.

Hệ thống dùng model server nội bộ đã có:

- Chat model: `https://replace-with-your-vllm-gateway.example.invalid`, vLLM OpenAI-compatible, model `google/gemma-4-E4B-it`, `max_model_len=128000`.
- Embedding/rerank service: `https://replace-with-your-embed-rerank-gateway.example.invalid`, FastAPI custom.
  - Health: `GET /health`.
  - Embedding: `POST /api/v1/embed` với body `{ "texts": ["..."] }`.
  - Rerank: `POST /api/v1/rerank` với body `{ "query": "...", "documents": ["..."] }`.

Lưu ý bắt buộc: phải verify UTF-8 end-to-end bằng Node/browser, header `application/json; charset=utf-8`, response decoder UTF-8, database encoding/collation UTF-8. Không kết luận chất lượng model chỉ từ output PowerShell nếu console bị mojibake.

## 2. Nguyên tắc thiết kế

- Chatbot là interface; backend là nơi quyết định nghiệp vụ.
- Model không truy cập trực tiếp database, payment, order, inventory.
- Mọi hành động nhạy cảm phải có confirmation UI và audit log.
- Frontend render structured blocks, không parse HTML/text tự do từ model.
- Tối ưu hiệu năng từ đầu: streaming, cache, index, timeout, circuit breaker.
- Production trước demo: observability, security, test, CI/CD, data quality.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong từng plan làm chuẩn tạm thời cho đến khi skill được bổ sung.
- Không tính smoke test, mock-only test hoặc fallback path là pass cho chức năng production. Mỗi chức năng chỉ pass khi có runtime test thật, request HTTP thật tới service đang chạy, và kết quả đúng 100% theo acceptance criteria đã định nghĩa.

## 3. Bộ plan chi tiết

- `plans/plan-ai-agent-retail-assistant.md`: định hướng production tổng quan, scope, kiến trúc, bảo mật, reliability.
- `plans/plan-model-integration.md`: tích hợp chat model, embedding, rerank, gateway, evaluation.
- `plans/plan-backend-architecture-data.md`: backend modules, database, API, sample data.
- `plans/plan-frontend-uiux-dashboard.md`: customer chat UI, ops console, design system, dashboard.
- `plans/plan-production-hardening.md`: security, performance, observability, CI/CD, release readiness.

## 4. Kiến trúc triển khai đề xuất

```txt
agent-retail/
  apps/
    api/                  # Backend API + agent orchestration
    web/                  # Customer chat + ops console
  packages/
    shared/               # Types, schemas, block contracts
    ui/                   # Shared design system nếu cần
  infra/
    docker/
    migrations/
  docs/
  plans/
  logs/
```

Stack mặc định nếu chưa có quyết định khác:

- Backend: NestJS + TypeScript.
- Frontend: Next.js + TypeScript.
- Package manager: pnpm.
- DB chính: PostgreSQL 16+.
- Vector: PostgreSQL + pgvector cho MVP.
- Cache/queue/session hot path: Redis.
- Search: PostgreSQL full-text + trigram + pgvector lúc đầu; OpenSearch chỉ khi catalog lớn.
- Object storage: S3-compatible/MinIO nếu cần upload/import.
- Observability: OpenTelemetry + structured logs JSON.

## 5. Required resources / prerequisites

Cần chốt trước khi implementation:

- Xác nhận repo workflow: clone target repo, init git tại thư mục hiện tại, hay chỉ làm local plan.
- Xác nhận backend framework: mặc định NestJS nếu user không chọn khác.
- Xác nhận frontend framework: mặc định Next.js nếu user không chọn khác.
- Xác nhận package manager và Node version.
- Xác nhận payment MVP: mặc định mock adapter trước.
- Xác nhận catalog source: mặc định seed data nội bộ trước.
- Xác nhận auth MVP: mặc định anonymous session + phone/email khi checkout.
- PostgreSQL local/staging connection.
- Redis local/staging connection.
- Model servers `replace-with-your-vllm-gateway.example.invalid` và `replace-with-your-embed-rerank-gateway.example.invalid` reachable từ môi trường chạy app/test.

## 6. Dependencies giữa các plan

```txt
plan-master-implementation-roadmap
  -> plan-backend-architecture-data
       -> plan-model-integration
       -> plan-frontend-uiux-dashboard
  -> plan-production-hardening
```

Thứ tự thực thi khuyến nghị:

1. Chuẩn hoá repo/workflow.
2. Backend foundation và shared schemas.
3. ModelGateway.
4. Catalog/search/knowledge.
5. Cart/order/payment.
6. Agent orchestration.
7. Customer frontend.
8. Ops console.
9. Production hardening.

## 7. Quy trình bắt buộc cho mọi phase

Mỗi phase chỉ được xem là hoàn thành khi đủ các bước sau:

1. Đọc skill cần thiết của phase.
2. Thực hiện đúng scope phase.
3. Chạy testing phase theo `testing-skill` nếu có, nếu chưa có thì dùng checklist testing trong plan.
4. Cập nhật documentation theo `documentation-skill` nếu phase tạo/thay đổi hành vi đáng ghi lại.
5. Ghi log quá trình theo `logging-skill`.
6. Chỉ chuyển phase sau khi pass criteria rõ ràng.

## 8. Phase thực hiện

### Phase 0. Chuẩn hoá repo và workflow

- Thời gian: 0.5 ngày.
- Dependencies: chưa có.
- Skills cần đọc trước: `plan-skill`, `documentation-skill`, `logging-skill`.
- Implementation:
  - Xác nhận repo/git workflow.
  - Kiểm tra README, CLAUDE.md, skill files.
  - Chốt package manager, Node version, Docker strategy.
  - Thiết lập cấu trúc `apps/api`, `apps/web`, `packages/shared` nếu bắt đầu code.
- Testing bắt buộc:
  - Verify skeleton boot được bằng runtime process thật.
  - Verify script install/build/test tối thiểu chạy được.
  - Gửi HTTP request thật tới health endpoint của app đang chạy; chỉ pass nếu response status/body đúng.
- Documentation bắt buộc:
  - Cập nhật README hoặc docs setup nếu có thay đổi workflow.
- Logging bắt buộc:
  - Ghi log phase vào file log task theo `logging-skill`.
- Pass criteria:
  - Repo có cấu trúc rõ.
  - Scripts cơ bản chạy được.
  - Không có secret được commit.

### Phase 1. Backend foundation

- Thời gian: 1-2 ngày.
- Dependencies: Phase 0.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Config/env validation.
  - Structured logging, request id/correlation id.
  - PostgreSQL connection, migrations.
  - Redis connection.
  - Error format chuẩn, API versioning, health checks.
  - Auth/session base.
- Testing bắt buộc:
  - Unit test config/env validation.
  - Integration DB/Redis.
  - Health check dependency status.
- Documentation bắt buộc:
  - Ghi setup env, health endpoints, module structure.
- Logging bắt buộc:
  - Ghi log kết quả implementation/test phase.
- Pass criteria:
  - API boot ổn.
  - Test phase xanh.
  - Health trả đủ dependency status.

### Phase 2. ModelGateway và AI adapter

- Thời gian: 1-1.5 ngày.
- Dependencies: Phase 1, `plans/plan-model-integration.md`.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Adapter vLLM chat server `replace-with-your-vllm-gateway.example.invalid`.
  - Adapter embedding/rerank `replace-with-your-embed-rerank-gateway.example.invalid`.
  - Timeout, retry, circuit breaker.
  - Model health check.
  - UTF-8 verification test.
- Testing bắt buộc:
  - Contract test chat/embed/rerank.
  - Latency smoke.
  - UTF-8 Vietnamese response check.
- Documentation bắt buộc:
  - Document model env vars, API contracts, fallback behavior.
- Logging bắt buộc:
  - Log smoke/eval result, latency, server reachability.
- Pass criteria:
  - Gateway gọi được chat, embed, rerank.
  - Không có code gọi direct model URL ngoài gateway.

### Phase 3. Catalog/search/knowledge

- Thời gian: 2-3 ngày.
- Dependencies: Phase 1, Phase 2 nếu dùng embedding/rerank.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Product, variant, inventory, category schema.
  - Sample retail data thực tế.
  - Search keyword + vector + rerank.
  - FAQ/policy knowledge ingestion.
- Testing bắt buộc:
  - Migration + seed repeatable.
  - Search relevance tests.
  - Embedding vector stored.
  - Rerank order đúng trên query mẫu.
- Documentation bắt buộc:
  - Document schema, seed data, search behavior, ingestion flow.
- Logging bắt buộc:
  - Log search/eval kết quả phase.
- Pass criteria:
  - Query mẫu trả kết quả tốt, có citation/source.

### Phase 4. Cart/order/payment domain

- Thời gian: 3-4 ngày.
- Dependencies: Phase 1, Phase 3.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Cart service có optimistic locking.
  - Order draft/confirm/edit/cancel state machine.
  - Payment intent mock + adapter interface.
  - Audit log mutation.
- Testing bắt buộc:
  - Integration cart -> order -> payment mock.
  - Concurrent cart update.
  - Idempotency duplicate order/payment.
  - Edit/cancel policy theo state.
- Documentation bắt buộc:
  - Document state machine, idempotency, payment mock contract.
- Logging bắt buộc:
  - Log test và known risks phase.
- Pass criteria:
  - Không tạo trùng order/payment.
  - Edit policy đúng state.
  - Audit mutation đầy đủ.

### Phase 5. Agent orchestration

- Thời gian: 2-3 ngày.
- Dependencies: Phase 2, Phase 3, Phase 4.
- Skills cần đọc trước: `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Intent taxonomy.
  - Tool registry/schema.
  - Conversation state.
  - Confirmation workflow.
  - Handoff rule.
  - Prompt templates versioned.
- Testing bắt buộc:
  - 100 hội thoại mẫu.
  - Tool-call assertion.
  - Prompt injection smoke.
  - Confirmation required cho mutation nhạy cảm.
- Documentation bắt buộc:
  - Document tool registry, prompt policy, confirmation rules.
- Logging bắt buộc:
  - Log eval metrics và failure cases.
- Pass criteria:
  - Agent không mutate nghiệp vụ nếu chưa confirm.
  - Tool calls validate schema.
  - Fallback/handoff hoạt động.

### Phase 6. Customer frontend

- Thời gian: 3-4 ngày.
- Dependencies: shared block schema, chat/cart/order APIs.
- Skills cần đọc trước: `frontend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Chat UI streaming.
  - Message blocks: text, product list, comparison, cart, order, payment, tracking.
  - Cart drawer, confirmation card, quick replies.
  - Theme, typography, animation, responsive.
- Testing bắt buộc:
  - Component tests.
  - Accessibility checks.
  - Playwright golden path.
  - Manual browser verification for UI changes.
- Documentation bắt buộc:
  - Document block schema usage and frontend setup.
- Logging bắt buộc:
  - Log browser test result and issues.
- Pass criteria:
  - Khách có thể chat -> xem gợi ý -> thêm giỏ -> xác nhận đơn trên desktop/mobile.

### Phase 7. Ops console/dashboard

- Thời gian: 2-3 ngày.
- Dependencies: admin APIs, auth/RBAC, conversation/order/payment data.
- Skills cần đọc trước: `frontend-skill`, `backend-skill`, `documentation-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Conversation inbox.
  - Transcript + tool timeline.
  - Customer/cart/order/payment context.
  - Human takeover.
  - KPI dashboard.
- Testing bắt buộc:
  - RBAC tests.
  - Staff workflow E2E.
  - Dashboard data correctness.
- Documentation bắt buộc:
  - Document ops workflow and dashboard metrics.
- Logging bắt buộc:
  - Log staff workflow test and dashboard validation.
- Pass criteria:
  - Nhân viên xử lý được case lỗi/handoff.

### Phase 8. Hardening và release readiness

- Thời gian: 2-4 ngày.
- Dependencies: Phase 1-7.
- Skills cần đọc trước: `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `push-code-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Security review.
  - Load/performance smoke.
  - Observability dashboard/alerts.
  - CI/CD.
  - README, docs, runbook.
- Testing bắt buộc:
  - Full regression.
  - Security smoke.
  - Release checklist.
- Documentation bắt buộc:
  - Runbook, deployment docs, known risks.
- Logging bắt buộc:
  - Log final validation and release readiness.
- Pass criteria:
  - Sẵn sàng review/pilot.
  - Chỉ push khi repo/git workflow đã được user xác nhận và tuân thủ `push-code-skill`.

## 9. KPI kỹ thuật

- Chat API simple p95 < 1500ms nếu không cần model lớn.
- Agent turn có model + tool p95 < 6000ms.
- Product search p95 < 300ms trên sample catalog.
- Cart calculation p95 < 500ms.
- Tool call success rate > 99% ở luồng core.
- Payment/order idempotency 100% trong test duplicate.
- E2E golden path pass 100% trước release.

## 10. Definition of Done tổng thể

Task tổng chỉ hoàn thành khi:

- Tất cả phase pass criteria hoàn tất.
- Backend lint/typecheck/unit/integration pass.
- Backend runtime tests pass bằng HTTP request thật tới service đang chạy; không tính smoke/fallback là pass.
- Frontend lint/typecheck/component/E2E pass.
- Frontend runtime tests pass trên browser thật hoặc Playwright với app đang chạy.
- AI eval đạt threshold đã chốt bằng request thật tới model gateway khi model server reachable; fallback chỉ được test như tình huống lỗi, không thay thế happy path.
- UTF-8 Vietnamese verified end-to-end.
- Documentation được cập nhật theo `documentation-skill`.
- Logs implementation được ghi theo `logging-skill`.
- Security smoke pass, không commit secret.
- README/setup/runbook đủ để người khác chạy dự án.
- Push chỉ thực hiện sau khi user xác nhận repo/git workflow và theo `push-code-skill`.

## 11. Open questions cần chốt trước khi code

- Dùng NestJS hay Fastify cho backend? Khuyến nghị NestJS.
- Dùng Next.js hay Vite cho frontend? Khuyến nghị Next.js.
- Package manager và Node version là gì? Khuyến nghị pnpm + Node LTS.
- Payment thật sẽ là VNPay, MoMo, PayOS, Stripe hay mock trước? Khuyến nghị mock trước.
- Catalog nguồn thật là Excel, API, ERP, hay seed data nội bộ? Khuyến nghị seed data trước.
- Có cần đăng nhập khách hàng ngay MVP không, hay anonymous session + phone/email ở checkout? Khuyến nghị anonymous session.
- Có cần clone/push trực tiếp repo GitHub trong session này không?
- Có cần tạo `testing-skill` riêng không, hay dùng checklist testing trong plan cho MVP?

## 12. Rủi ro chính

- Chưa chốt repo/git workflow nhưng plan yêu cầu push -> phải hỏi trước khi push/init/clone.
- `testing-skill` chưa tồn tại -> dùng checklist tạm thời hoặc tạo skill bổ sung.
- Model server nội bộ downtime -> gateway cần health check, circuit breaker, fallback/handoff.
- UTF-8 lỗi -> test qua Node/browser, DB encoding UTF-8.
- Over-engineering quá sớm -> giữ modular monolith, chỉ tách service khi có nhu cầu thực.
