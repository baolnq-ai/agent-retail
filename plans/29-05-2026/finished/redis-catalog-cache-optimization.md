# Plan: Redis catalog cache optimization

## Muc tieu
- Tận dụng Redis hiện có để giảm độ trễ web khi tải danh sách, chi tiết và tìm kiếm sản phẩm.
- Cấu hình qua `.env`/`.env.example`, không hardcode URL hoặc TTL trong code.
- Cache chỉ dữ liệu catalog public, tránh cache cart/chat/user để không lẫn dữ liệu phiên.
- Có tài liệu, log, test request thật và hoàn tất plan theo skill.

## Pham vi
1. Đọc luồng API catalog hiện tại và cấu hình Redis trong setup.
2. Thêm cấu hình `REDIS_URL` và `CATALOG_CACHE_TTL_SECONDS` vào environment loader.
3. Thêm Redis cache service có TTL, JSON get/set và fail mềm khi Redis lỗi.
4. Gắn cache vào `CatalogService` cho list/detail; search dùng list đã cache để giảm DB query.
5. Cập nhật `.env`, `.env.example`, README/docs/log/test evidence.
6. Chạy build/test và request thật vào API để xác nhận cache hoạt động.

## Tieu chi pass
- API vẫn chạy khi Redis sẵn sàng hoặc tạm lỗi.
- `/api/v1/products`, `/api/v1/products/:id`, `/api/v1/search/products?q=...` trả dữ liệu thật từ DB.
- Lần gọi sau tận dụng Redis và không làm rò rỉ secret vào docs/example/log.
- `corepack pnpm --filter @retail-agent/api test` pass; validate toàn repo nếu thời gian/điều kiện cho phép.

## Ket qua 2026-05-29
- Đã thêm `RedisCacheService`, cấu hình `REDIS_URL`, `CATALOG_CACHE_TTL_SECONDS` và cache catalog public.
- `GET /api/v1/products` tạo key `catalog:products:v1`; `GET /api/v1/products/:id` tạo key `catalog:product:v1:<id>`.
- Search dùng danh sách catalog đã cache để giảm query PostgreSQL.
- Đã chạy `.\setup.ps1` để clear runtime cũ và start lại API/Web/nginx/Redis/PostgreSQL/Qdrant.
- Validation pass: `corepack pnpm --filter @retail-agent/api test`, `corepack pnpm validate`, `corepack pnpm --filter @retail-agent/web test`.
- Request thật qua nginx pass; Redis key tồn tại với TTL khoảng 119 giây sau request.
