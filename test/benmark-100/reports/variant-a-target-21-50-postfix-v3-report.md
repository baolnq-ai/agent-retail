# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-21-50-postfix-v3`
- Thời gian: 2026-05-27T11:58:43.244Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 29 pass, 1 warn, 0 fail / 30
- Latency avg/p95: 3972/11991 ms

## Lỗi nổi bật

- `intent_review:recommend:expected_product_detail`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A021 | auth-history-1 | product | pass | recommend | 4135 | - | Mình đang giữ lại Máy lọc không khí Levoit Core 200S 26W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A022 | auth-history-1 | history_compare | pass | compare | 3374 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Camera IP Ezviz C6N và Máy sấy tóc Xiaomi Mijia H300. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A023 | auth-history-1 | history_cart | pass | cart_action | 1863 | - | Đã thêm 1 × Máy sấy tóc Xiaomi Mijia H300 vào giỏ hàng.<br>Mình đã thêm Máy sấy tóc Xiaomi Mijia H300 vào giỏ hàng của bạn rồi nhé. Hiện tại giỏ hàng của bạn có sản phẩm này với tổng cộng 690.000 đồng. Bạn cần mình hỗ trợ thêm về sản phẩm nào khác không? |
| A024 | auth-history-1 | cart_status | pass | cart_status | 2803 | - | Chào bạn, giỏ hàng của bạn hiện có 1 sản phẩm là Máy sấy tóc Xiaomi Mijia H300 với tổng cộng là 690.000 đồng. Bạn cần mình hỗ trợ thêm thông tin gì về sản phẩm này hay các mặt hàng khác không ạ? |
| A025 | auth-history-1 | history_cart | pass | cart_action | 12371 | - | Đã cập nhật Máy sấy tóc Xiaomi Mijia H300 thành số lượng 2.<br>Mình đã cập nhật số lượng Máy sấy tóc Xiaomi Mijia H300 lên 2 sản phẩm rồi bạn nhé. Hiện tại, tổng giá trị giỏ hàng của bạn là 1.380.000 đồng. Bạn cần mình hỗ trợ thêm thông tin gì về sản phẩm này hay |
| A026 | auth-history-1 | history_cart | pass | cart_action | 4847 | - | Đã xoá Máy sấy tóc Xiaomi Mijia H300 khỏi giỏ hàng.<br>Mình đã xóa Máy sấy tóc Xiaomi Mijia H300 khỏi giỏ hàng của bạn rồi nhé. Hiện tại giỏ hàng của bạn đang trống. Bạn có muốn mình hỗ trợ tìm kiếm hay tư vấn thêm sản phẩm nào khác không ạ? |
| A027 | auth-history-1 | history_followup | pass | recommend | 3623 | - | Mình đang giữ lại Bóng đèn Philips Hue White Ambiance E27 trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A028 | auth-history-1 | history_cart | pass | cart_action | 3962 | - | Mình đã thêm sản phẩm vào giỏ hàng.<br>Mình đã thêm 2 Bóng đèn Philips Hue White Ambiance E27 vào giỏ hàng cho bạn rồi nhé. Hiện tại, giỏ hàng của bạn có 2 Bóng đèn Philips Hue White Ambiance E27 với tổng cộng là 1.380.000 đồng. Bạn cần mình hỗ trợ thêm thông tin |
| A029 | auth-history-1 | cart_status | pass | cart_status | 2129 | - | Chào bạn, giỏ hàng hiện tại của bạn có 2 sản phẩm Bóng đèn Philips Hue White Ambiance E27 với tổng cộng là 1.380.000 đồng. Bạn cần mình kiểm tra thêm thông tin gì về các sản phẩm này không ạ? |
| A030 | auth-history-1 | cart_status | pass | cart_status | 3016 | - | Chào bạn, giỏ hàng của bạn hiện có 2 sản phẩm Bóng đèn Philips Hue White Ambiance E27 với tổng giá trị là 1.380.000 đồng. Bạn cần mình hỗ trợ thêm thông tin gì về các sản phẩm này không ạ? |
| A031 | auth-history-2 | product | pass | recommend | 3744 | - | Chào bạn, tôi hiểu bạn đang tìm combo bếp nhỏ có đồ nấu nhanh và đồ xay trong khoảng 4 triệu. Hiện tại, tôi có gợi ý Nồi chiên không dầu Electrolux 5 lít với giá 2.870.000 đồng. Bạn xem qua sản phẩm này và cho tôi biết thêm về nhu cầu cụ thể của mình nhé. |
| A032 | auth-history-2 | history_followup | warn | recommend | 3649 | `intent_review:recommend:expected_product_detail` | Camera Wi-Fi TP-Link Tapo C200 là dòng camera cơ bản, phù hợp để giám sát nhà cửa thông thường. Nếu bạn có nhu cầu sử dụng cụ thể hơn, ví dụ như cần góc quay rộng hơn hay tính năng thông minh nâng cao, bạn có thể cho tôi biết để tôi tư vấn sản phẩm phù hợp hơn |
| A033 | auth-history-2 | history_cart | pass | cart_action | 3379 | - | Đã thêm 1 × Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng.<br>Tôi đã thêm Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng của bạn rồi nhé. Hiện tại, giỏ hàng của bạn có sản phẩm này với tổng giá 490.000 đồng. Bạn cần tôi hỗ trợ thêm về sản phẩm này hay muốn tìm kiếm th |
| A034 | auth-history-2 | history_followup | pass | compare | 8069 | - | Chào bạn, bạn muốn so sánh sản phẩm rẻ nhất trong danh sách ban đầu với món đắt nhất trong khung đề xuất đúng không ạ? Trong khung đề xuất hiện tại, sản phẩm đắt nhất là Máy lọc không khí Levoit Core 200S 26W với giá 2.690.000 đồng. Bạn muốn tôi so sánh sản ph |
| A035 | auth-history-2 | cart_status | pass | cart_status | 2678 | - | Chào bạn, hiện tại giỏ hàng của bạn đang có 1 sản phẩm là Camera Wi-Fi TP-Link Tapo C200 với tổng giá 490.000 đồng. Để biết đây có phải là món rẻ nhất hay không, bạn vui lòng cho tôi biết bạn đang muốn so sánh với những sản phẩm nào nhé. |
| A036 | auth-history-2 | history_cart | pass | cart_action | 11991 | - | Đã xoá Máy lọc không khí Levoit Core Mini 7W khỏi giỏ hàng.<br>Tôi đã cập nhật giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn chỉ còn sản phẩm Camera Wi-Fi TP-Link Tapo C200 với tổng giá 490.000 đồng.<br>Bạn có muốn xem thêm các sản phẩm khác như Máy lọc không k |
| A037 | auth-history-2 | history_followup | pass | recommend | 4367 | - | Chào bạn, tôi hiểu bạn muốn tìm một lựa chọn thay thế ít chiếm diện tích hơn. Với nhu cầu của bạn, tôi gợi ý bạn xem qua Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR. Sản phẩm này có giá 2.890.000 đồng. Bạn muốn tôi cung cấp thêm thông tin gì về sản phẩm này  |
| A038 | auth-history-2 | history_cart | pass | cart_action | 3912 | - | Đã thêm 1 × Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng.<br>Tôi đã thêm Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn có hai sản phẩm với tổng giá là 3.380.000 đồng. Bạn cần tôi hỗ trợ thêm về  |
| A039 | auth-history-2 | cart_status | pass | cart_status | 2017 | - | Chào bạn, tổng tiền trong giỏ hàng của bạn hiện tại là 3.380.000 đồng. Giỏ hàng của bạn đang có hai sản phẩm là Camera Wi-Fi TP-Link Tapo C200 và Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR. Bạn cần tôi hỗ trợ thêm thông tin gì về các sản phẩm này không ạ? |
| A040 | auth-history-2 | cart_action | pass | cart_action | 1891 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4696 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | pass | cart_action | 4576 | - | Đã thêm 2 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Chào bạn, tôi đã thêm sản phẩm làm mát dưới 2 triệu vào giỏ hàng cho bạn rồi ạ. Hiện tại, giỏ hàng của bạn có Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU  |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 2222 | - | Chào bạn, tôi kiểm tra giỏ hàng và thấy hiện tại bạn có 1 dòng sản phẩm. Tổng giá trị trong giỏ hàng của bạn là 7.020.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 2882 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng thành 3 sản phẩm rồi ạ. Hiện tại, tổng g |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 2581 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng của bạn rồi ạ. Giỏ hàng của bạn hiện đang trống. Bạn cần tôi hỗ  |
| A046 | auth-cart-direct | cart_status | pass | cart_status | 2097 | - | Chào bạn, sau khi xóa sản phẩm, giỏ hàng của bạn hiện đang trống. Tổng tiền là 0 đồng. Bạn có muốn tôi giúp bạn tìm kiếm sản phẩm nào khác không ạ? |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 5099 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Chào bạn, tôi đã điều chỉnh giỏ hàng của bạn còn 1 chiếc Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W rồi ạ. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không? |
| A048 | auth-cart-direct | cart_action | pass | cart_action | 3035 | - | Đã thêm 1 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Xin lỗi, tôi không tìm thấy sản phẩm NASA Quantum Z9 trong hệ thống. Tuy nhiên, tôi có thể giúp bạn thêm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5 |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1923 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | pass | cart_action | 2223 | - | Tôi đã hủy thao tác giỏ hàng đang chờ xác nhận theo yêu cầu của bạn rồi ạ. Hiện tại, giỏ hàng của bạn đang trống. Bạn có muốn tôi hỗ trợ tìm kiếm sản phẩm nào khác không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
