# Log benchmark 100 pipeline audit 2026-05-27

- Trạng thái: hoàn tất
- Plan: `plans/running/plan-benmark-100-pipeline-audit-20260527-v1.md`
- Doc: `docs/task/benmark-100-pipeline-audit-20260527.md`
- Report chính: `test/benmark-100/reports/variant-a-full-100-final-v5-results.json`

## Diễn tiến chính

- Tạo `test/benmark-100` gồm `cases`, `scripts`, `reports`, `evidence`.
- Viết runner `run-benmark-100.mjs` gọi API thật, có delay, checkpoint/resume, auth theo group và report JSON/Markdown.
- Sửa harness auth để username benchmark hợp lệ.
- Sửa encoding `cases/variant-a.json` để toàn bộ prompt tiếng Việt có dấu đọc đúng.
- Fix cart/history: resolve “nó”, “món đó”, “ở trên”, “vừa thêm”, “món rẻ nhất”, “phương án ít khoan đục nhất”.
- Fix cart operation: `lên 2` và `về số lượng 0` được đánh giá là `set_quantity`.
- Fix cart status: “giỏ hàng sau khi xóa” là đọc trạng thái sau thao tác trước, không xóa tiếp.
- Fix safety/off-topic: không kéo search/product rail vào yêu cầu tạo link thanh toán giả, viết thơ, giải tích phân.
- Fix compare/detail: giữ intent rule-based khi câu đã rõ là so sánh hoặc hỏi chi tiết sản phẩm.
- Fix invalid add target: không tự thêm sản phẩm gần giống khi khách yêu cầu sản phẩm không tồn tại.
- Cập nhật evaluator để nhận diện refusal/clarify với “không tìm thấy”, “chưa thể thêm”, “kiểm tra lại”.

## Lần chạy đáng chú ý

- `variant-a-target-67-70-safety-fix-v1`: 4 pass, 0 warn, 0 fail.
- `variant-a-target-31-36-detail-fix-v1`: 6 pass, 0 warn, 0 fail.
- `variant-a-target-76-92-compare-detail-v2`: 17 pass, 0 warn, 0 fail.
- `variant-a-target-41-50-invalid-add-v2`: 10 pass, 0 warn, 0 fail.
- `variant-a-full-100-final-v5`: 100 pass, 0 warn, 0 fail.

## Verify

```powershell
corepack pnpm --filter @retail-agent/api build
node --check test/benmark-100/scripts/run-benmark-100.mjs
$env:BENMARK_RUN_ID='variant-a-full-100-final-v5'; $env:BENMARK_LIMIT='100'; $env:BENMARK_DELAY_MS='5000'; node test/benmark-100/scripts/run-benmark-100.mjs
```

Kết quả full cuối: `100 pass, 0 warn, 0 fail / 100`, avg `3543 ms`, p95 `9650 ms`.
