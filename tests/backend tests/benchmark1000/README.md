# Benchmark1000 Backend Chatbot Retail

- Ngày cập nhật: 31-05-2026
- Phạm vi: API chatbot retail, multi-agent pipeline, cart, history, product search, Business RAG và trace dashboard.
- Chuẩn lưu test: `tests/backend tests/benchmark1000/` theo `backend-skill`.

## Mục Tiêu

Benchmark1000 dùng để kiểm tra chatbot như một nhân viên bán hàng và chăm sóc khách hàng thật. Bộ test không chỉ hỏi câu đẹp, mà cố tình có câu ngắn, sai chính tả, hỏi vòng vo, hỏi nhiều ý, đổi ý giữa chừng, nhắc lại “cái đó”, thao tác giỏ hàng và hỏi chính sách cửa hàng.

Case chỉ pass khi câu trả lời đúng ý chính, không bịa dữ liệu, product rail liên quan đúng nhóm, cart action đúng entity/trạng thái đăng nhập, Business RAG có nguồn nội bộ, và dashboard trace thể hiện đúng agent/tool đã tham gia.

Lưu ý vận hành: benchmark này giúp bắt hồi quy, nhưng pipeline hiện tại vẫn chưa được coi là mượt hoàn toàn với hội thoại thật ngoài đời. Các lỗi cần tiếp tục gom vào case mới gồm câu dài nhiều sản phẩm, so sánh trong một message, tham chiếu lịch sử sau nhiều lượt, đổi ý liên tục và câu lan man rồi quay lại mua hàng.

## Cấu Trúc

```text
tests/backend tests/benchmark1000/
|-- README.md
|-- report.md
|-- validation.md
|-- cases/
|   |-- .gitkeep
|   `-- retail-realistic-<seed>.json       # generated, không commit
|-- reports/
|   |-- .gitkeep
|   `-- <run-id>-report.md/json/checkpoint # generated, không commit
`-- scripts/
    |-- generate-benchmark-1000.mjs
    `-- run-benchmark-1000.mjs
```

## Nhóm Câu Hỏi

| Nhóm | Mục tiêu kiểm tra | Tiêu chí pass chính |
| --- | --- | --- |
| Hội thoại dài | 15-30 lượt, đổi ý, quay lại sản phẩm cũ | Nhớ đúng lịch sử, không lẫn entity, không hỏi lại vô ích |
| Tìm kiếm sản phẩm | Tên sai, mã gần đúng, thương hiệu, ngân sách, thuộc tính | Search catalog cứng đúng nhóm; nếu không có hàng chính xác thì nói rõ và gợi ý gần nhất |
| Câu nhiễu nhiều ý | Sản phẩm + bảo hành + giao hàng + ngân sách trong một câu | Tách đúng intent, trả lời đủ phần chính, product/policy không lệch |
| Business RAG | Bảo hành, đổi trả, thiếu phụ kiện, giao trễ, khuyến mãi, hậu mãi | Có `policy_answer`, có RAG context, có evidence trên blackboard |
| Cart | Add/remove/update/clear, khách chưa đăng nhập, follow-up “món đó” | Đúng sản phẩm, đúng số lượng, đúng trạng thái đăng nhập |
| Off-topic | Chọc phá, hỏi ngoài phạm vi rồi quay lại mua hàng | Kéo về phạm vi cửa hàng tự nhiên, không trả lời lan man ngoài nghiệp vụ |
| Dashboard trace | Node/edge/playback/tool result sau mỗi lượt chat | Có lead, blackboard, history/search/recommendation/RAG/cart/evaluator phù hợp |

## Pipeline Được Đánh Giá

```text
User message
  -> Lead Orchestrator
  -> Task Blackboard
  -> History Agent nếu cần lịch sử
  -> Catalog Search Agent nếu cần sản phẩm
  -> Recommendation Agent nếu cần chọn rail
  -> Business RAG Agent nếu cần nghiệp vụ/chính sách
  -> Cart Agent nếu có thao tác giỏ hàng
  -> Evaluator Agent
  -> Response Agent
  -> Dashboard trace
```

Product search không dùng embedding/rerank. Search sản phẩm dựa trên catalog thật: keyword, SKU, brand, category, facet, budget, tồn kho và nhóm liên quan. Embedding/rerank chỉ dùng trong Business RAG cho tài liệu nghiệp vụ nội bộ.

## Sinh Bộ 1000 Câu

```powershell
$env:BENCHMARK_SEED='20260531'
node "tests/backend tests/benchmark1000/scripts/generate-benchmark-1000.mjs"
```

Sau mỗi vòng fix lớn phải đổi seed để sinh bộ câu mới cùng tiêu chuẩn:

```powershell
$env:BENCHMARK_SEED='20260601'
node "tests/backend tests/benchmark1000/scripts/generate-benchmark-1000.mjs"
```

## Chạy Benchmark

```powershell
$env:BENCHMARK_API_BASE_URL='http://127.0.0.1:3110'
$env:BENCHMARK_SEED='20260531'
$env:BENCHMARK_CASES_PATH='tests/backend tests/benchmark1000/cases/retail-realistic-20260531.json'
$env:BENCHMARK_RUN_ID='retail-realistic-20260531-full'
$env:BENCHMARK_LIMIT='1000'
$env:BENCHMARK_DELAY_MS='5000'
$env:BENCHMARK_REQUEST_TIMEOUT_MS='120000'
node "tests/backend tests/benchmark1000/scripts/run-benchmark-1000.mjs"
```

Runner gọi request thật vào `POST /api/v1/chat`. Không dùng mock, không dùng fallback dữ liệu, không bỏ qua DB/model thật.

## File Kết Quả

| File | Vai trò |
| --- | --- |
| `report.md` | Báo cáo học thuật/canonical về phương pháp, tiêu chí và cách đọc kết quả |
| `validation.md` | Nhật ký kiểm tra cấu trúc, setup và lệnh đã chạy |
| `reports/<run-id>-report.md` | Báo cáo từng lần chạy thật, sinh tự động |
| `reports/<run-id>-results.json` | Dữ liệu chi tiết từng case để debug pipeline |
| `reports/<run-id>-checkpoint.json` | Checkpoint resume, cookie/token luôn redact mặc định |

## Dashboard

Khi benchmark chạy, mở dashboard tại:

- Nginx: `http://127.0.0.1:3120/agent-dashboard`
- Web trực tiếp: `http://127.0.0.1:3100/agent-dashboard`

Dashboard phải hiển thị được node/edge/playback cho từng lượt chat. Nếu case fail, đọc trace để xác định lỗi nằm ở search, recommendation, RAG, cart, history, evaluator hay response.

## Bảo Mật

Không commit `.env`, cookie, token, checkpoint có auth thật hoặc report chứa credential. `.gitignore` đã ignore case/report sinh tự động; chỉ giữ README, report phương pháp, validation và script.
