# Phase 5 Docker DB Persistence

- Thời gian cập nhật: 2026-05-14
- Task: Docker PostgreSQL/pgvector + Redis, Prisma persistence, seed data thật

## Nội dung đã triển khai

- Thêm Docker Compose services:
  - PostgreSQL pgvector tại `localhost:55432`.
  - Redis tại `localhost:56379`.
- Thêm Prisma 7 config và schema cho:
  - `Product`, `KnowledgeDocument`.
  - `Cart`, `CartItem`, `Order`, `PaymentIntent`.
  - `IdempotencyKey`.
- Seed dữ liệu mẫu thật vào PostgreSQL:
  - 3 products.
  - 3 knowledge documents.
- Thêm Prisma PostgreSQL adapter và `PrismaService`.
- Chuyển các service backend sang DB-backed:
  - Catalog đọc product từ PostgreSQL.
  - Knowledge đọc policy/FAQ từ PostgreSQL.
  - Commerce lưu cart/order/payment/idempotency vào PostgreSQL.
  - Health check chạy query DB thật và trả `dependencies.database = ok`.

## Runtime verification

Đã chạy thành công với Docker services đang healthy:

```txt
corepack pnpm --filter @retail-agent/api db:generate
corepack pnpm --filter @retail-agent/api db:push
corepack pnpm --filter @retail-agent/api db:seed
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api test
corepack pnpm --filter @retail-agent/api test:runtime
```

Kết quả runtime pass:

- Health endpoint gọi HTTP thật và xác nhận DB dependency `ok`.
- Model gateway vẫn gọi request thật qua API đang chạy.
- Catalog/knowledge trả dữ liệu seeded từ PostgreSQL.
- Commerce tạo cart/order/payment qua HTTP thật và idempotency được persist trong PostgreSQL.

## Trạng thái còn lại

- Redis service đã chạy healthy trong Docker nhưng app chưa dùng Redis cho cache/session/queue.
- Payment vẫn là mock provider vì chưa có provider sandbox/thật được chọn.
- Chưa thể push code vì thư mục hiện tại chưa phải git repository.
