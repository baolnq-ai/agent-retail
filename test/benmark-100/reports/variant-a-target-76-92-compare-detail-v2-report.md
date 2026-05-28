# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-76-92-compare-detail-v2`
- Thời gian: 2026-05-27T12:41:41.582Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 17 pass, 0 warn, 0 fail / 17
- Latency avg/p95: 3763/9347 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A076 | auth-history-3 | product | pass | recommend | 3484 | - | Chào bạn, tôi hiểu bạn đang tìm các thiết bị smart home dễ lắp đặt và ưu tiên an toàn cửa ra vào. Tuy nhiên, hiện tại trong danh mục sản phẩm của chúng tôi, tôi chỉ có Máy xay sinh tố Philips HR2051/00. Bạn có muốn xem thông tin về sản phẩm này không ạ? |
| A077 | auth-history-3 | history_followup | pass | product_detail | 2144 | - | Tôi xin lỗi, tôi không tìm thấy thông tin cụ thể về việc "hub riêng" cho sản phẩm bạn đang đề cập. Bạn có thể cho tôi biết rõ hơn về sản phẩm thứ ba mà bạn đang hỏi được không ạ? Nếu bạn muốn, tôi có thể giới thiệu Quạt đứng Senko LTS1636 đang có trong khung đ |
| A078 | auth-history-3 | history_followup | pass | compare | 3910 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Nồi chiên không dầu AVA 5.5 lít 55K07A và Nồi chiên không dầu Sunhouse 6 lít SHD4026. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A079 | auth-history-3 | history_cart | pass | cart_action | 1419 | - | Đã thêm 1 × Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng.<br>Tôi đã thêm Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng của bạn rồi ạ. Đây là lựa chọn được đề xuất là dễ dùng nhất trong các sản phẩm chúng ta đang xem. Bạn cần tôi hỗ trợ thêm thông tin |
| A080 | auth-history-3 | cart_status | pass | cart_status | 2424 | - | Chào bạn, tôi thấy bạn đã thêm Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng rồi ạ. Sản phẩm này rất phù hợp vì nó là lựa chọn được đề xuất là dễ dùng nhất trong các món chúng ta đang xem. Với dung tích 5.5 lít, nó cũng rất tiện lợi cho gia đình 3-4 ngườ |
| A081 | auth-history-4 | product | pass | recommend | 4429 | - | Chào bạn, để tìm quà chăm sóc cá nhân cho bố mẹ mà dễ sử dụng, tôi gợi ý bạn xem Máy đo huyết áp Omron HEM-7121 nhé. Đây là thiết bị giúp theo dõi sức khỏe tại nhà rất tiện lợi. |
| A082 | auth-history-4 | history_followup | pass | compare | 2122 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Nồi chiên không dầu Kangaroo 8 lít KG8AF1A và Camera Wi-Fi TP-Link Tapo C200. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A083 | auth-history-4 | history_cart | pass | cart_action | 9347 | - | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A084 | auth-history-4 | history_followup | pass | recommend | 2216 | - | Bạn đang muốn tìm sản phẩm thay thế rẻ hơn món vừa thêm vào giỏ hàng phải không ạ? Hiện tại, tôi đang hiển thị Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR với giá 2.890.000 đồng. Bạn có muốn tôi tìm thêm các lựa chọn khác trong cùng danh mục Thiết bị nhà bếp |
| A085 | auth-history-4 | cart_action | pass | cart_action | 4797 | - | Đã xoá Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng.<br>Tôi đã xóa Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng giúp bạn rồi ạ. Hiện tại, giỏ hàng của bạn vẫn còn Nồi chiên không dầu Kangaroo 8 lít KG8AF1A. Bạn có muốn tôi tìm thêm s |
| A086 | product-detail | product_detail | pass | product_detail | 4619 | - | Mình đang giữ lại Máy lọc không khí Levoit Core Mini 7W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A087 | product-detail | product_detail | pass | product_detail | 3783 | - | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A088 | product-detail | compare | pass | compare | 2398 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Máy lọc không khí Levoit Core Mini 7W và Nồi chiên không dầu Magic 6.5 lít A-805. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A089 | product-detail | product | pass | recommend | 3333 | - | Chào bạn, với phòng 12m2, bạn có thể xem xét Camera Wi-Fi TP-Link Tapo C200 để giám sát hoặc Nồi chiên không dầu AVA 5.5 lít nếu bạn cần thiết bị nhà bếp. Bạn muốn tìm hiểu thêm về sản phẩm nào ạ? |
| A090 | product-detail | product | pass | recommend | 2244 | - | Chào bạn, để giảm bụi trong phòng ngủ, tôi gợi ý bạn xem Bóng đèn Philips Hue White Ambiance E27 nhé. |
| A091 | auth-mixed | product | pass | compare | 4053 | - | Chào bạn, tôi hiểu bạn đang phân vân về các thiết bị an ninh cho nhà thuê. Để bạn dễ hình dung, tôi xin giới thiệu hai sản phẩm đang có trong danh mục để bạn tham khảo nhé: Aqara Door and Window Sensor P2 và Ổ cắm thông minh TP-Link Tapo P110. Bạn muốn tôi cun |
| A092 | auth-mixed | history_followup | pass | compare | 7246 | - | Trong các sản phẩm bạn đang xem, Camera IP Ezviz H8C là lựa chọn ít cần khoan đục nhất vì nó được thiết kế để lắp đặt ngoài trời và có tính năng xoay 360 độ.<br>Bạn có muốn tôi cung cấp thêm thông tin chi tiết về Camera IP Ezviz H8C không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
