# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-utf8-auth-history-2-v2`
- Thời gian: 2026-05-27T05:02:35.734Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 16 pass, 2 warn, 2 fail / 20
- Latency avg/p95: 2654/4931 ms

## Lỗi nổi bật

- `cart_operation_trace_review:cancel_pending:none`: 1
- `cart_operation_without_completed_or_pending_tool`: 1
- `cart_operation_without_completed_tool`: 1
- `intent_review:cart_action:expected_cart_status`: 1
- `intent_review:recommend:expected_product_detail`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A031 | auth-history-2 | product | pass | recommend | 3538 | - | Chào bạn, tôi hiểu bạn đang tìm combo bếp nhỏ gồm đồ nấu nhanh và đồ xay trong tầm giá khoảng 4 triệu.<br>Tôi có gợi ý Nồi chiên không dầu Electrolux 5 lít E6AF1-520K với giá 2.870.000 đồng. Bạn xem qua sản phẩm này và cho tôi biết thêm về nhu cầu cụ thể của mình |
| A032 | auth-history-2 | history_followup | warn | recommend | 4192 | `intent_review:recommend:expected_product_detail` | Camera Wi-Fi TP-Link Tapo C200 là sản phẩm phù hợp cho nhu cầu trông nhà cơ bản. Nó có các tính năng như Full HD, xoay 360 độ và đàm thoại 2 chiều. Bạn cần biết thêm chi tiết gì về sản phẩm này không ạ? |
| A033 | auth-history-2 | history_cart | pass | cart_action | 3424 | - | Đã thêm 1 × Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng.<br>Tôi đã thêm Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn có sản phẩm này với tổng giá là 490.000 đồng. Bạn có muốn tôi hỗ trợ thêm về sản phẩm này hay có nhu cầu  |
| A034 | auth-history-2 | history_followup | pass | compare | 2275 | - | Chào bạn, tôi hiểu bạn muốn so sánh sản phẩm vừa xem với món đắt nhất trong danh sách đang hiển thị. Trong khung đề xuất này, sản phẩm đắt nhất là Máy lọc không khí Levoit Core 200S 26W với giá 2.690.000 đồng. Bạn muốn so sánh chi tiết về tính năng hay giá cả  |
| A035 | auth-history-2 | cart_status | pass | cart_status | 3087 | - | Chào bạn, hiện tại giỏ hàng của bạn đang có 1 sản phẩm là Camera Wi-Fi TP-Link Tapo C200 với tổng giá 490.000 đồng. Về việc đây có phải là món rẻ nhất hay không, tôi chưa có thông tin so sánh trực tiếp. Bạn có muốn tôi kiểm tra lại các sản phẩm trong danh sách |
| A036 | auth-history-2 | history_cart | fail | cart_action | 1839 | `cart_operation_without_completed_tool` | Product is not in cart |
| A037 | auth-history-2 | history_followup | pass | recommend | 3815 | - | Chào bạn, tôi hiểu bạn đang tìm một thiết bị bếp nhỏ gọn hơn. Bạn có muốn xem Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR không ạ? Sản phẩm này có giá 2.890.000 đồng. Nếu bạn muốn tôi tìm thêm các lựa chọn khác, cứ cho tôi biết nhé. |
| A038 | auth-history-2 | history_cart | pass | cart_action | 2172 | - | Đã thêm 1 × Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng.<br>Tôi đã thêm Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn có hai sản phẩm với tổng giá là 3.380.000 đồng. Bạn có muốn tôi hỗ trợ thêm |
| A039 | auth-history-2 | cart_status | pass | cart_status | 1857 | - | Chào bạn, tổng tiền trong giỏ hàng của bạn hiện tại là 3.380.000 đồng. Giỏ hàng của bạn đang có hai sản phẩm là Camera Wi-Fi TP-Link Tapo C200 và Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR. Bạn cần tôi hỗ trợ thêm thông tin gì về các sản phẩm này không ạ? |
| A040 | auth-history-2 | cart_action | pass | cart_action | 1590 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4931 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | pass | cart_action | 2500 | - | Đã thêm 2 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Chào bạn, tôi đã thêm 2 sản phẩm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng của bạn rồi nhé. |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 1034 | - | Chào bạn, tôi đã kiểm tra giỏ hàng của bạn rồi nhé. Hiện tại giỏ hàng của bạn đang có 1 dòng sản phẩm. Tổng giá trị các sản phẩm trong giỏ là 7.020.000 đồng. |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 2798 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng của bạn lên 3 sản phẩm rồi nhé. Tổng giá |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 2001 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Chào bạn, tôi đã xóa sản phẩm thứ hai khỏi giỏ hàng rồi nhé. Hiện tại giỏ hàng của bạn đã trống. Bạn có muốn tôi hỗ trợ tìm kiếm hoặc thêm sản phẩm nào khác không ạ? |
| A046 | auth-cart-direct | cart_status | warn | cart_action | 1392 | `intent_review:cart_action:expected_cart_status` | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Chào bạn, sau khi xóa sản phẩm, giỏ hàng của bạn hiện đang trống hoàn toàn. Vì vậy, hiện tại không còn món nào trong giỏ và tổng tiền cũng là 0 đồng. Bạn có muốn tôi gi |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 4297 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Chào bạn, tôi đã điều chỉnh số lượng sản phẩm trong giỏ hàng của bạn xuống còn 1 chiếc rồi nhé. Hiện tại giỏ hàng của bạn chỉ còn Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W. Bạn cần  |
| A048 | auth-cart-direct | cart_action | pass | cart_action | 3093 | - | Đã thêm 1 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Xin lỗi, tôi không tìm thấy sản phẩm NASA Quantum Z9 trong hệ thống. Bạn có muốn tôi giúp bạn xem các sản phẩm khác không ạ? Hiện tại, chúng tôi có Máy lọc không kh |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1353 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | fail | cart_action | 1894 | `cart_operation_trace_review:cancel_pending:none`<br>`cart_operation_without_completed_or_pending_tool` | Bạn muốn hủy thao tác nào ạ? Vui lòng cho tôi biết rõ hơn để tôi có thể hỗ trợ bạn thực hiện yêu cầu này nhé. |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
