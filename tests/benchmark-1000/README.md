# Benchmark 1000 câu thực chiến chatbot retail

Ngày tạo: 30-05-2026

## Mục tiêu

Bộ này kiểm chatbot theo tiêu chuẩn cao hơn benchmark 100 câu cũ:

- Câu hỏi tự nhiên như khách thật, không chỉ hỏi thẳng.
- Hội thoại dài 15-30 lượt, có đổi ý và tham chiếu lịch sử.
- Tìm bằng tên sai, mã gần đúng, thương hiệu, ngân sách, thuộc tính.
- Câu nhiễu dài, hỏi lẫn sản phẩm, bảo hành, giao hàng.
- Off-topic/phá rối nhưng vẫn kéo về phạm vi cửa hàng tự nhiên.
- RAG nghiệp vụ phải có nguồn nội bộ.
- Product rail phải đúng nhóm, đúng budget, đúng lịch sử/cart state.

## Sinh bộ 1000 câu

```powershell
node tests/benchmark-1000/scripts/generate-benchmark-1000.mjs
```

Đổi seed sau mỗi vòng fix lớn để sinh bộ 1000 câu mới cùng tiêu chuẩn:

```powershell
$env:BENCHMARK_SEED='20260530_02'
node tests/benchmark-1000/scripts/generate-benchmark-1000.mjs
```

## Chạy nhẹ từng câu

Runner dùng lại script benchmark hiện có, nhưng đọc case 1000 và bật `semanticStrict`.

```powershell
$env:BENCHMARK_API_BASE_URL='http://127.0.0.1:3110'
$env:BENCHMARK_CASES_PATH='tests/benchmark-1000/cases/retail-realistic-20260530.json'
$env:BENCHMARK_RUN_ID='retail-realistic-20260530-full'
$env:BENCHMARK_LIMIT='1000'
$env:BENCHMARK_DELAY_MS='5000'
$env:BENCHMARK_REQUEST_TIMEOUT_MS='120000'
node tests/benchmark-100/scripts/run-benchmark-100.mjs
```

## Tiêu chuẩn pass

Case chỉ pass khi không có fail/warn theo semantic checks:

- Product rail không rỗng khi case cần sản phẩm.
- Product rail đúng family trong `expectedFamilies`.
- Product rail không vượt budget nếu prompt có ngân sách, trừ khi câu trả lời nói rõ chưa có hàng đúng budget.
- Policy phải có RAG context và blackboard evidence.
- History case phải có history-agent và reference visible.
- Cart case phải có cart-agent/tool result đúng trạng thái.
- Không lộ internal product id, pipeline text, stack trace.

## Ghi chú bảo mật

Checkpoint/report không được commit nếu chứa cookie, token hoặc thông tin nhạy cảm. Khi cần lưu evidence, xóa checkpoint hoặc redact cookie trước.
