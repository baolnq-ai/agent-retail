# Audit Kiến Trúc Production

- Cập nhật lại: 31-05-2026
- Trạng thái: historical audit đã được đồng bộ với pipeline hiện tại
- Phạm vi: Docker Compose, database, Business RAG, ảnh sản phẩm, dashboard trace và readiness production.

## Kết Luận Hiện Tại

Dự án đã đủ rõ để chạy local/dev bằng setup source: PostgreSQL, Redis, Qdrant và nginx provider chạy bằng `infra/docker/docker-compose.yml`, API/Web chạy từ source. Root `docker-compose.yml` vẫn là đường full Docker.

Pipeline hiện tại tách rõ:

- PostgreSQL là source of truth cho catalog, user, cart, memory và prompt.
- Product search dùng hard catalog search: keyword, SKU, brand, category, facet, budget và tồn kho.
- Business RAG mới dùng embedding, Qdrant collection `business_knowledge` và rerank để trả lời chính sách/cửa hàng/hậu mãi.
- Redis dùng cho cache catalog public và giảm độ trễ storefront/search.
- Dashboard trace hiển thị task blackboard, agent, tool result, node/edge/playback cho từng lượt chat.

## Hạ Tầng Docker

Compose dev provider quản lý:

- `postgres`: dữ liệu chính cho catalog, user, cart, memory, audit.
- `redis`: cache runtime.
- `qdrant`: vector DB cho tài liệu nghiệp vụ Business RAG.
- `nginx`: entry `3120` cho tunnel/web/API cùng origin.

Sửa ngày 31-05-2026: dev provider compose không còn bind mount nginx template. Nginx config được inline trong compose để tránh lỗi Docker Desktop với path Windows có dấu cách.

## Database Và Retrieval

| Vùng dữ liệu | Source of truth | Ghi chú |
| --- | --- | --- |
| Catalog/product | PostgreSQL | Product search khóa fact từ DB, không dùng vector để tìm sản phẩm |
| Cart/order | PostgreSQL | Cart Agent mutate qua private tool và verify sau ghi |
| Memory/history | PostgreSQL | History Agent truy xuất theo yêu cầu cụ thể |
| Business knowledge | PostgreSQL + Qdrant | Tài liệu seed ở DB, vector index ở Qdrant, rerank qua model gateway |
| Cache | Redis | Cache catalog public và dữ liệu runtime ngắn hạn |

## Readiness

- Cần migration versioned trước production, không chỉ dùng `prisma db push`.
- Cần secret manager/TLS/rate limit cho production thật.
- Cần job ingest/index riêng cho Business RAG khi tài liệu nội bộ tăng lớn.
- Cần monitoring latency theo API, model gateway, Redis, Qdrant và Postgres.

## Benchmark Liên Quan

Benchmark backend chính hiện tại nằm ở [tests/backend tests/benchmark1000](<../../tests/backend tests/benchmark1000/README.md>).
