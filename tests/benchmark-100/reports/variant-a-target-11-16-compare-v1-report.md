# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-11-16-compare-v1`
- Thời gian: 2026-05-27T12:04:06.655Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 5 pass, 1 warn, 0 fail / 6
- Latency avg/p95: 3659/4824 ms

## Lỗi nổi bật

- `intent_review:recommend:expected_compare`: 1

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A011 | guest-discovery | product | pass | recommend | 2829 | - | Chào bạn, với nhu cầu tìm đồ bền, dễ bảo trì và giá tốt cho nhà thuê, tôi xin gợi ý Cân sức khỏe Beurer GS203. Bạn xem qua sản phẩm này và cho tôi biết nếu bạn cần tư vấn thêm về các mặt hàng khác nhé. |
| A012 | guest-discovery | product | pass | compare | 3146 | - | Chào bạn, với ngân sách 2 triệu, bạn có thể tham khảo một số sản phẩm này để làm quà cho mẹ nhé: Quạt sưởi Kangaroo KG730 và Máy lọc không khí Levoit Core Mini 7W. Bạn muốn xem chi tiết về sản phẩm nào ạ? |
| A013 | guest-discovery | compare | pass | compare | 3894 | - | Chào bạn, để giải quyết vấn đề phòng 25m2 nóng và bụi, bạn có thể tham khảo hai sản phẩm sau để so sánh: Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU và Quạt điều hòa Daikiosan DKA-04000C.<br>Bạn muốn tìm hiểu thêm về khả năng lọc bụi của máy lọc không k |
| A014 | guest-discovery | compare | pass | compare | 3957 | - | Chào bạn, để so sánh giữa robot hút bụi và máy hút bụi cầm tay cho nhà có thú cưng thì mỗi loại có ưu điểm riêng.<br>Hiện tại, trong các sản phẩm của chúng tôi, chúng tôi có hai mẫu máy hút bụi cầm tay rất tốt là Máy hút bụi cầm tay RAF R.8672 16000 Pa và Máy hút |
| A015 | guest-discovery | compare | warn | recommend | 4824 | `intent_review:recommend:expected_compare` | Chào bạn, tôi xin giải thích sự khác biệt giữa các thiết bị này nhé.<br>Camera cửa chủ yếu dùng để bạn quan sát trực tiếp những gì đang xảy ra ở cửa. Cảm biến cửa thì chỉ có chức năng báo hiệu khi cửa bị mở hay đóng. Còn bộ báo động mini thì có tác dụng cảnh báo  |
| A016 | guest-discovery | product | pass | recommend | 3302 | - | Chào bạn, với nhu cầu tìm sản phẩm tiết kiệm điện cho căn hộ nhỏ, tôi gợi ý bạn xem qua Nồi chiên không dầu Electrolux 5 lít E6AF1-520K ạ. Sản phẩm này đang còn hàng và có giá 2.870.000 đồng. Bạn xem qua và cho tôi biết nếu bạn cần tư vấn thêm về các mẫu khác  |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
