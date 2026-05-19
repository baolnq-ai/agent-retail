# Phase 13 Chat Product Carousel Relevance

- Thời gian cập nhật: 2026-05-15
- Task: thay container đề xuất sản phẩm trong chat bằng nút slide và chỉnh đề xuất bám sát câu trả lời agent hơn.

## Nội dung đã sửa

- Bỏ cơ chế product strip kéo ngang/fade/sticky arrow trong chat vì dễ lỗi UX.
- Thêm `ProductRecommendationCarousel` dùng nút trái/phải để chuyển từng sản phẩm đề xuất.
- Card đề xuất trong chat chỉ hiển thị một sản phẩm tại một thời điểm, kèm chỉ số vị trí khi có nhiều sản phẩm.
- Backend không còn luôn trả `prepared.products.slice(0, 3)` cho UI.
- Product card giờ ưu tiên sản phẩm được nhắc trong câu trả lời đã làm sạch của LLM.
- Câu hỏi chính sách thuần túy không đẩy card sản phẩm không liên quan.
- Câu hỏi so sánh vẫn có thể trả tối đa 3 sản phẩm liên quan; tư vấn thường giới hạn card để tránh loãng nội dung.
- Test nguồn frontend kiểm tra có carousel và không còn `chat-product-strip`.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
$env:DATABASE_URL='postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public'; corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web test:runtime
```

## Ghi chú runtime

- Lần chạy `api test:runtime` không kèm `DATABASE_URL` fail vì API child process không mở được port runtime.
- Chạy lại với `DATABASE_URL` thật thì toàn bộ runtime API pass, bao gồm LLM, embedding, rerank, stream, CORS, catalog, cart/order/payment.
