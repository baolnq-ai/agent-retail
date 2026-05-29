# Evidence Docker full compose

Ngày: 2026-05-28

## Phạm vi

Kiểm tra root `docker-compose.yml` chạy full Docker 100% từ image Docker Hub:

- API: `baonguyen3568/ai-agent-retail:api-v0.1.0-20260528`
- Web: `baonguyen3568/ai-agent-retail:web-v0.1.0-20260528`
- Hạ tầng: PostgreSQL/pgvector, Redis, Qdrant, nginx

## Kết quả

| Hạng mục | Kết quả |
| --- | --- |
| Pull image từ Docker Hub | Pass |
| `docker compose up -d` root compose | Pass |
| `SETUP_RUN_MODE=docker ./setup.sh` | Pass |
| API health qua nginx `6820` | HTTP 200 |
| Product API qua nginx | HTTP 200, trả danh sách sản phẩm |
| Web home/products/dashboard/account | Render được bằng Chrome headless |
| Auth + cart API | Đăng ký user test, thêm 1 sản phẩm vào giỏ, `cartItems=1`, `grandTotal=790000` |

## Ảnh

| Màn hình | File |
| --- | --- |
| Home | [home-cdp.png](home-cdp.png) |
| Products | [products-cdp.png](products-cdp.png) |
| Dashboard demo | [dashboard-demo-cdp.png](dashboard-demo-cdp.png) |
| Account | [account-cdp.png](account-cdp.png) |

## Dữ liệu kiểm tra

- [api-cart-check.json](api-cart-check.json)
- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml ps`: tất cả service chính healthy, riêng Qdrant không cấu hình healthcheck nhưng container running và API đã kết nối được.
