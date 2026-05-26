# Plan Full Functional Web Completion

- Ngày cập nhật: 2026-05-15
- Task name: `full-functional-web-completion`
- Mục tiêu: hoàn thiện web retail agent để các chức năng core dùng được thật, không tính smoke test hoặc fallback là pass.

## 1. Success criteria bắt buộc

Chỉ coi hoàn thành khi các mục sau pass bằng runtime test thật:

1. API backend đang chạy thật trong dải port 7000-7050.
2. Web đang chạy thật trong dải port 7000-7050.
3. Docker PostgreSQL/pgvector và Redis chạy healthy.
4. Product/catalog/knowledge đọc từ PostgreSQL seeded data thật.
5. Chat endpoint gọi LLM thật qua `CHAT_MODEL_BASE_URL=https://replace-with-your-vllm-gateway.example.invalid`.
6. Search/knowledge flow gọi embedding/rerank thật qua `EMBED_RERANK_BASE_URL=https://replace-with-your-embed-rerank-gateway.example.invalid`.
7. Frontend chat composer gửi request thật và render assistant response thật.
8. Add-to-cart gọi backend thật và cart UI cập nhật từ response thật.
9. Order confirmation gọi backend thật với idempotency key thật.
10. Payment intent gọi backend thật; hiện provider là mock nếu chưa có provider sandbox credentials, nhưng phải gọi endpoint thật và persist DB thật.
11. Runtime tests kiểm tra HTML/API response thật, không pass bằng mock-only hoặc fallback.

## 2. Skills cần dùng

- `backend-skill`: API agent/chat, service logic, DB persistence.
- `frontend-skill`: interactive customer UI, accessibility/responsive.
- `documentation-skill`: docs sau từng phase.
- `logging-skill`: logs sau từng phase.
- `push-code-skill`: chỉ áp dụng nếu thư mục là git repo và user xác nhận push.
- `testing-skill`: hiện chưa có; dùng checklist trong plan này.

## 3. Tài nguyên cần thiết

- Docker Desktop đang chạy.
- PostgreSQL Docker: `localhost:55432`.
- Redis Docker: `localhost:56379`.
- Chat model server: `https://replace-with-your-vllm-gateway.example.invalid` model `google/gemma-4-E4B-it`.
- Embedding/rerank server: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- API port mục tiêu: `7010`.
- Web port mục tiêu: `7000`.

## 4. Phase A - Backend real agent/chat API

- Thời gian dự kiến: 1-2 giờ.
- Skills: backend, documentation, logging.
- Implementation:
  - Tạo agent service/controller endpoint `POST /api/v1/chat`.
  - Endpoint nhận message/cartId.
  - Search products thật từ DB.
  - Search knowledge thật từ DB.
  - Gọi embedding/rerank thật qua ModelGateway để chọn context.
  - Gọi chat LLM thật qua ModelGateway với context đã lấy.
  - Trả structured blocks: text, product_list, cart_summary, quick_replies.
- Testing:
  - Runtime API test gọi `/api/v1/chat` thật.
  - Assert response có assistant text từ model thật.
  - Assert product block có product seeded DB.
  - Assert embedding/rerank endpoint được gọi qua model gateway path thật.
- Pass criteria:
  - Không fallback nếu model/embedding server fail.
  - Test fail nếu LLM/embedding/rerank không reachable.

## 5. Phase B - Frontend interactive customer flow

- Thời gian dự kiến: 2-4 giờ.
- Skills: frontend, documentation, logging.
- Implementation:
  - Chuyển page sang interactive client components khi cần.
  - Chat composer gọi `/api/v1/chat` thật.
  - Render assistant text và product cards từ response thật.
  - Product card button gọi add-to-cart endpoint thật.
  - Cart panel đọc/cập nhật cart thật.
  - Confirm order gọi create order + confirm order thật.
  - Payment action gọi create payment intent thật.
- Testing:
  - Runtime web test với app đang chạy thật.
  - Fetch HTML/API routes thật và kiểm tra page render đúng.
  - Browser-like flow bằng Node fetch nếu Playwright chưa cài: call page, chat API, add cart, order, payment.
- Pass criteria:
  - User có thể chat -> xem gợi ý -> thêm giỏ -> xác nhận đơn -> tạo payment intent bằng request thật.

## 6. Phase C - Full runtime validation

- Thời gian dự kiến: 1-2 giờ.
- Skills: backend, frontend, documentation, logging.
- Tests bắt buộc:
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm --filter @retail-agent/api test:runtime`
  - `corepack pnpm --filter @retail-agent/web test:runtime`
  - Runtime flow riêng cho chat/cart/order/payment trên ports 7000/7010.
- Pass criteria:
  - 100% tests pass.
  - API/web vẫn chạy sau tests.
  - Không report hoàn thành nếu dependency thật fail.

## 7. Phase D - Documentation/logging

- Thời gian dự kiến: 30 phút.
- Output:
  - `docs/implementation/phase-7-real-agent-chat.md`
  - `logs/implementation/phase-7-real-agent-chat-log.md`
  - Update frontend docs nếu behavior thay đổi.

## 8. Blocker không được fake

- Nếu chat model server hoặc embedding/rerank server không reachable, task không được đánh dấu hoàn thành 100%.
- Nếu muốn payment provider thật ngoài mock, cần provider sandbox credentials; nếu chưa có, chỉ có thể pass mock payment endpoint thật/persisted DB, không được gọi là real external payment provider.
- Nếu cần push, thư mục hiện chưa là git repository nên không thể push cho đến khi user xác nhận git workflow.
