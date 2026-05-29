# Redis Catalog Cache - 2026-05-29

## Mục tiêu

Tối ưu tốc độ tải web bằng Redis cho dữ liệu catalog public: danh sách sản phẩm, chi tiết sản phẩm và luồng search dựa trên catalog. Không cache dữ liệu user, cart hoặc chat bằng khóa dùng chung để tránh rò/lẫn dữ liệu phiên.

## Cấu hình

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `REDIS_URL` | `redis://localhost:3139` | Kết nối Redis runtime |
| `CATALOG_CACHE_TTL_SECONDS` | `120` | TTL cache catalog public, tính bằng giây |

## Thiết kế

| Luồng | Redis key | Ghi chú |
| --- | --- | --- |
| `GET /api/v1/products` | `catalog:products:v1` | Cache toàn bộ danh sách catalog đã map về DTO public |
| `GET /api/v1/products/:id` | `catalog:product:v1:<productId>` | Cache chi tiết sản phẩm public |
| `GET /api/v1/search/products?q=...` | dùng `catalog:products:v1` | Search lọc trên catalog đã cache, không tạo key theo query để tránh phình key |

Redis lỗi hoặc chưa sẵn sàng sẽ fail mềm: API đọc từ PostgreSQL và vẫn trả response thật. Service log trạng thái Redis nhưng không ghi URL private hay payload nhạy cảm.

## Validation

| Kiểm tra | Kết quả |
| --- | --- |
| `corepack pnpm --filter @retail-agent/api test` | Pass 99/99 |
| `.\setup.ps1` | Pass, API/Web/nginx/Redis/PostgreSQL/Qdrant ready |
| Request thật qua nginx | `GET /api/v1/products` 200, lần hai nhanh hơn sau khi cache |
| Redis key | `catalog:products:v1` và `catalog:product:v1:prod_air_clean_p35` tồn tại, TTL khoảng 119 giây sau request |
| Tunnel health | Public tunnel `/health` trả 200 tại thời điểm test |

## Rủi ro còn lại

- Catalog thay đổi trong DB sẽ mất tối đa theo TTL hiện tại trước khi cache tự refresh.
- Chưa cache cart/chat/user vì đây là dữ liệu theo phiên và cần thiết kế key scope riêng nếu tối ưu tiếp.
