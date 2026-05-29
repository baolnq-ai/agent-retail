# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-fixcheck-auth-history-1`
- Thời gian: 2026-05-27T01:31:56.998Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 6 pass, 1 warn, 3 fail / 10
- Latency avg/p95: 3049/4856 ms

## Lỗi nổi bật

- `cart_operation_without_completed_or_pending_tool`: 2
- `cart_operation_trace_review:add:decrement_quantity`: 1
- `cart_operation_trace_review:confirm_pending:none`: 1
- `cart_operation_trace_review:increment_quantity:set_quantity`: 1
- `empty_product_list`: 1
- `intent_review:cart_action:expected_compare`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A021 | auth-history-1 | product | pass | recommend | 4162 | - | Mình đang giữ lại Máy lọc không khí Levoit Core 200S 26W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A022 | auth-history-1 | history_compare | fail | cart_action | 1480 | `empty_product_list`<br>`intent_review:cart_action:expected_compare` | Chào bạn, để so sánh hai sản phẩm, bạn vui lòng cho mình biết tên hoặc hình ảnh của hai sản phẩm đó được không? Hiện tại mình chưa thấy hai sản phẩm nào được đề cập để mình đưa ra nhận xét về việc sản phẩm nào hợp phòng ngủ hơn. |
| A023 | auth-history-1 | history_cart | pass | cart_action | 1590 | - | Đã thêm 1 × Bàn chải điện Oral-B Pro 1 vào giỏ hàng.<br>Chào bạn, tôi đã thêm Bàn chải điện Oral-B Pro 1 vào giỏ hàng của bạn rồi nhé. Bạn cần tôi hỗ trợ thêm về sản phẩm này hay muốn tìm kiếm thêm món đồ nào khác không? |
| A024 | auth-history-1 | cart_status | pass | cart_status | 2666 | - | Chào bạn, giỏ hàng của bạn hiện có 1 sản phẩm là Bàn chải điện Oral-B Pro 1, tổng tiền là 990.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A025 | auth-history-1 | history_cart | warn | cart_action | 4856 | `cart_operation_trace_review:increment_quantity:set_quantity` | Đã cập nhật Bàn chải điện Oral-B Pro 1 thành số lượng 2.<br>Chào bạn, tôi đã cập nhật số lượng Bàn chải điện Oral-B Pro 1 lên 2 sản phẩm rồi nhé. Hiện tại, giỏ hàng của bạn có tổng cộng 1.980.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này hay muốn |
| A026 | auth-history-1 | history_cart | pass | cart_action | 4744 | - | Đã xoá Bàn chải điện Oral-B Pro 1 khỏi giỏ hàng.<br>Tôi đã xóa Bàn chải điện Oral-B Pro 1 khỏi giỏ hàng của bạn rồi nhé. Hiện tại giỏ hàng của bạn đang trống. Bạn có muốn tôi tìm kiếm sản phẩm nào khác hay cần hỗ trợ thêm thông tin gì không ạ? |
| A027 | auth-history-1 | history_followup | pass | recommend | 3846 | - | Chào bạn, để mình tìm giúp bạn những mẫu phù hợp hơn với ngân sách của bạn nhé. Bạn có thể cho mình biết thêm về tiêu chí "ổn" của bạn là gì không ạ? Ví dụ như bạn cần loại đèn có tính năng gì hay kích thước như thế nào?<br>Hiện tại, mình có sản phẩm Bóng đèn Phi |
| A028 | auth-history-1 | history_cart | fail | cart_action | 2059 | `cart_operation_trace_review:add:decrement_quantity`<br>`cart_operation_without_completed_or_pending_tool` | Product is not in cart |
| A029 | auth-history-1 | confirm_pending | fail | cart_action | 2060 | `cart_operation_trace_review:confirm_pending:none`<br>`cart_operation_without_completed_or_pending_tool` | Bạn vui lòng cho tôi biết tên hoặc hình ảnh của hai sản phẩm bạn muốn thêm vào giỏ hàng được không ạ? |
| A030 | auth-history-1 | cart_status | pass | cart_status | 3025 | - | Chào bạn, hiện tại giỏ hàng của bạn đang trống. Trước đó, bạn đã thêm và sau đó xóa sản phẩm Bàn chải điện Oral-B Pro 1. Bạn có muốn tôi tìm kiếm lại sản phẩm nào khác cho bạn không ạ? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
