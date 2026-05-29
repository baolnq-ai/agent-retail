# Agent Pipeline RAG 100Q Hardening

- Cập nhật: 2026-05-29
- Phạm vi: `AgentService`, `UserAnalysisAgentService`, `ProductManagerAgentService`, `CatalogService`, `SearchAgentService`, business RAG và benchmark 100 câu.

## Mục Tiêu

Pipeline chatbot phải xử lý câu hỏi giống người dùng thật: thiếu ngữ cảnh, sai chính tả nhẹ, hỏi theo tên/mã/sản phẩm trước đó, hỏi chính sách, hỏi công ty và hỏi lan man. Product search không dùng embedding/rerank; business RAG dùng embedding, Qdrant và rerank.

## Thay Đổi Chính

- Nhận diện product intent tốt hơn cho câu dạng “quạt điều hoà cho phòng 24 mét vuông”.
- Parse diện tích dạng `24 mét vuông`, `24m2`, `m vuông`.
- Search sản phẩm dùng family/facet/keyword có kiểm tra liên quan, không nhảy sang đồ bếp khi hỏi làm mát, máy lọc, smart-home hoặc chăm sóc cá nhân.
- Nếu khách hỏi máy lạnh nhưng catalog không có máy lạnh treo tường, sales text nói rõ chưa có và gợi ý nhóm làm mát gần nhất.
- Policy như lỗi sau 20 ngày đi qua business RAG, lấy nguồn đổi trả/bảo hành nội bộ.
- Sales evaluator chặn câu trả lời hỏi lại chung chung khi product rail đã có sản phẩm.

## Validation Thật

- Benchmark thật: `tests/benchmark-100/reports/variant-a-full-100-pipeline-rag-v11-report.md`.
- Kết quả: 100 pass, 0 warn, 0 fail / 100.
- Latency avg/p95: 2367/4160 ms.
- API: `http://127.0.0.1:3110`, delay giữa request 2000 ms.

## Ghi Chú Kiến Trúc

- Product pipeline: keyword/family/facet, Redis catalog cache, quality gate và sales evaluator.
- Business RAG: embedding -> Qdrant `business_knowledge` -> rerank -> policy answer.
- Không hardcode theo từng câu hỏi; các rule mới là lớp nhận diện family/constraint và kiểm tra câu trả lời theo contract.

dev by ambrouse
