# Phase 13 Chat Product Carousel Relevance Log

- Thời gian: 2026-05-15
- Task: sửa UX product suggestions trong chat và giảm lệch đề xuất so với câu trả lời LLM.

## Hoạt động chính

- Thay render `.chat-product-strip` bằng `ProductRecommendationCarousel` trong `retail-client.tsx`.
- Thêm nút `‹` / `›` để chuyển từng sản phẩm đề xuất, không dùng kéo ngang/mask/sticky arrow.
- Chỉnh CSS carousel compact, card co theo khung chat và có counter khi nhiều sản phẩm.
- Xóa animation `nudgeSide` không còn dùng.
- Chỉnh `AgentService.buildResponse()` chọn product list bằng `selectVisibleProducts()`.
- `selectVisibleProducts()` ưu tiên sản phẩm được nhắc trong text LLM, bỏ card cho truy vấn chính sách thuần túy, giữ tối đa 3 card cho so sánh.
- Cập nhật test frontend để đảm bảo carousel tồn tại và strip cũ không quay lại.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
$env:DATABASE_URL='postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public'; corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web test:runtime
```

## Sự cố gặp phải

- `corepack pnpm --filter @retail-agent/api test:runtime` fail lần đầu tại runtime model gateway vì API child process không mở port `3201`.
- Kiểm tra trực tiếp cho thấy API chết khi thiếu `DATABASE_URL`.
- Chạy lại runtime với `DATABASE_URL` thật thì pass toàn bộ.
