# Retail Chatbot Hard Flow Benchmark 20

- Created: 2026-05-26
- Scope: 20 câu khó kiểm tra đồng thời chất lượng trả lời chatbot và trace/dashboard flow sau khi câu chat đi vào pipeline.
- Runtime script: `runtime-chatbot-hard-flow-benchmark-20.mjs`
- Evidence root mặc định: `test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/`

## Mục Tiêu

Benchmark này không chỉ chấm text. Mỗi case còn kiểm tra trace graph có đủ các invariant chính:

- `pipeline-executor -> session-context -> task-context -> lead-agent`
- Lead điều phối về các agent qua task context.
- Kết quả agent quay lại `task-context -> lead-agent`.
- Câu trả lời cuối đi từ `sales-agent -> task-context -> lead-agent -> assistant-response`.
- Không có cạnh trực tiếp `sales-agent -> assistant-response`.
- Playback events phải có dữ liệu để dashboard vẽ flow thật.

## Cách Chạy

```powershell
corepack pnpm --filter @retail-agent/api build
node test/agent-pipeline/retail-chatbot-hard-flow-benchmark-20/runtime-chatbot-hard-flow-benchmark-20.mjs
```

Có thể cấu hình:

- `BENCH_API_BASE_URL`: dùng API đang chạy sẵn.
- `BENCH_START_API=0`: không tự spawn API.
- `BENCH_EVIDENCE_ROOT`: đổi thư mục evidence.
- `BENCH_REQUEST_TIMEOUT_MS`: timeout từng câu.

## Đọc Kết Quả

Kết quả chính nằm trong:

- `reports/hard-flow-benchmark-20-results.json`
- `reports/hard-flow-benchmark-20-report.md`

Theo `testing-skill`, benchmark pass chỉ khi đã chạy request thật, ghi report đọc được, có summary pass/warn/fail, latency và lỗi trace/output rõ ràng.
