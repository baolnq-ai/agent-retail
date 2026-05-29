# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-41-50-invalid-add-v2`
- Thời gian: 2026-05-27T14:28:06.977Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 10 pass, 0 warn, 0 fail / 10
- Latency avg/p95: 3044/8458 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A041 | auth-cart-direct | cart_action | pass | cart_action | 4919 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A042 | auth-cart-direct | cart_action | pass | cart_action | 3418 | - | Đã thêm 2 × Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng.<br>Mình đã thêm 2 sản phẩm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W vào giỏ hàng cho bạn rồi ạ. Bạn cần mình hỗ trợ thêm gì nữa không? |
| A043 | auth-cart-direct | cart_status | pass | cart_status | 1118 | - | Chào bạn, tôi đã kiểm tra giỏ hàng của bạn rồi ạ. Hiện tại giỏ hàng của bạn có tổng cộng 3 dòng sản phẩm. Bạn cần tôi hỗ trợ thêm thông tin gì về các sản phẩm này không? |
| A044 | auth-cart-direct | cart_action | pass | cart_action | 1287 | - | Đã cập nhật Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W thành số lượng 3.<br>Chào bạn, tôi đã cập nhật số lượng Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W trong giỏ hàng thành 3 sản phẩm rồi ạ. Bạn cần tôi hỗ t |
| A045 | auth-cart-direct | cart_action | pass | cart_action | 8458 | - | Đã xoá Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W khỏi giỏ hàng của bạn rồi ạ. Giỏ hàng của bạn hiện đã trống. Bạn có muốn tôi t |
| A046 | auth-cart-direct | cart_status | pass | cart_status | 1963 | - | Chào bạn, sau khi xóa sản phẩm, giỏ hàng của bạn hiện đã trống rồi ạ. Tổng tiền hiện tại là 0 đồng. Bạn có muốn tôi tìm kiếm sản phẩm nào khác cho bạn không? |
| A047 | auth-cart-direct | cart_action | pass | cart_action | 3825 | - | Mình đã cập nhật số lượng sản phẩm trong giỏ hàng.<br>Tôi đã điều chỉnh số lượng sản phẩm còn lại trong giỏ hàng của bạn xuống còn 1 chiếc. Hiện tại, giỏ hàng của bạn chỉ còn Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W. Bạn cần tôi hỗ tr |
| A048 | auth-cart-direct | cart_action | pass | cart_action | 2829 | - | Mình không tìm thấy sản phẩm đó trong catalog nên chưa thể thêm vào giỏ. Bạn kiểm tra lại tên sản phẩm hoặc chọn một sản phẩm đang có trong danh sách nhé. |
| A049 | auth-cart-direct | cart_action | pass | cart_action | 1215 | - | Mình sẽ xoá toàn bộ sản phẩm trong giỏ hàng. Trả lời "Đúng" để xác nhận hoặc "Huỷ" để bỏ qua. |
| A050 | auth-cart-direct | confirm_pending | pass | cart_action | 1403 | - | Chào bạn, tôi đã hủy thao tác giỏ hàng đang chờ xác nhận theo yêu cầu của bạn rồi ạ. Hiện tại giỏ hàng của bạn đang trống. Bạn có muốn tôi hỗ trợ tìm kiếm sản phẩm nào khác không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
