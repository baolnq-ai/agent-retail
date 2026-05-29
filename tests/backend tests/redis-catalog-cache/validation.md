# Redis Catalog Cache Validation - 2026-05-29

## Mục tiêu

Xác nhận Redis đang được API dùng cho catalog public và request thật qua nginx vẫn trả dữ liệu từ hệ thống đang chạy.

## Kết quả request thật

| Request | Status | Thời gian |
| --- | --- | --- |
| `GET http://127.0.0.1:3120/api/v1/products` sau khi xóa key | 200 | 259.59 ms |
| `GET http://127.0.0.1:3120/api/v1/products` lần hai | 200 | 101.53 ms |
| `GET http://127.0.0.1:3120/api/v1/products/prod_air_clean_p35` sau khi xóa key | 200 | 32.35 ms |
| `GET http://127.0.0.1:3120/api/v1/products/prod_air_clean_p35` lần hai | 200 | 21.63 ms |
| `GET http://127.0.0.1:3120/api/v1/search/products?q=may%20loc%20khong%20khi%20duoi%204%20trieu` | 200 | 126.82 ms |

## Redis evidence

| Key | Exists | TTL sau request |
| --- | --- | --- |
| `catalog:products:v1` | 1 | 119 giây |
| `catalog:product:v1:prod_air_clean_p35` | 1 | 119 giây |

## Test tự động

`corepack pnpm --filter @retail-agent/api test` pass 99/99, gồm các test mới:

- `CatalogService caches product list in Redis-compatible cache`
- `CatalogService search reuses cached catalog list instead of querying DB again`
- `CatalogService caches product detail by id`

## Ghi chú

Redis chỉ cache catalog public. Cart, chat, account memory và dữ liệu user chưa cache để tránh sai scope bảo mật.
