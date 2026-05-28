# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-31-36-detail-fix-v1`
- Thời gian: 2026-05-27T12:02:48.807Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 6 pass, 0 warn, 0 fail / 6
- Latency avg/p95: 3940/6489 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A031 | auth-history-2 | product | pass | recommend | 3591 | - | Chào bạn, tôi có gợi ý Nồi chiên không dầu Electrolux 5 lít với giá 2.870.000 đồng. Bạn xem qua sản phẩm này và cho tôi biết thêm về nhu cầu cụ thể của mình nhé. |
| A032 | auth-history-2 | history_followup | pass | product_detail | 3842 | - | Chào bạn, sản phẩm Camera Wi-Fi TP-Link Tapo C200 hiện tại là lựa chọn duy nhất được hiển thị. Với mức giá 490.000 đồng, sản phẩm này thuộc danh mục Nhà thông minh và được thiết kế chủ yếu cho nhu cầu trông nhà cơ bản. Bạn có muốn tôi tìm kiếm các sản phẩm khá |
| A033 | auth-history-2 | history_cart | pass | cart_action | 3420 | - | Đã thêm 1 × Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng.<br>Tôi đã thêm Camera Wi-Fi TP-Link Tapo C200 vào giỏ hàng của bạn rồi ạ. Hiện tại, giỏ hàng của bạn có tổng cộng 490.000 đồng. Bạn cần tôi hỗ trợ thêm về sản phẩm này hay muốn tìm kiếm thêm món nào khác kh |
| A034 | auth-history-2 | history_followup | pass | compare | 6489 | - | Chào bạn, bạn muốn so sánh sản phẩm này với sản phẩm đắt nhất trong danh sách này đúng không ạ? Sản phẩm đắt nhất là Máy lọc không khí Levoit Core 200S 26W với giá 2.690.000 đồng. Bạn muốn tôi cung cấp thêm thông tin chi tiết về hai sản phẩm này để bạn dễ dàng |
| A035 | auth-history-2 | cart_status | pass | cart_status | 3146 | - | Chào bạn, hiện tại giỏ hàng của bạn đang có 1 sản phẩm là Camera Wi-Fi TP-Link Tapo C200 với tổng giá là 490.000 đồng. Về việc đây có phải là món rẻ nhất hay không, tôi chưa có thông tin so sánh giá của các sản phẩm bạn đã xem trước đó. Bạn có muốn tôi kiểm tr |
| A036 | auth-history-2 | history_cart | pass | cart_action | 3153 | - | Đã xoá Camera Wi-Fi TP-Link Tapo C200 khỏi giỏ hàng.<br>Tôi đã xóa sản phẩm đó khỏi giỏ hàng rồi ạ. Bạn có muốn tôi tìm kiếm sản phẩm nào khác hay hỗ trợ bạn về vấn đề gì khác không? Ví dụ như Camera Wi-Fi TP-Link Tapo C200. |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
