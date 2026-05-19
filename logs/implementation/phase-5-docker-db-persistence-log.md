# Phase 5 Docker DB Persistence Log

- Thời gian: 2026-05-14
- Task: Docker DB services, Prisma schema, seed data, runtime persistence tests

## Hoạt động chính

- Kiểm tra Docker và xác nhận `retail-agent-postgres`, `retail-agent-redis` đều healthy.
- Cập nhật Prisma schema theo Prisma 7 bằng `prisma.config.ts`.
- Cài `@prisma/adapter-pg` và `pg` để PrismaClient kết nối PostgreSQL trực tiếp.
- Push schema vào PostgreSQL Docker và seed dữ liệu mẫu thật.
- Thêm `PrismaService` cho NestJS.
- Chuyển catalog, knowledge, commerce, health sang PostgreSQL-backed implementation.
- Cập nhật runtime tests để truyền `DATABASE_URL` thật và assert DB dependency.

## Test đã chạy

Pass toàn bộ:

```txt
corepack pnpm --filter @retail-agent/api db:generate
corepack pnpm --filter @retail-agent/api db:push
corepack pnpm --filter @retail-agent/api db:seed
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api test
corepack pnpm --filter @retail-agent/api test:runtime
```

DB verification sau seed:

```json
{"products":3,"knowledge":3}
```

## Lỗi đã xử lý

- Prisma 7 không còn nhận `url` trong datasource schema, đã chuyển sang `prisma.config.ts`.
- PrismaClient Prisma 7 cần adapter, đã thêm PostgreSQL adapter.
- PowerShell inline script expand `$disconnect`, đã verify bằng script tạm rồi xóa sau khi hoàn tất.
- TypeScript JSON input cần cast đúng `Prisma.InputJsonValue` khi lưu order items và idempotency response.

## Blocker còn lại

- Redis chưa được app sử dụng dù service đã healthy.
- Payment provider thật/sandbox chưa được cấu hình, nên payment runtime hiện vẫn chỉ là mock provider.
- Không push được vì project directory hiện không phải git repository.
