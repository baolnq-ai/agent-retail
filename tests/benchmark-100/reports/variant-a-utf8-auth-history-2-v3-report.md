# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-utf8-auth-history-2-v3`
- Thời gian: 2026-05-27T06:54:53.341Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 15 pass, 3 warn, 2 fail / 20
- Latency avg/p95: 2998/4844 ms

## Lỗi nổi bật

- `cart_operation_without_completed_or_pending_tool`: 2
- `cart_operation_trace_review:cancel_pending:none`: 1
- `cart_operation_trace_review:clear:none`: 1
- `cart_operation_trace_review:decrement_quantity:set_quantity`: 1
- `intent_review:cart_action:expected_cart_status`: 1
- `intent_review:recommend:expected_product_detail`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A031 | auth-history-2 | product | pass | recommend | 3419 | - | Chào bạn, tôi có gợi ý Nồi chiên không dầu Electrolux 5 lít E6AF1-520K với giá 2.870.000 đồng. Bạn xem qua sản phẩm này và cho tôi biết thêm nhu cầu cụ thể hơn nhé. |
| A032 | auth-history-2 | history_followup | warn | recommend | 3092 | `intent_review:recommend:expected_product_detail` | Chào bạn, bạn có thể cho mình biết bạn đang muốn hỏi về sản phẩm nào cụ thể trong các món đồ bếp được không ạ? Hiện tại, mình đang thấy sản phẩm Camera Wi-Fi TP-Link Tapo C200. |
| A033 | auth-history-2 | history_cart | pass | cart_action | 1554 | - | Đã thêm 1 × Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng.<br>Tôi đã thêm Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng của bạn rồi ạ. Bạn có muốn tôi hỗ trợ thêm về sản phẩm này hay tìm kiếm thêm món đồ nào khác không? |
| A034 | auth-history-2 | history_followup | pass | compare | 4710 | - | Chào bạn, bạn muốn so sánh Máy lọc không khí Levoit Core Mini 7W với sản phẩm đắt nhất trong danh sách này là Máy lọc không khí Levoit Core 200S 26W đúng không ạ?<br>Máy lọc không khí Levoit Core 200S 26W có giá 2.690.000 đồng. Bạn muốn tôi so sánh chi tiết hơn v |
| A035 | auth-history-2 | cart_status | pass | cart_status | 2635 | - | Chào bạn, hiện tại giỏ hàng của bạn đang có 1 sản phẩm là Camera Wi-Fi TP-Link Tapo C200 với tổng giá là 490.000 đồng. Để biết đây có phải là món rẻ nhất hay không, bạn vui lòng cho tôi biết bạn đang muốn so sánh với những sản phẩm nào ạ? |
| A036 | auth-history-2 | history_cart | warn | cart_action | 4844 | `cart_operation_trace_review:decrement_quantity:set_quantity` | Đã xoá Camera Wi-Fi TP-Link Tapo C200 khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm Camera Wi-Fi TP-Link Tapo C200 khỏi giỏ hàng của bạn rồi ạ. Hiện tại giỏ hàng của bạn đang trống. Bạn có muốn tôi tìm kiếm lại sản phẩm nào khác hay hỗ trợ bạn thêm thông tin gì không? |
| A037 | auth-history-2 | history_followup | pass | recommend | 4232 | - | Chào bạn, tôi hiểu bạn muốn tìm một món đồ bếp nhỏ gọn hơn nhưng vẫn đáp ứng nhu cầu nấu nhanh và xay. Dựa trên nhu cầu của bạn, tôi xin gợi ý Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR. Bạn xem qua sản phẩm này và cho tôi biết nếu bạn cần tư vấn thêm nhé. |
| A038 | auth-history-2 | history_cart | pass | cart_action | 3694 | - | Đã thêm 1 × Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng.<br>Tôi đã thêm Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng của bạn rồi ạ. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này hay tìm kiếm thêm món đồ nào khác không? |
| A039 | auth-history-2 | cart_status | pass | cart_status | 2253 | - | Chào bạn, tổng tiền trong giỏ hàng của bạn hiện tại là 2.890.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm hay muốn tìm kiếm thêm món đồ nào khác không ạ? |
| A040 | auth-history-2 | cart_action | fail | cart_action | 2115 | `cart_operation_trace_review:clear:none`<br>`cart_operation_without_completed_or_pending_tool` | Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không ạ? Thao tác này sẽ làm mất tất cả các sản phẩm bạn đã chọn. |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4617 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | pass | cart_action | 3342 | - | Đã thêm 2 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Mình đã thêm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng cho bạn rồi ạ. Hiện tại, giỏ hàng của bạn có 2 sản phẩm này. Bạn có  |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 1047 | - | Chào bạn, tôi đã kiểm tra giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn đang có 3 dòng sản phẩm. Bạn cần tôi hỗ trợ thêm thông tin gì về các sản phẩm này không? |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 2831 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng của bạn thành 3 sản phẩm rồi ạ. Hiện tại |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 4328 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn đang trống. Bạn có muố |
| A046 | auth-cart-direct | cart_status | warn | cart_action | 1315 | `intent_review:cart_action:expected_cart_status` | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 4457 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng của bạn thành 1 sản phẩm rồi ạ. Hiện tại, giỏ hàng của bạn chỉ còn sản phẩm này với tổng giá trị là |
| A048 | auth-cart-direct | cart_action | pass | cart_action | 2862 | - | Đã thêm 1 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Xin lỗi, tôi không tìm thấy sản phẩm NASA Quantum Z9 trong hệ thống. Tuy nhiên, tôi có thể giúp bạn thêm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5 |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1268 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | fail | cart_action | 1349 | `cart_operation_trace_review:cancel_pending:none`<br>`cart_operation_without_completed_or_pending_tool` | Tôi đã hủy thao tác giỏ hàng đang chờ xác nhận của bạn rồi ạ. Bạn có cần tôi hỗ trợ tìm kiếm hay thực hiện thao tác nào khác không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
