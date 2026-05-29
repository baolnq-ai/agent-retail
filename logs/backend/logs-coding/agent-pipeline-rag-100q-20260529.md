# Agent Pipeline RAG 100Q - 2026-05-29

## Đã Làm

- Tái hiện lỗi chatbot xem “quạt điều hoà cho phòng 24 mét vuông” là smalltalk, không gọi search-agent.
- Sửa user-analysis và lead intent để nhận diện nhu cầu sản phẩm theo diện tích/use-case.
- Bổ sung parse diện tích dạng `mét vuông`.
- Siết product family search để tránh đề xuất lệch ngành:
  - Hút bụi/vệ sinh nhà cửa không bị kéo sang máy lọc chỉ vì token “bụi”.
  - Smart-home/cảnh báo không bị kéo sang nồi chiên vì token “cửa/quan sát”.
  - Chăm sóc cá nhân không bị kéo sang robot hút bụi vì token “tóc”.
- Sửa policy intent để “sản phẩm lỗi sau 20 ngày” dùng business RAG.
- Sửa align câu trả lời khi khách hỏi máy lạnh nhưng catalog chỉ có sản phẩm làm mát gần nhất.
- Cập nhật benchmark 100 câu và thêm rule `requiredText` để bắt output nghiệp vụ.

## Validation

- `.\setup.ps1`: pass, API `3110`, web `3100`, nginx `3120`.
- Benchmark full 100 chạy nhiều vòng sau từng fix.
- Vòng cuối: `variant-a-full-100-pipeline-rag-v11`.
- Kết quả vòng cuối: 100 pass, 0 warn, 0 fail / 100.
- Latency avg/p95: 2367/4160 ms.

## Evidence

- Report: `tests/benchmark-100/reports/variant-a-full-100-pipeline-rag-v11-report.md`.
- JSON: `tests/benchmark-100/reports/variant-a-full-100-pipeline-rag-v11-results.json`.

## Ghi Chú

- Không ghi secret hoặc nội dung `.env`.
- Product search vẫn không dùng embedding/rerank; business RAG vẫn dùng embedding/Qdrant/rerank.

dev by ambrouse
