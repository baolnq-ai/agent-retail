# Plan: benmark-100-pipeline-audit

- Created: 2026-05-27
- Updated: 2026-05-27
- Status: done
- Related log: `logs/implementation/benmark-100-pipeline-audit-20260527.md`
- Related doc: `docs/task/benmark-100-pipeline-audit-20260527.md`
- Evidence/report: `test/benmark-100`

## Mục tiêu

Kiểm thử thật pipeline chatbot retail bằng 100 câu hỏi thực tế, có lịch sử hội thoại, giỏ hàng, tìm kiếm sản phẩm, so sánh, chính sách, nhiễu, prompt injection và thao tác mua sắm. Mỗi case phải đánh giá cả câu trả lời lẫn trace/pipeline/tool, không chỉ đúng bề mặt nội dung.

## Phase

| Phase | Mục tiêu | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Tạo plan/log/doc và cấu trúc `test/benmark-100` | done | README, cases, runner |
| 2 | Viết runner benchmark real API có checkpoint/resume | done | `scripts/run-benmark-100.mjs` |
| 3 | Chạy baseline và đọc lỗi thật | done | Các report baseline trong `reports/` |
| 4 | Fix pipeline/tool/prompt theo lỗi thật | done | Patch backend và runner evaluator |
| 5 | Chạy targeted regression theo cụm khó | done | Safety, cart/history, compare/detail đều pass |
| 6 | Chạy full 100 cuối | done | `variant-a-full-100-final-v5`: 100 pass |
| 7 | Cập nhật tài liệu bàn giao | done | README/log/doc/plan |

## Kết quả chốt

- Full run cuối: `variant-a-full-100-final-v5`
- Kết quả: `100 pass, 0 warn, 0 fail / 100`
- Avg/p95 latency: `3543/9650 ms`

## Ghi chú vận hành

- Runner gọi API thật `/api/v1/chat`, có auth account theo group case.
- Delay mặc định: `5000 ms` giữa request.
- Report JSON chứa response text, block types, cart summary, product IDs, policy IDs, agents, graph edges, playback events, tool results và issue code.
- Các case như A048 cố tình kiểm tra không được tự thêm sản phẩm thay thế khi target không tồn tại.
