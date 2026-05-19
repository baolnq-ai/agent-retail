# Phase 10 Storefront Chat Refactor

- Thời gian cập nhật: 2026-05-15
- Task: sửa UI từ dashboard/workbench thành website bán hàng bình thường và sửa quick reply trong chat.

## Nội dung đã sửa

- Đổi layout sang storefront gồm navbar, hero bán hàng, benefit strip, catalog sản phẩm, shopping guide, cart checkout và chat widget nổi.
- Chat widget luôn hiển thị rõ ở góc phải, có header, trạng thái, progress line, message list và input composer.
- Quick reply trong chat giờ gọi `submitChat(reply)` để gửi request thật tới backend thay vì chỉ set text vào input.
- Giảm cảm giác dashboard bằng màu ấm, card sản phẩm, spacing storefront và navbar chuẩn website bán hàng.
- Giữ dark/light theme và các action backend thật: chat, add cart, order, payment.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web test:runtime
```

## Runtime live

Đã restart frontend port `7000` và xác nhận HTML live có storefront mới:

```txt
storefront-ui-ok
```
