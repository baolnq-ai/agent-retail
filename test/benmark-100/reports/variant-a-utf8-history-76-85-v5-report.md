# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-utf8-history-76-85-v5`
- Thời gian: 2026-05-27T05:00:23.886Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 3000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 8 pass, 2 warn, 0 fail / 10
- Latency avg/p95: 3680/6192 ms

## Lỗi nổi bật

- `intent_review:recommend:expected_compare`: 2

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A076 | auth-history-3 | product | pass | recommend | 6192 | - | Chào bạn, hiện tại tôi chỉ có thông tin về Máy xay sinh tố Philips HR2051/00. Bạn có muốn tôi tìm kiếm thêm các sản phẩm khác hoặc điều chỉnh tiêu chí tìm kiếm không ạ? |
| A077 | auth-history-3 | history_followup | pass | product_detail | 2339 | - | Bạn có thể cho mình biết bạn đang hỏi về sản phẩm nào được không ạ? |
| A078 | auth-history-3 | history_followup | warn | recommend | 5411 | `intent_review:recommend:expected_compare` | Chào bạn, nếu bạn không rành về công nghệ thì tôi gợi ý bạn nên chọn những sản phẩm có tính năng đơn giản và dễ sử dụng. Trong ba chiếc nồi chiên không dầu này, bạn có thể tham khảo Nồi chiên không dầu AVA 5.5 lít 55K07A vì nó có thiết kế đơn giản, dễ làm quen |
| A079 | auth-history-3 | history_cart | pass | cart_action | 1239 | - | Đã thêm 1 × Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng.<br>Tôi đã thêm Nồi chiên không dầu AVA 5.5 lít 55K07A vào giỏ hàng của bạn rồi ạ. Bạn có muốn tôi hỗ trợ thêm thông tin gì về sản phẩm này hay muốn xem các sản phẩm khác không? |
| A080 | auth-history-3 | cart_status | pass | cart_status | 2128 | - | Chào bạn, trong giỏ hàng của bạn hiện có Nồi chiên không dầu AVA 5.5 lít 55K07A. Sản phẩm này rất phù hợp vì nó có thiết kế đơn giản, dễ làm quen, rất tiện lợi cho những người mới sử dụng. Bạn cần tôi hỗ trợ thêm thông tin gì về sản phẩm này không ạ? |
| A081 | auth-history-4 | product | pass | recommend | 4118 | - | Chào bạn, để tìm quà tặng chăm sóc cá nhân cho bố mẹ mà không quá phức tạp, tôi gợi ý bạn tham khảo các sản phẩm sau nhé:<br>Máy đo huyết áp Omron HEM-7121<br>Bạn xem các sản phẩm này để tham khảo thêm nha! |
| A082 | auth-history-4 | history_followup | warn | recommend | 4046 | `intent_review:recommend:expected_compare` | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A083 | auth-history-4 | history_cart | pass | cart_action | 4084 | - | Mình đang giữ lại Nồi chiên không dầu Kangaroo 8 lít KG8AF1A trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A084 | auth-history-4 | history_followup | pass | recommend | 2504 | - | Chào bạn, tôi hiểu bạn muốn tìm sản phẩm tương tự nhưng có giá tốt hơn món vừa thêm vào giỏ hàng. Hiện tại, tôi đang có gợi ý là Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR với giá 2.890.000 đồng. Bạn có muốn tôi so sánh sản phẩm này với các lựa chọn khác tr |
| A085 | auth-history-4 | cart_action | pass | cart_action | 4735 | - | Đã xoá Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng.<br>Tôi đã xóa Lò chiên không dầu Hawonkoo 18 lít AFH-180-GR khỏi giỏ hàng giúp bạn. Bạn muốn xem thêm sản phẩm nào khác không ạ? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
