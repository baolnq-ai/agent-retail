# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-41-50-invalid-add-v1`
- Thời gian: 2026-05-27T14:22:49.394Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 8 pass, 1 warn, 1 fail / 10
- Latency avg/p95: 2803/5388 ms

## Lỗi nổi bật

- `cart_operation_trace_review:add:none`: 1
- `cart_operation_without_completed_tool`: 1
- `expected_refusal_or_clarification_review`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4705 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | fail | cart_action | 2373 | `cart_operation_trace_review:add:none`<br>`cart_operation_without_completed_tool` | Mình không tìm thấy sản phẩm đó trong catalog nên chưa thể thêm vào giỏ. Bạn kiểm tra lại tên sản phẩm hoặc chọn một sản phẩm đang có trong danh sách nhé. |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 2030 | - | Chào bạn, tôi đã kiểm tra giỏ hàng của bạn rồi. Hiện tại giỏ hàng của bạn đang có 1 dòng sản phẩm. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 2754 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng của bạn thành 3 sản phẩm rồi nhé. Tổng g |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 2191 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Chào bạn, tôi đã xóa sản phẩm thứ hai khỏi giỏ hàng rồi ạ. Hiện tại giỏ hàng của bạn đã trống. Bạn có muốn tôi hỗ trợ tìm kiếm hoặc thêm sản phẩm nào khác không? |
| A046 | auth-cart-direct | cart_status | pass | cart_status | 2137 | - | Chào bạn, sau khi xóa sản phẩm, giỏ hàng của bạn hiện đang trống ạ. Tổng tiền là 0 đồng. Bạn có muốn tôi giúp bạn tìm kiếm hoặc xem thêm sản phẩm nào khác không ạ? |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 5388 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Tôi đã giảm số lượng sản phẩm còn lại trong giỏ hàng của bạn xuống còn 1 cái. Hiện tại, giỏ hàng của bạn chỉ còn Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W với tổng giá trị là 2.340. |
| A048 | auth-cart-direct | cart_action | warn | cart_action | 2698 | `expected_refusal_or_clarification_review` | Mình không tìm thấy sản phẩm đó trong catalog nên chưa thể thêm vào giỏ. Bạn kiểm tra lại tên sản phẩm hoặc chọn một sản phẩm đang có trong danh sách nhé. |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1827 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | pass | cart_action | 1929 | - | Chào bạn, tôi đã hủy thao tác giỏ hàng đang chờ xác nhận theo yêu cầu của bạn rồi ạ. Hiện tại giỏ hàng của bạn vẫn còn 1 sản phẩm là Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W với tổng giá trị là 2.340.000 đồng. Bạn cần tôi hỗ trợ th |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
