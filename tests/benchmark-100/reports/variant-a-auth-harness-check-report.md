# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-auth-harness-check`
- Thời gian: 2026-05-27T00:56:05.253Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 1000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 3 pass, 0 warn, 0 fail / 3
- Latency avg/p95: 2831/4439 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A021 | auth-history-1 | product | pass | recommend | 4439 | - | Mình đang giữ lại Máy lọc không khí Levoit Core 200S 26W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A022 | auth-history-1 | history_compare | pass | compare | 2225 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Camera IP Ezviz C6N và Máy sấy tóc Xiaomi Mijia H300. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A023 | auth-history-1 | history_cart | pass | cart_action | 1830 | - | Đã thêm 1 × Bàn chải điện Oral-B Pro 1 vào giỏ hàng.<br>Mình đã thêm Bàn chải điện Oral-B Pro 1 vào giỏ hàng của bạn rồi nhé. Bạn cần mình hỗ trợ thêm về sản phẩm nào khác không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
