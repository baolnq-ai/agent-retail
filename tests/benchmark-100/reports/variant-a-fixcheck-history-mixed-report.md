# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-fixcheck-history-mixed`
- Thời gian: 2026-05-27T01:50:55.683Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 12 pass, 4 warn, 4 fail / 20
- Latency avg/p95: 3026/4577 ms

## Lỗi nổi bật

- `intent_review:recommend:expected_compare`: 3
- `cart_operation_without_completed_tool`: 2
- `cart_operation_trace_review:add:none`: 1
- `cart_operation_trace_review:remove:none`: 1
- `empty_product_list`: 1
- `intent_review:cart_status:expected_cart_action`: 1
- `intent_review:recommend:expected_policy`: 1
- `intent_review:recommend:expected_product_detail`: 1
- `intent_review:smalltalk:expected_product_detail`: 1
- `missing_expected_agent:customer-support-agent`: 1
- `missing_expected_agent:search-agent`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A076 | auth-history-3 | product | pass | recommend | 3107 | - | Chào bạn, hiện tại tôi chỉ có gợi ý Máy xay sinh tố Philips HR2051/00. Bạn có muốn xem thông tin chi tiết về sản phẩm này không ạ? |
| A077 | auth-history-3 | history_followup | fail | smalltalk | 2244 | `empty_product_list`<br>`missing_expected_agent:search-agent`<br>`intent_review:smalltalk:expected_product_detail` | Bạn vui lòng cho mình biết bạn đang hỏi về sản phẩm nào được không ạ? Để mình hỗ trợ bạn chính xác nhất nhé. |
| A078 | auth-history-3 | history_followup | warn | recommend | 4300 | `intent_review:recommend:expected_compare` | Chào bạn, nếu bạn không rành về công nghệ thì tôi gợi ý bạn nên chọn những mẫu có thao tác đơn giản và dễ sử dụng nhất. Bạn có thể tham khảo ba lựa chọn này nhé: Nồi chiên không dầu AVA 5.5 lít 55K07A, Nồi chiên không dầu Sunhouse 6 lít SHD4026 và Nồi chiên kh |
| A079 | auth-history-3 | history_cart | fail | cart_action | 1294 | `cart_operation_trace_review:add:none`<br>`cart_operation_without_completed_tool` | Mình chưa xác định được sản phẩm cần thao tác, bạn nói rõ tên sản phẩm hoặc vị trí trong giỏ giúp mình nhé. |
| A080 | auth-history-3 | cart_status | pass | cart_status | 1686 | - | Chào bạn, hiện tại giỏ hàng của bạn đang trống nên tôi chưa thể kiểm tra món nào đã được thêm vào. Bạn vui lòng cho tôi biết bạn muốn kiểm tra sản phẩm nào được không ạ? Tôi sẵn lòng hỗ trợ bạn tìm hiểu thêm về sản phẩm đó nhé. |
| A081 | auth-history-4 | product | pass | recommend | 4128 | - | Chào bạn, để tìm quà tặng chăm sóc cá nhân cho bố mẹ mà không quá phức tạp, tôi gợi ý bạn tham khảo Máy đo huyết áp Omron HEM-7121. Đây là sản phẩm rất thiết thực để bố mẹ theo dõi sức khỏe tại nhà.<br>Bạn cũng có thể xem thêm các sản phẩm khác trong khung đề xuấ |
| A082 | auth-history-4 | history_followup | warn | recommend | 3662 | `intent_review:recommend:expected_compare` | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A083 | auth-history-4 | history_cart | pass | cart_action | 1789 | - | Đã thêm 1 × Cân thông minh Xiaomi Body Composition Scale S400 vào giỏ hàng.<br>Tôi đã thêm Cân thông minh Xiaomi Body Composition Scale S400 vào giỏ hàng của bạn rồi ạ. Sản phẩm này thuộc danh mục chăm sóc cá nhân và có thể phù hợp với nhu cầu của người lớn tuổi. |
| A084 | auth-history-4 | history_followup | pass | recommend | 3523 | - | Dựa trên sản phẩm bạn vừa xem, tôi có một vài gợi ý khác trong danh mục Thiết bị nhà bếp mà bạn có thể quan tâm, ví dụ như Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR với giá 2.890.000 đồng. Bạn muốn xem thêm thông tin về sản phẩm này hay muốn tôi tìm kiếm n |
| A085 | auth-history-4 | cart_action | fail | cart_status | 2586 | `intent_review:cart_status:expected_cart_action`<br>`cart_operation_trace_review:remove:none`<br>`cart_operation_without_completed_tool` | Bạn muốn xóa món vừa thêm khỏi giỏ hàng để cân nhắc thêm ạ? Hiện tại giỏ hàng của bạn có Cân thông minh Xiaomi Body Composition Scale S400. Bạn có muốn tôi xóa sản phẩm này không? |
| A086 | product-detail | product_detail | pass | product_detail | 4577 | - | Mình đang giữ lại Máy lọc không khí Levoit Core Mini 7W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A087 | product-detail | product_detail | warn | recommend | 3156 | `intent_review:recommend:expected_product_detail` | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A088 | product-detail | compare | pass | compare | 4471 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Máy lọc không khí Levoit Core Mini 7W và Nồi chiên không dầu Magic 6.5 lít A-805. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mình lọc tiếp. |
| A089 | product-detail | product | pass | recommend | 3837 | - | Chào bạn, với phòng 12m2, tôi gợi ý hai sản phẩm phù hợp tùy theo nhu cầu của bạn. Bạn có thể xem xét Camera Wi-Fi TP-Link Tapo C200 để giám sát không gian hoặc Nồi chiên không dầu AVA 5.5 lít 55K07A nếu bạn cần thiết bị nhà bếp. Bạn muốn tìm hiểu thêm về sản  |
| A090 | product-detail | product | pass | recommend | 2264 | - | Chào bạn, để giảm bụi trong phòng ngủ, tôi gợi ý bạn xem Bóng đèn Philips Hue White Ambiance E27 nhé. |
| A091 | auth-mixed | product | pass | compare | 3935 | - | Chào bạn, tôi hiểu bạn đang phân vân về các thiết bị an ninh cho nhà thuê. Để bạn dễ hình dung, tôi xin giới thiệu hai sản phẩm đang có trong danh mục để bạn tham khảo: Aqara Door and Window Sensor P2 và Ổ cắm thông minh TP-Link Tapo P110. Bạn muốn tôi cung cấ |
| A092 | auth-mixed | history_followup | warn | recommend | 3172 | `intent_review:recommend:expected_compare` | Nếu bạn muốn phương án ít phải khoan đục nhất, tôi gợi ý bạn xem qua Camera IP Ezviz H8C. Sản phẩm này thuộc danh mục Nhà thông minh và phù hợp để lắp đặt ngoài trời mà không cần khoan đục phức tạp. Bạn có muốn tôi cung cấp thêm thông tin chi tiết về camera nà |
| A093 | auth-mixed | history_cart | pass | cart_action | 1861 | - | Mình đang giữ lại Máy lọc không khí Xiaomi Smart Air Purifier 4 Compact EU (BHR5860EU) 27W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A094 | auth-mixed | policy | fail | recommend | 3000 | `missing_expected_agent:customer-support-agent`<br>`intent_review:recommend:expected_policy` | Chào bạn, nếu sản phẩm bị lỗi cảm biến sau khi nhận, bạn có thể áp dụng Chính sách đổi trả 7 ngày của bên mình, áp dụng cho các sản phẩm bị lỗi từ nhà sản xuất.<br>Bạn có thể xem qua các sản phẩm như Bàn chải điện Xiaomi Mijia T500 nếu bạn cần tham khảo thêm nhé. |
| A095 | auth-mixed | cart_status | pass | cart_status | 1923 | - | Chào bạn, giỏ hàng của bạn hiện đang có Máy lọc không khí Xiaomi Smart Air Purifier 4 Compact EU (BHR5860EU) 27W với số lượng là 1 sản phẩm. Bạn cần kiểm tra thêm thông tin gì về sản phẩm này hay muốn xem các sản phẩm khác không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
