# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-target-11-16-compare-v2`
- Thời gian: 2026-05-27T12:09:18.665Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\test\benmark-100\cases\variant-a.json`
- Delay giữa request: 5000 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 6 pass, 0 warn, 0 fail / 6
- Latency avg/p95: 5321/10248 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A011 | guest-discovery | product | pass | recommend | 2512 | - | Chào bạn, với nhu cầu tìm đồ bền, dễ bảo trì và giá tốt cho nhà thuê, tôi xin gợi ý Cân sức khỏe Beurer GS203. Bạn xem qua sản phẩm này nhé. |
| A012 | guest-discovery | product | pass | compare | 3830 | - | Chào bạn, với ngân sách 2 triệu và muốn chọn quà cho mẹ, bạn có thể tham khảo một vài sản phẩm này nhé. Bạn xem qua Quạt sưởi Kangaroo KG730 với giá 690.000 đồng hoặc Máy lọc không khí Levoit Core Mini 7W giá 1.290.000 đồng. Bạn muốn tìm hiểu thêm thông tin ch |
| A013 | guest-discovery | compare | pass | compare | 5013 | - | Mình đang hiển thị 2 lựa chọn phù hợp trong khung gợi ý: Máy lọc không khí Xiaomi Smart Air Purifier 4 Lite EU (BHR5274GL) 33W và Quạt điều hòa Daikiosan DKA-04000C. Bạn có thể bấm qua từng thẻ để xem nhanh, hoặc nói thêm ngân sách/kích thước/phòng dùng để mìn |
| A014 | guest-discovery | compare | pass | compare | 4089 | - | Chào bạn, để so sánh robot hút bụi và máy hút bụi cầm tay cho nhà có thú cưng thì mỗi loại có ưu điểm riêng.<br>Hiện tại, tôi có hai mẫu máy hút bụi cầm tay rất phù hợp để bạn tham khảo: Máy hút bụi cầm tay RAF R.8672 16000 Pa và Máy hút bụi cầm tay Deerma DX700  |
| A015 | guest-discovery | compare | pass | compare | 10248 | - | Chào bạn, về các thiết bị an ninh như camera cửa, cảm biến cửa và bộ báo động mini thì chúng có chức năng khác nhau tùy vào nhu cầu bảo vệ của bạn.<br>Trong các sản phẩm hiện có, chúng tôi có Camera Wi-Fi TP-Link Tapo C200. Camera này rất phù hợp để bạn theo dõi  |
| A016 | guest-discovery | product | pass | recommend | 6231 | - | Mình đang giữ lại Nồi chiên không dầu Electrolux 5 lít E6AF1-520K trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
