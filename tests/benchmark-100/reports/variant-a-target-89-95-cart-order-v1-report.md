# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-89-95-cart-order-v1`
- Thời gian: 2026-05-27T13:32:33.818Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 7 pass, 0 warn, 0 fail / 7
- Latency avg/p95: 4230/11864 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A089 | product-detail | product | pass | recommend | 3852 | - | Chào bạn, với phòng 12m2, bạn có thể tham khảo Camera Wi-Fi TP-Link Tapo C200 để giám sát không gian. Ngoài ra, nếu bạn cần thiết bị nhà bếp, Nồi chiên không dầu AVA 5.5 lít cũng là một lựa chọn tốt. Bạn muốn tìm hiểu thêm về sản phẩm nào ạ? |
| A090 | product-detail | product | pass | recommend | 2538 | - | Chào bạn, để giảm bụi trong phòng ngủ, tôi gợi ý bạn xem Bóng đèn Philips Hue White Ambiance E27 nhé. |
| A091 | auth-mixed | product | pass | compare | 4057 | - | Chào bạn, tôi hiểu bạn đang phân vân về các thiết bị an ninh cho nhà thuê. Dựa trên nhu cầu của bạn, tôi xin giới thiệu hai sản phẩm đang có sẵn để bạn tham khảo: Aqara Door and Window Sensor P2 và Ổ cắm thông minh TP-Link Tapo P110.<br>Bạn muốn tôi cung cấp thêm |
| A092 | auth-mixed | history_followup | pass | compare | 11864 | - | Chào bạn, nếu bạn ưu tiên phương án ít phải khoan đục nhất thì Camera IP Ezviz H8C sẽ là lựa chọn phù hợp hơn. Bạn có thể xem thêm thông tin chi tiết về Camera IP Ezviz H8C và Nồi chiên không dầu Magic 6.5 lít A-805 nhé. |
| A093 | auth-mixed | history_cart | pass | cart_action | 2160 | - | Mình đang giữ lại Nồi chiên không dầu Magic 6.5 lít A-805 trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A094 | auth-mixed | policy | pass | policy | 3171 | - | Chào bạn, nếu sản phẩm bị lỗi cảm biến sau khi nhận, bạn có thể đổi trả theo Chính sách đổi trả 7 ngày của chúng tôi, áp dụng cho các sản phẩm bị lỗi từ nhà sản xuất. Bạn vui lòng kiểm tra kỹ sản phẩm khi nhận hàng nhé. |
| A095 | auth-mixed | cart_status | pass | cart_status | 1968 | - | Chào bạn, giỏ hàng của bạn hiện đang có sản phẩm Nồi chiên không dầu Magic 6.5 lít A-805 với số lượng là 1. Bạn có muốn tôi kiểm tra thêm thông tin gì về sản phẩm này không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
