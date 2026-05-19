# Phase 3 Catalog/Search/Knowledge Log

- Thời gian: 2026-05-14
- Task: catalog/search/knowledge APIs

## Hoạt động chính

- Đọc lại `backend-skill`, `documentation-skill`, `logging-skill`.
- Thêm model types cho product và knowledge document.
- Thêm in-memory sample catalog/knowledge services.
- Thêm runtime API endpoints cho products, product detail, product search, knowledge search.
- Thêm runtime test `tests/runtime-catalog-knowledge.mjs`.

## Vấn đề gặp phải

- Runtime test đầu tiên phát hiện search ranking trả `FreshHome Mini 20` thay vì `AiroClean P35` cho query phòng 25m2 dưới 4 triệu.
- Đã sửa scoring để ưu tiên match room size `25m2` với product có `25-35m2` và budget dưới 4 triệu.

## Test đã chạy

Pass toàn bộ:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime test thật đã xác nhận:

- Product list trả đủ sample products.
- Product search query mẫu trả `prod_air_clean_p35` đầu tiên.
- Product detail trả đúng title/inventory.
- Knowledge search query đổi trả trả policy official.

## Blocker

Chưa có PostgreSQL/pgvector thật nên chưa triển khai/đánh dấu pass migration, seed DB, vector index và hybrid search DB production.
