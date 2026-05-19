# Phase 11 Agent Streaming and Quality Log

- Thời gian: 2026-05-15
- Task: sửa chất lượng trả lời, streaming, UI chat và seed data.

## Hoạt động chính

- Refactor `AgentService` để chuẩn bị context sạch hơn, build response chung và clean text LLM.
- Thêm `ModelGatewayService.streamChat()` để đọc SSE từ model server với `stream: true`.
- Thêm controller `POST /api/v1/chat/stream` trả NDJSON.
- Mở rộng seed từ 3 sản phẩm lên hơn 100 sản phẩm, giữ ID cũ để test không gãy.
- Cập nhật frontend `submitChat()` để đọc stream, append token vào assistant message, xử lý `final` để attach product/policy blocks.
- Thêm close/minimize/launcher cho chat widget.
- Đổi product suggestions trong chat thành strip nhỏ, giới hạn 3 sản phẩm.
- Thêm animation nhẹ cho navbar, launcher, cursor token và product chip.
- Cập nhật tests cho stream, clean text, product count và UI controls.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web test:runtime
```

Live check pass:

```txt
live-stream-text-clean-ok
```
