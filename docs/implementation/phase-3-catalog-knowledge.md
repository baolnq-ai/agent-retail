# Phase 3 Catalog/Search/Knowledge

- Thời gian cập nhật: 2026-05-14
- Task: catalog/search/knowledge APIs với runtime request thật

## Nội dung đã triển khai

Đã thêm sample catalog và knowledge services/controllers:

```txt
apps/api/src/models/catalog.models.ts
apps/api/src/services/catalog.service.ts
apps/api/src/services/knowledge.service.ts
apps/api/src/controllers/catalog.controller.ts
apps/api/src/controllers/knowledge.controller.ts
```

Runtime endpoints:

- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/search/products?q=...`
- `GET /api/v1/knowledge/search?q=...`

## Sample data hiện có

Products:

- Máy lọc không khí AiroClean P35
- Máy lọc không khí FreshHome Mini 20
- Nồi chiên không dầu ChefMax AF55

Knowledge:

- Chính sách đổi trả 7 ngày
- Thời gian hoàn tiền
- Miễn phí giao hàng

## Runtime verification

Đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime test gọi API thật:

- `GET /api/v1/products`
- `GET /api/v1/search/products?q=máy lọc không khí phòng 25m2 dưới 4 triệu`
- `GET /api/v1/products/prod_air_clean_p35`
- `GET /api/v1/knowledge/search?q=đổi trả 7 ngày`

## Blocker chưa pass production DB

Phase này mới pass phần API runtime trên sample data in-memory. Các mục sau chưa được đánh dấu production pass vì chưa có database thật để test 100%:

- PostgreSQL schema/migrations.
- pgvector storage/index.
- Seed repeatable trên DB thật.
- Hybrid search DB + vector + rerank end-to-end.

Không fake pass các mục này. Cần connection PostgreSQL/pgvector thật trước khi nâng trạng thái DB/search production.
