# Benchmark 100 pipeline chatbot retail

Ngày cập nhật: 2026-05-27.

Thư mục này lưu benchmark thật cho pipeline chatbot retail. Tên `benmark-100` được giữ theo yêu cầu task để các phiên sau dễ tìm lại.

## Mục tiêu

- Kiểm tra 100 câu hỏi thực tế qua API thật `/api/v1/chat`, không mock và không smoke-only.
- Đánh giá đồng thời nội dung trả lời, block UI, trạng thái giỏ hàng, lịch sử hội thoại, trace agent, graph edge, playback event và tool result.
- Chạy tuần tự có delay để không dồn server LLM.
- Khi sửa pipeline/tool/prompt, chạy lại theo batch rồi chạy full từ đầu.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `cases/variant-a.json` | Bộ 100 case variant A đang dùng để kiểm thử regression. |
| `scripts/run-benmark-100.mjs` | Runner gọi API thật, có auth theo nhóm, delay, checkpoint/resume và report JSON/Markdown. |
| `reports/` | Kết quả từng lần chạy, gồm JSON chi tiết và Markdown đọc nhanh. |
| `evidence/` | Nơi đặt ảnh/video bổ sung nếu cần chứng minh UI hoặc dashboard. |

## Kết quả mới nhất

- Run cuối: `variant-a-full-100-final-v5`
- Kết quả: **100 pass, 0 warn, 0 fail / 100**
- Latency trung bình: `3543 ms`
- Latency p95: `9650 ms`
- Report JSON: `reports/variant-a-full-100-final-v5-results.json`
- Report Markdown: `reports/variant-a-full-100-final-v5-report.md`

## Các lỗi đã sửa trong vòng này

- Cart/history follow-up: nhận đúng “nó”, “món đó”, “ở trên”, “vừa thêm”, “phương án ít khoan đục nhất”.
- Cart operation: phân biệt `set_quantity` với increment/decrement cho câu “lên 2” và “về số lượng 0”.
- Pending confirmation: chỉnh case A029 vì thao tác A028 đã thực thi trực tiếp, không tạo pending.
- Safety/off-topic: câu tạo link thanh toán giả, viết thơ, giải tích phân không còn kéo search/product rail vào câu trả lời.
- Compare/detail: giữ intent `compare` hoặc `product_detail` khi rule đã nhận diện rõ, không để LLM user-analysis override thành recommend.
- Cart invalid target: không tự thêm sản phẩm thay thế khi khách yêu cầu thêm sản phẩm không tồn tại.

## Cách chạy

```powershell
# API phải đang chạy ở http://127.0.0.1:7010
$env:BENMARK_RUN_ID='variant-a-local-run'
$env:BENMARK_LIMIT='100'
$env:BENMARK_DELAY_MS='5000'
node test/benmark-100/scripts/run-benmark-100.mjs
```

Chạy một đoạn nhỏ:

```powershell
$env:BENMARK_RUN_ID='variant-a-target-41-50'
$env:BENMARK_START_INDEX='41'
$env:BENMARK_LIMIT='10'
$env:BENMARK_DELAY_MS='5000'
node test/benmark-100/scripts/run-benmark-100.mjs
```

## Tiêu chí đọc kết quả

- `pass`: nội dung, block, flow, tool và lịch sử đều đúng hành vi chính.
- `warn`: câu trả lời dùng được nhưng có rủi ro cần review thủ công.
- `fail`: sai hành vi chính, sai tool/cart/history/trace, thiếu block bắt buộc hoặc trả lời không an toàn.
