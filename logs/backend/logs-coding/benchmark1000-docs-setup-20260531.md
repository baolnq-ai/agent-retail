# Log Backend 31-05-2026 - Benchmark1000, Docs Và Setup

## Phạm Vi

- Chuẩn hóa benchmark backend theo `backend-skill`.
- Bổ sung README, report phương pháp và validation cho `tests/backend tests/benchmark1000`.
- Cập nhật docs pipeline hiện tại.
- Sửa lỗi setup Docker compose provider trên Windows path có dấu cách.

## Việc Đã Làm

- Tạo báo cáo phương pháp Benchmark1000 dạng học thuật tại `tests/backend tests/benchmark1000/report.md`.
- Cập nhật README benchmark với nhóm câu hỏi, tiêu chí pass, cách chạy và dashboard trace.
- Cập nhật runner để report Markdown ghi rõ Benchmark1000, phương pháp đánh giá và nhóm case.
- Cập nhật docs backend/agent-pipeline: product search cứng theo catalog, Business RAG dùng embedding/rerank.
- Sửa `infra/docker/docker-compose.yml`: bỏ bind mount `default.conf.template`, inline nginx config trong command để tránh lỗi Docker Desktop với path có dấu cách.
- Sửa `setup.sh`: chấp nhận `SETUP_TERMINAL_MODE=hidden` như alias của `background`, tránh lỗi khi dùng chung `.env` với PowerShell.
- Cập nhật Docker tag mặc định lên `v0.1.0-20260531` trong `.env.example`, root `docker-compose.yml`, script build local và script buildx push.
- Cập nhật README/docs/report để ghi đúng pipeline hiện tại: product search dùng catalog cứng, Business RAG mới dùng embedding/Qdrant/rerank.
- Ghi chú rõ rủi ro còn lại: pipeline có evidence tốt trên Benchmark1000 nhưng chưa đủ mượt cho mọi hội thoại thật, đặc biệt history dài phiên, so sánh nhiều sản phẩm và đổi ý liên tục.

## Validation

- `node --check "tests/backend tests/benchmark1000/scripts/generate-benchmark-1000.mjs"`: pass.
- `node --check "tests/backend tests/benchmark1000/scripts/run-benchmark-1000.mjs"`: pass.
- `BENCHMARK_SEED=20260531 node "tests/backend tests/benchmark1000/scripts/generate-benchmark-1000.mjs"`: tạo 1000 case.
- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet`: pass.
- `$env:SETUP_TERMINAL_MODE='hidden'; .\setup.ps1`: pass.
- `& 'C:\Program Files\Git\bin\bash.exe' -n setup.sh`: pass.
- `SETUP_TERMINAL_MODE=hidden SETUP_RUN_MODE=source ./setup.sh`: pass, `setup.sh` normalize `hidden` sang `background`.
- `git diff --check`: pass.
- Secret scan bằng `rg --pcre2`: không phát hiện API key, Bearer token, URL tunnel thật hoặc model endpoint thật trong working tree.
- `GET http://127.0.0.1:3110/health`: HTTP 200.
- `GET http://127.0.0.1:3120/nginx-health`: HTTP 200.
- `GET http://127.0.0.1:3120/agent-dashboard`: HTTP 200.

## Known Gaps

- Benchmark1000 là bộ hồi quy chính, không phải chứng nhận production.
- Cần tiếp tục lấy lỗi thực tế từ chat UI, nhất là câu dài kiểu so sánh nhiều sản phẩm trong một message, rồi đưa vào benchmark.
- History Agent và Evaluator là hai điểm cần harden tiếp vì lỗi lệch entity thường xảy ra khi user nói “cái đó”, “mẫu trên”, “món rẻ hơn” sau nhiều lượt.

## Kết Quả

Setup không còn fail ở bước Docker compose. Nginx provider chạy healthy trên port `3120`, API/Web được setup start thành công, và benchmark evidence hiện có README/report/validation đúng chuẩn backend-skill.
