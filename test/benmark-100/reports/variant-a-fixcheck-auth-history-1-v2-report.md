# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-fixcheck-auth-history-1-v2`
- Thời gian: 2026-05-27T01:37:15.163Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 8 pass, 1 warn, 1 fail / 10
- Latency avg/p95: 3547/4933 ms

## Lỗi nổi bật

- `cart_operation_trace_review:confirm_pending:none`: 1
- `cart_operation_trace_review:increment_quantity:set_quantity`: 1
- `cart_operation_without_completed_or_pending_tool`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A021 | auth-history-1 | product | pass | recommend | 4125 | - | Mình đang giữ lại Máy lọc không khí Levoit Core 200S 26W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A022 | auth-history-1 | history_compare | pass | compare | 4933 | - | Chào bạn, hai sản phẩm này là Camera IP Ezviz C6N và Máy sấy tóc Xiaomi Mijia H300.<br>Nếu bạn muốn dùng cho phòng ngủ, thì Camera IP Ezviz C6N có thể hữu ích để giám sát an ninh. Còn Máy sấy tóc Xiaomi Mijia H300 thì dùng để chăm sóc cá nhân. Tùy vào nhu cầu của |
| A023 | auth-history-1 | history_cart | pass | cart_action | 2885 | - | Đã thêm 1 × Bàn chải điện Oral-B Pro 1 vào giỏ hàng.<br>Chào bạn, tôi đã thêm sản phẩm thứ hai vào giỏ hàng giúp bạn rồi nhé. Hiện tại giỏ hàng của bạn đang có Bàn chải điện Oral-B Pro 1. Bạn cần tôi hỗ trợ thêm về sản phẩm nào khác không? |
| A024 | auth-history-1 | cart_status | pass | cart_status | 3015 | - | Chào bạn, giỏ hàng của bạn hiện có 1 sản phẩm là Bàn chải điện Oral-B Pro 1 với tổng cộng là 990.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A025 | auth-history-1 | history_cart | warn | cart_action | 3693 | `cart_operation_trace_review:increment_quantity:set_quantity` | Đã cập nhật Bàn chải điện Oral-B Pro 1 thành số lượng 2.<br>Chào bạn, tôi đã cập nhật số lượng Bàn chải điện Oral-B Pro 1 lên 2 sản phẩm theo yêu cầu của bạn rồi nhé. Hiện tại, tổng giá trị trong giỏ hàng của bạn là 1.980.000 đồng. Bạn cần tôi hỗ trợ thêm thông t |
| A026 | auth-history-1 | history_cart | pass | cart_action | 4846 | - | Đã xoá Bàn chải điện Oral-B Pro 1 khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm Bàn chải điện Oral-B Pro 1 khỏi giỏ hàng của bạn rồi nhé. Hiện tại, giỏ hàng của bạn đã trống. Bạn có muốn tôi hỗ trợ tìm kiếm hoặc tư vấn thêm sản phẩm nào khác không ạ? |
| A027 | auth-history-1 | history_followup | pass | recommend | 3674 | - | Chào bạn, nếu bạn muốn tìm mẫu phòng ngủ có mức giá phải chăng hơn mà vẫn đảm bảo chất lượng, tôi gợi ý bạn xem qua Bóng đèn Philips Hue White Ambiance E27 nhé. Sản phẩm này rất phù hợp cho không gian phòng ngủ. Bạn có muốn tôi tìm thêm các lựa chọn khác không |
| A028 | auth-history-1 | history_cart | pass | cart_action | 2139 | - | Đã thêm 2 × Bóng đèn Philips Hue White Ambiance E27 vào giỏ hàng.<br>Chào bạn, tôi đã thêm 2 Bóng đèn Philips Hue White Ambiance E27 vào giỏ hàng giúp bạn rồi nhé. Hiện tại, giỏ hàng của bạn có tổng cộng 1.380.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản |
| A029 | auth-history-1 | confirm_pending | fail | cart_action | 2844 | `cart_operation_trace_review:confirm_pending:none`<br>`cart_operation_without_completed_or_pending_tool` | Chào bạn, tôi đã thêm 2 Bóng đèn Philips Hue White Ambiance E27 vào giỏ hàng giúp bạn rồi nhé. Hiện tại, giỏ hàng của bạn có tổng cộng 1.380.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này hay muốn tìm kiếm thêm món nào khác không ạ? |
| A030 | auth-history-1 | cart_status | pass | cart_status | 3317 | - | Chào bạn, giỏ hàng của bạn hiện có 2 Bóng đèn Philips Hue White Ambiance E27 với tổng giá trị là 1.380.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này hay muốn tìm kiếm thêm món nào khác không ạ? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
