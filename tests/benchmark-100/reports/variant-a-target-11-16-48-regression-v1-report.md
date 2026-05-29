# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-11-16-48-regression-v1`
- Thời gian: 2026-05-27T14:21:36.124Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 6 pass, 0 warn, 0 fail / 6
- Latency avg/p95: 3915/4674 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A011 | guest-discovery | product | pass | recommend | 3048 | - | Chào bạn, với nhu cầu tìm đồ bền, dễ bảo trì và giá tốt thì bạn có thể tham khảo Cân sức khỏe Beurer GS203. Sản phẩm này thuộc nhóm chăm sóc cá nhân với giá 590.000 đồng và có chế độ bảo hành 12 tháng. Bạn xem qua sản phẩm này nhé. |
| A012 | guest-discovery | product | pass | compare | 4674 | - | Chào bạn, với ngân sách 2 triệu và muốn chọn quà cho mẹ, bạn có thể tham khảo một vài sản phẩm này nhé. Bạn xem Quạt sưởi Kangaroo KG730 với giá 690.000 đồng hoặc Máy lọc không khí Levoit Core Mini 7W với giá 1.290.000 đồng. Hai sản phẩm này đều rất thiết thực |
| A013 | guest-discovery | compare | pass | compare | 3917 | - | Chào bạn, để giải quyết vấn đề phòng 25m2 nóng và bụi, bạn có thể tham khảo hai sản phẩm sau để so sánh nhé:<br>Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W và Quạt điều hòa Daikiosan DKA-04000C.<br>Bạn xem thông tin chi tiết của hai sản phẩ |
| A014 | guest-discovery | compare | pass | compare | 4280 | - | Chào bạn, để so sánh robot hút bụi và máy hút bụi cầm tay cho nhà có thú cưng thì mỗi loại có ưu điểm riêng.<br>Hiện tại, tôi đang có hai mẫu máy hút bụi cầm tay bạn có thể tham khảo: Máy hút bụi cầm tay RAF R.8672 16000 Pa và Máy hút bụi cầm tay Deerma DX700 150 |
| A015 | guest-discovery | compare | pass | compare | 4504 | - | Chào bạn, về các thiết bị an ninh như camera cửa, cảm biến cửa và bộ báo động mini thì chúng có các chức năng khác nhau tùy vào nhu cầu bảo vệ của bạn.<br>Trong các sản phẩm hiện có, chúng tôi có Camera Wi-Fi TP-Link Tapo C200. Camera này rất phù hợp để bạn theo  |
| A016 | guest-discovery | product | pass | recommend | 3068 | - | Mình đang giữ lại Nồi chiên không dầu Electrolux 5 lít E6AF1-520K trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
