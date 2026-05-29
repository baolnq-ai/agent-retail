# Backend Docs

## Cập Nhật Mới

| Ngày | Nội dung |
| --- | --- |
| 2026-05-29 | Redis catalog cache cho storefront/search: [redis-catalog-cache-20260529.md](redis-catalog-cache-20260529.md). Validation request thật ghi tại [tests/backend tests/redis-catalog-cache/validation.md](../../tests/backend%20tests/redis-catalog-cache/validation.md). |

- Cập nhật: 2026-05-29
- Phạm vi: tài liệu dịch vụ backend đang chạy trong `apps/api`.

## Service Hiện Có

| Service | Vai trò | Source |
| --- | --- | --- |
| Auth | Đăng ký, đăng nhập, session cookie HttpOnly | `apps/api/src/services/auth.service.ts` |
| Commerce | Catalog/cart/order-facing API cho storefront và agent | `apps/api/src/services/commerce.service.ts` |
| Agent pipeline | Điều phối lead, search, memory, cart, RAG, security, sales | `apps/api/src/services/agent.service.ts` |
| Model gateway | Gọi chat, embedding và rerank qua cấu hình env | `apps/api/src/services/model-gateway.service.ts` |
| Storage memory | Lưu và đọc memory đã redact theo user/session | `apps/api/src/services/agents/storage-memory-agent.service.ts` |

## Tài Liệu Service

| Tài liệu | Nội dung |
| --- | --- |
| [source-clean.md](source-clean.md) | Clean source backend theo skill và validation liên quan |

## Validation Mới Nhất

| Ngày | Kết quả |
| --- | --- |
| 2026-05-29 | `corepack pnpm validate` pass: prepare generated, typecheck workspace, API build và 95 API tests. |
| 2026-05-29 | Docker Compose config pass cho `infra/docker/docker-compose.yml` và root `docker-compose.yml` với `.env.example`. |

## Quy Tắc Bảo Trì

- Config nhạy cảm đọc từ `.env` hoặc `.env.example`, không hardcode trong service.
- Runtime test thật nằm trong `apps/api/tests/runtime-*.mjs`; report tổng hợp mới đặt dưới `tests/backend/`.
- Khi thêm service backend mới, cập nhật bảng service và log triển khai tương ứng.

dev by ambrouse
