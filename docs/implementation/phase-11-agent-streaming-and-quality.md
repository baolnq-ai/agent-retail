# Phase 11 Agent Streaming and Quality

- Thời gian cập nhật: 2026-05-15
- Task: nâng chất lượng agent chat, thêm streaming, làm sạch câu trả lời, mở rộng dữ liệu test và chỉnh UX chat.

## Nội dung đã sửa

- Backend agent:
  - Thêm pipeline chuẩn bị context rõ hơn, dùng tên sản phẩm/chính sách thay vì context dạng mã nội bộ.
  - Làm sạch câu trả lời LLM: bỏ markdown thô, thay product ID bằng tên sản phẩm, không đưa diagnostics vào text chat.
  - Thêm endpoint stream `POST /api/v1/chat/stream` trả NDJSON với event `status`, `token`, `final`, `error`.
- Model gateway:
  - Thêm `streamChat()` gọi OpenAI-compatible chat completion với `stream: true`.
- Seed data:
  - Giữ 3 sản phẩm bắt buộc cũ và sinh thêm khoảng 100 sản phẩm test nhiều danh mục.
- Frontend:
  - Chat widget dùng stream thật, hiển thị token dần.
  - Thêm đóng/mở/thu nhỏ chat.
  - Product suggestion trong chat đổi thành strip compact tối đa 3 item.
  - Quick reply vẫn gửi request thật.
  - Thêm animation nhẹ cho navbar, launcher, card và cursor streaming.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/api db:seed
corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web test:runtime
```

## Live verification

Đã restart API `7010` và web `7000`.

Pass:

```txt
live-stream-text-clean-ok
```

Nội dung kiểm tra: endpoint stream trả token thật và final assistant text không còn lộ `prod_*` trong câu trả lời người dùng.
