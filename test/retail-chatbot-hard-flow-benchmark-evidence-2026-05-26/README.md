# Retail Chatbot Hard Flow Benchmark Evidence

- Created: 2026-05-26
- Benchmark: `test/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/`
- Purpose: lưu bằng chứng chạy 20 câu khó, gồm report JSON/Markdown và ảnh dashboard sau khi sửa legend/flow.

## Nội Dung

- `reports/hard-flow-benchmark-20-results.json`: kết quả máy đọc được cho từng case.
- `reports/hard-flow-benchmark-20-report.md`: báo cáo tóm tắt theo format test.
- `app/09-dashboard-legend-trimmed-hard-flow.png`: ảnh dashboard sau khi thu gọn legend.
- `app/audit-legend-trimmed-hard-flow.json`: audit DOM cho legend, node/edge, overlap và unresolved call.

## Kết Quả 2026-05-26

- Tổng case: 20
- Completed: 20/20
- Pass/Warn/Fail: 19/1/0
- Flow fail: 0
- Accuracy score: 100/100
- Latency avg/p50/p95: 2701/2608/4703 ms
- Dashboard audit: 20 node, 48 edge, 0 overlap, 0 unresolved call, legend không còn `Đọc dữ liệu`, `Ghi dữ liệu`, `Guard`.

## Tiêu Chí Đọc Evidence

Report hợp lệ khi có đủ tổng số case, pass/warn/fail, flow fail, latency, intent, block types và issue code. Ảnh dashboard hợp lệ khi thấy legend đã thu gọn, không có panel phụ, icon/node không chồng nhau và flow trên canvas có dữ liệu thật.
