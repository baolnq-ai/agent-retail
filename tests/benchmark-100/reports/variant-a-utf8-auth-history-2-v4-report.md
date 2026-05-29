# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-utf8-auth-history-2-v4`
- Thời gian: 2026-05-27T07:59:15.276Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 17 pass, 3 warn, 0 fail / 20
- Latency avg/p95: 2767/4762 ms

## Lỗi nổi bật

- `cart_operation_trace_review:decrement_quantity:set_quantity`: 1
- `intent_review:cart_action:expected_cart_status`: 1
- `intent_review:recommend:expected_product_detail`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A031 | auth-history-2 | product | pass | recommend | 3320 | - | Chào bạn, tôi có gợi ý Nồi chiên không dầu Electrolux 5 lít với giá 2.870.000 đồng. Bạn xem qua sản phẩm này và cho tôi biết thêm về nhu cầu cụ thể của mình nhé. |
| A032 | auth-history-2 | history_followup | warn | recommend | 3426 | `intent_review:recommend:expected_product_detail` | Chào bạn, sản phẩm Camera Wi-Fi TP-Link Tapo C200 là sản phẩm duy nhất hiện tại trong danh sách này. Vì chỉ có một sản phẩm nên tôi chưa thể so sánh nhược điểm của nó với các sản phẩm khác được. Bạn có muốn tôi tìm thêm các sản phẩm khác trong danh mục Nhà thô |
| A033 | auth-history-2 | history_cart | pass | cart_action | 1681 | - | Đã thêm 1 × Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng.<br>Chào bạn, tôi đã thêm Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng của bạn rồi nhé. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này hay muốn tìm thêm món nào khác không? |
| A034 | auth-history-2 | history_followup | pass | compare | 3756 | - | Chào bạn, bạn muốn so sánh sản phẩm nào với Máy lọc không khí Levoit Core 200S 26W, sản phẩm đắt nhất trong danh sách này ạ? Chúng ta có Máy lọc không khí Levoit Core Mini 7W để so sánh nhé. |
| A035 | auth-history-2 | cart_status | pass | cart_status | 2946 | - | Chào bạn, hiện tại giỏ hàng của bạn đang có 1 sản phẩm với tổng giá là 490.000 đồng. Tôi xin lỗi, tôi không thể xác nhận ngay đây có phải là món rẻ nhất hay không vì tôi không có thông tin so sánh giá với các sản phẩm khác. Bạn cần tôi hỗ trợ kiểm tra thêm thô |
| A036 | auth-history-2 | history_cart | warn | cart_action | 4699 | `cart_operation_trace_review:decrement_quantity:set_quantity` | Đã xoá Camera Wi-Fi TP-Link Tapo C200 khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm đó khỏi giỏ hàng rồi ạ. Bạn có muốn xem lại các sản phẩm khác như Camera Wi-Fi TP-Link Tapo C200 không ạ? |
| A037 | auth-history-2 | history_followup | pass | recommend | 3714 | - | Chào bạn, tôi hiểu bạn muốn tìm một lựa chọn nhỏ gọn hơn. Với nhu cầu bếp nhỏ, tôi gợi ý bạn xem qua Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR nhé. Bạn muốn tôi tìm thêm sản phẩm nào khác không ạ? |
| A038 | auth-history-2 | history_cart | pass | cart_action | 2494 | - | Đã thêm 1 × Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng.<br>Chào bạn, tôi đã thêm Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR vào giỏ hàng của bạn rồi nhé. Hiện tại giỏ hàng của bạn có sản phẩm này với tổng giá là 2.890.000 đồng. Bạn cần tôi hỗ t |
| A039 | auth-history-2 | cart_status | pass | cart_status | 1713 | - | Chào bạn, tổng tiền trong giỏ hàng của bạn hiện tại là 2.890.000 đồng. Sản phẩm duy nhất trong giỏ là Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A040 | auth-history-2 | cart_action | pass | cart_action | 2565 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4762 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | pass | cart_action | 3565 | - | Đã thêm 2 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Mình đã thêm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng cho bạn rồi ạ. Bạn cần mình hỗ trợ tìm thêm sản phẩm nào khác không  |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 2303 | - | Chào bạn, tôi đã kiểm tra giỏ hàng của bạn rồi ạ. Hiện tại giỏ hàng của bạn đang có 1 dòng sản phẩm. Tổng giá trị là 7.020.000 đồng. Bạn cần tôi hỗ trợ thêm thông tin gì về các sản phẩm này không ạ? |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 1515 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng thành 3 sản phẩm rồi ạ. Tổng giá trị giỏ |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 1263 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm thứ hai khỏi giỏ hàng theo yêu cầu của bạn rồi ạ. Hiện tại giỏ hàng của bạn đang trống. Bạn có muốn tôi hỗ trợ tìm kiếm hoặc thêm sản phẩm nào khác  |
| A046 | auth-cart-direct | cart_status | warn | cart_action | 1373 | `intent_review:cart_action:expected_cart_status` | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Chào bạn, sau khi xóa sản phẩm thứ hai, giỏ hàng của bạn hiện đang trống ạ. Vì giỏ hàng không còn sản phẩm nào nên tôi không thể cung cấp tổng tiền được. Bạn có muốn tô |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 4265 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Tôi đã điều chỉnh số lượng sản phẩm còn lại trong giỏ hàng của bạn xuống còn 1 chiếc. Hiện tại, giỏ hàng của bạn chỉ còn Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W với tổng giá trị l |
| A048 | auth-cart-direct | cart_action | pass | cart_action | 2995 | - | Đã thêm 1 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Xin lỗi, tôi không tìm thấy sản phẩm NASA Quantum Z9 trong hệ thống. Bạn có muốn tôi giúp bạn xem các sản phẩm khác không ạ? Hiện tại, chúng tôi có Máy lọc không kh |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1458 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | pass | cart_action | 1521 | - | Bạn muốn hủy thao tác giỏ hàng đang chờ xác nhận phải không ạ? Tôi đã thực hiện hủy thao tác đó theo yêu cầu của bạn rồi nhé. Bạn cần tôi hỗ trợ tìm kiếm hay thay đổi gì khác trong giỏ hàng không ạ? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
