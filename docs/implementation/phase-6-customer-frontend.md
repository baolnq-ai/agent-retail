# Phase 6 Customer Frontend

- Thời gian cập nhật: 2026-05-15
- Task: thay landing placeholder bằng customer retail chat-commerce page thật

## Nội dung đã triển khai

- Thay homepage placeholder bằng page server-rendered kết nối API thật qua `API_BASE_URL`.
- Layout theo plan frontend:
  - Header và navigation nhanh.
  - Discovery panel cho nhu cầu/filter.
  - Chat transcript với assistant recommendation.
  - Quick replies.
  - Product recommendation card.
  - Cart drawer/context panel.
  - Order confirmation card.
  - Product discovery grid từ catalog PostgreSQL.
  - Support/handoff strip.
- Product cards hiển thị tên, mô tả, giá, tồn kho, category, attributes và CTA.
- CSS responsive cho desktop/tablet/mobile.

## Runtime verification

Đã chạy thành công:

```txt
API_BASE_URL=http://127.0.0.1:7010 corepack pnpm --filter @retail-agent/web typecheck
API_BASE_URL=http://127.0.0.1:7010 corepack pnpm --filter @retail-agent/web test
API_BASE_URL=http://127.0.0.1:7010 corepack pnpm --filter @retail-agent/web build
API_BASE_URL=http://127.0.0.1:7010 corepack pnpm --filter @retail-agent/web test:runtime
```

Đã verify web đang chạy tại `http://127.0.0.1:7000/` render:

- `Trợ lý mua sắm AI`.
- `Máy lọc không khí AiroClean P35` từ API/DB.
- `Giỏ hàng`.
- Không còn placeholder `Frontend runtime sẵn sàng`.

## Phần còn thiếu so với full plan

- Chat composer hiện là UI tĩnh, chưa gọi chat API/model orchestration.
- Nút thêm giỏ/xác nhận đơn hiện là UI, chưa mutate cart/order qua client action.
- Chưa có Playwright/browser automation đầy đủ; runtime hiện kiểm tra HTTP HTML thật.
- Ops console chưa triển khai.
