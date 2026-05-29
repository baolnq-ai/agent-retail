# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-76-92-compare-detail-v1`
- Thời gian: 2026-05-27T12:12:41.808Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 13 pass, 4 warn, 0 fail / 17
- Latency avg/p95: 5408/28528 ms

## Lỗi nổi bật

- `intent_review:recommend:expected_compare`: 2
- `intent_review:product_detail:expected_compare`: 1
- `intent_review:recommend:expected_product_detail`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A076 | auth-history-3 | product | pass | recommend | 10628 | - | Chào bạn, để đảm bảo an toàn cho cửa ra vào, bạn có thể tham khảo các sản phẩm trong danh mục an ninh nhà thông minh. Hiện tại, tôi có Máy xay sinh tố Philips HR2051/00. Bạn có muốn xem thông tin chi tiết về sản phẩm này không ạ? |
| A077 | auth-history-3 | history_followup | pass | product_detail | 2304 | - | Bạn vui lòng cho mình biết bạn đang hỏi về sản phẩm nào được không ạ? Để mình tư vấn chính xác nhất cho bạn nhé. |
| A078 | auth-history-3 | history_followup | warn | recommend | 2111 | `intent_review:recommend:expected_compare` | Chào bạn, vì bạn không rành công nghệ nên tôi sẽ gợi ý những sản phẩm dễ sử dụng nhất trong ba chiếc nồi chiên này. Cả ba đều là nồi chiên không dầu, rất tiện lợi cho việc chiên nướng hàng ngày. Bạn có thể tham khảo khung đề xuất để so sánh về dung tích và giá |
| A079 | auth-history-3 | history_cart | pass | cart_action | 1322 | - | Đã thêm 1 × Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng.<br>Tôi đã thêm Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng của bạn rồi ạ. Bạn có muốn xem thêm thông tin chi tiết về sản phẩm này hay cần tôi hỗ trợ thêm gì khác không? |
| A080 | auth-history-3 | cart_status | pass | cart_status | 2436 | - | Chào bạn, món bạn vừa thêm vào giỏ là Nồi chiên không dầu AVA 5.5 lít 55K07A. Sản phẩm này rất phù hợp vì nó là thiết bị nhà bếp tiện lợi, có dung tích 5.5 lít, lý tưởng cho gia đình 3-4 người. Bạn có muốn tôi cung cấp thêm thông tin chi tiết về sản phẩm này k |
| A081 | auth-history-4 | product | pass | recommend | 4094 | - | Chào bạn, để tìm quà chăm sóc cá nhân cho bố mẹ mà dễ sử dụng, tôi gợi ý bạn tham khảo Máy đo huyết áp Omron HEM-7121. Đây là thiết bị giúp theo dõi sức khỏe tại nhà rất tiện lợi. Bạn xem thêm các sản phẩm khác trong khung đề xuất để có lựa chọn phù hợp nhất n |
| A082 | auth-history-4 | history_followup | warn | product_detail | 2947 | `intent_review:product_detail:expected_compare` | Chào bạn, để tư vấn chính xác hơn cho người lớn tuổi, bạn có thể cho mình biết thêm về nhu cầu của họ được không ạ? Ví dụ như họ cần thiết bị để nấu ăn, hay cần các sản phẩm hỗ trợ sinh hoạt khác?<br>Hiện tại, trong danh sách sản phẩm có Nồi chiên không dầu Kanga |
| A083 | auth-history-4 | history_cart | pass | cart_action | 10124 | - | Đã thêm 1 × Nồi chiên không dầu Kangaroo 8 lít KG8AF1A vào giỏ hàng.<br>Tôi đã thêm Nồi chiên không dầu Kangaroo 8 lít KG8AF1A vào giỏ hàng của bạn rồi ạ. |
| A084 | auth-history-4 | history_followup | pass | recommend | 3527 | - | Chào bạn, tôi hiểu bạn đang tìm sản phẩm tương tự với mức giá tốt hơn. Hiện tại, tôi có Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR với giá 2.890.000 đồng. Bạn có muốn xem thêm thông tin về sản phẩm này để so sánh không ạ? |
| A085 | auth-history-4 | cart_action | pass | cart_action | 4520 | - | Đã xoá Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng.<br>Tôi đã xóa Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn chỉ còn Nồi chiên không dầu Kangaroo 8 lít. Bạn có muốn tôi hỗ trợ tìm kiếm hay |
| A086 | product-detail | product_detail | pass | product_detail | 3059 | - | Mình đang giữ lại Máy lọc không khí Levoit Core Mini 7W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A087 | product-detail | product_detail | warn | recommend | 28528 | `intent_review:recommend:expected_product_detail` | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A088 | product-detail | compare | pass | compare | 3375 | - | Chào bạn, để mình tư vấn chính xác hơn, bạn có thể cho mình biết thêm về không gian sống và nhu cầu ưu tiên của bạn được không ạ?<br>Nếu bạn quan tâm đến việc làm sạch không khí, bạn có thể tham khảo Máy lọc không khí Levoit Core Mini 7W. Còn nếu bạn muốn tìm giả |
| A089 | product-detail | product | pass | recommend | 3472 | - | Chào bạn, với phòng 12m2, tôi gợi ý hai sản phẩm phù hợp để bạn tham khảo. Bạn có thể xem xét Camera Wi-Fi TP-Link Tapo C200 để giám sát hoặc Nồi chiên không dầu AVA 5.5 lít 55K07A cho khu vực bếp. Bạn muốn tìm hiểu thêm về sản phẩm nào ạ? |
| A090 | product-detail | product | pass | recommend | 2260 | - | Chào bạn, để giảm bụi trong phòng ngủ, tôi gợi ý bạn xem Bóng đèn Philips Hue White Ambiance E27 nhé. |
| A091 | auth-mixed | product | pass | compare | 4010 | - | Chào bạn, tôi hiểu bạn đang phân vân về các thiết bị an ninh cho nhà thuê. Để bạn dễ dàng so sánh, tôi xin giới thiệu hai sản phẩm đang có sẵn: Aqara Door and Window Sensor P2 và Ổ cắm thông minh TP-Link Tapo P110. Bạn muốn tôi cung cấp thêm thông tin chi tiết |
| A092 | auth-mixed | history_followup | warn | recommend | 3225 | `intent_review:recommend:expected_compare` | Chào bạn, nếu bạn muốn phương án ít phải khoan đục nhất, bạn có thể tham khảo Camera IP Ezviz H8C. Sản phẩm này thuộc danh mục Nhà thông minh và rất phù hợp để lắp đặt ngoài trời cho sân trước hoặc ban công. Bạn có muốn tôi cung cấp thêm thông tin chi tiết về  |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
