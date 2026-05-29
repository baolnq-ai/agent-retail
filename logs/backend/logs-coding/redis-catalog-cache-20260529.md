# Redis Catalog Cache Coding Log - 2026-05-29

## Đã làm

- Thêm dependency `ioredis` cho `@retail-agent/api`.
- Thêm `RedisCacheService` với JSON get/set, TTL, timeout ngắn và fallback mềm khi Redis lỗi.
- Thêm cấu hình `REDIS_URL` và `CATALOG_CACHE_TTL_SECONDS` qua environment loader.
- Gắn cache vào `CatalogService` cho list/detail sản phẩm; search dùng catalog list đã cache để giảm query PostgreSQL.
- Cập nhật `.env`, `.env.example`, README và tài liệu backend.
- Chạy setup để clear runtime cũ và start lại API/Web/nginx/Redis/PostgreSQL/Qdrant.

## Validation

| Lệnh/kiểm tra | Kết quả |
| --- | --- |
| `corepack pnpm --filter @retail-agent/api test` | Pass 99/99 |
| `.\setup.ps1` | Ready: API 3110, Web 3100, nginx 3120, Redis 3139 |
| `GET http://127.0.0.1:3120/api/v1/products` | 200, cache key `catalog:products:v1` được tạo |
| `GET http://127.0.0.1:3120/api/v1/products/prod_air_clean_p35` | 200, cache key detail được tạo |
| Tunnel `/health` | 200 |

## Bảo mật

- Không ghi model endpoint private, token, cookie hoặc nội dung `.env` vào tài liệu.
- `.env.example` chỉ giữ placeholder public/safe.
- Cache hiện chỉ dùng cho catalog public, không dùng cho dữ liệu tài khoản.
