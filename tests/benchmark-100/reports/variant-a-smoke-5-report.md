# Báo cáo benchmark 100 pipeline chatbot retail

- Run: `variant-a-smoke-5`
- Thời gian: 2026-05-27T00:43:32.578Z
- API: `http://127.0.0.1:7010`
- Bộ case: `C:\code\my source\AI-Agent-retail\tests\benchmark-100\cases\variant-a.json`
- Delay giữa request: 1500 ms
- Trạng thái: đã hoàn tất batch
- Kết quả: 5 pass, 0 warn, 0 fail / 5
- Latency avg/p95: 3782/4412 ms

## Lỗi nổi bật

- Chưa có lỗi.

## Kết quả từng case

| Case | Nhóm | Loại | Grade | Intent | Latency | Issue | Tóm tắt trả lời thật |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| A001 | guest-discovery | product | pass | recommend | 4326 | - | Mình đang giữ lại Máy lọc không khí Levoit Core Mini 7W trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A002 | guest-discovery | product | pass | recommend | 2761 | - | Chào bạn, tôi hiểu bạn đang tìm robot hút bụi phù hợp cho nhà có mèo và sàn gỗ, với ngân sách khoảng 5 triệu.<br>Hiện tại, trong các sản phẩm chúng tôi có, có Máy hút bụi cầm tay Deerma DX700S 15000 Pa với giá 900.000 đồng. Bạn xem thử sản phẩm này nhé. |
| A003 | guest-discovery | product | pass | recommend | 3710 | - | Chào bạn, với nhu cầu nấu ăn nhanh và dễ vệ sinh cho căn hộ studio, tôi gợi ý bạn tham khảo Lò chiên không dầu Ferroli 12 lít FAF-12M. Sản phẩm này rất tiện lợi cho việc chế biến các món ăn nhanh và có mức giá rất hợp lý. Bạn xem qua sản phẩm này và cho tôi bi |
| A004 | guest-discovery | product | pass | recommend | 4412 | - | Mình đang giữ lại Ổ cắm thông minh TP-Link Tapo P110 trong khung gợi ý vì sản phẩm này khớp nhất với dữ liệu hiện có. Bạn có thể xem thông tin trên thẻ hoặc nói thêm tiêu chí để mình lọc lại chính xác hơn. |
| A005 | guest-discovery | product | pass | recommend | 3700 | - | Chào bạn, với nhu cầu làm sạch nhà cửa và ngân sách 2-3 triệu, tôi xin gợi ý bạn xem qua Nồi chiên không dầu Magic 6.5 lít A-805 nhé. Sản phẩm này có giá 2.060.000 đồng. Bạn có muốn tôi cung cấp thêm thông tin chi tiết về sản phẩm này không? |

## Ghi chú đọc report

- Đây là response thật từ API, không phải mock.
- Case fail cần đọc `text`, `flow`, `cart`, `productIds`, `policyIds` trong JSON để quyết định fix pipeline/tool/prompt.
- Sau khi fix lớn phải đổi bộ câu và chạy lại từ đầu theo yêu cầu task.
