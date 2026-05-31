# Benchmark1000 Chatbot Retail

- Cập nhật: 31-05-2026
- Evidence: [tests/backend tests/benchmark1000](<../../tests/backend tests/benchmark1000/README.md>)
- Service liên quan: `AgentService`, `AgentTaskBlackboardService`, `SearchAgentService`, `RecommendationAgentService`, `BusinessRagAgentService`, `CartSqlRagAgentService`, `SalesEvaluatorAgentService`

## Mục Tiêu

Benchmark1000 là bộ benchmark backend chính cho chatbot retail. Bộ này kiểm tra request thật vào API, không dùng mock/fallback, và dùng để đánh giá pipeline hiện tại theo chuẩn: đúng ý khách, đúng sản phẩm, đúng chính sách, đúng giỏ hàng, đúng lịch sử và có dashboard trace.

## Pipeline Hiện Tại

```text
Lead Orchestrator
  -> Task Blackboard
  -> History Agent
  -> Catalog Search Agent
  -> Recommendation Agent
  -> Business RAG Agent
  -> Cart Agent
  -> Evaluator Agent
  -> Response Agent
```

Product search không dùng embedding/rerank. Embedding/rerank chỉ dành cho Business RAG trên tài liệu nội bộ như bảo hành, đổi trả, giao hàng, hậu mãi, khuyến mãi và thông tin cửa hàng.

## Nhận Định Trung Thực

Benchmark1000 hiện là bộ test tốt nhất của repo để phát hiện sai product rail, sai policy, sai cart state và sai trace. Tuy nhiên pipeline vẫn có dấu hiệu tối ưu theo bộ test hơn là mượt tuyệt đối ngoài thực tế. Khi user viết một bong bóng chat dài như “so sánh lò chiên không dầu ... với ...”, hoặc quay lại sản phẩm cũ sau nhiều lượt, History Agent và Evaluator vẫn là điểm cần tiếp tục siết.

Không xem pass benchmark là chứng nhận production. Mỗi vòng hardening tiếp theo phải bổ sung hội thoại thật, câu nhiễu dài và case đổi ý liên tục, sau đó đọc dashboard để xác định sai ở lead, history, search, recommendation, cart hay response.

## Evidence

| File | Nội dung |
| --- | --- |
| [README.md](<../../tests/backend tests/benchmark1000/README.md>) | Hướng dẫn chạy benchmark và tiêu chí pass |
| [report.md](<../../tests/backend tests/benchmark1000/report.md>) | Báo cáo phương pháp dạng học thuật |
| [validation.md](<../../tests/backend tests/benchmark1000/validation.md>) | Nhật ký kiểm tra cấu trúc, syntax và setup |

## Tiêu Chí Backend

- Mọi câu hỏi sản phẩm phải đi qua catalog thật, có kiểm tra nhóm/budget/history.
- Mọi câu hỏi nghiệp vụ phải có Business RAG evidence.
- Mọi thao tác giỏ hàng phải do Cart Agent/tool hợp lệ thực hiện.
- Evaluator phải chặn câu trả lời thiếu evidence, lệch product rail hoặc lộ pipeline.
- Dashboard phải có node/edge/playback đủ để debug từng lượt chat.

## Việc Cần Tiếp Tục

- Tăng khả năng resolve tham chiếu lịch sử dài phiên trước khi gọi search/recommendation mới.
- Siết evaluator semantic cho câu so sánh và câu có nhiều sản phẩm trong cùng message.
- Thêm loop kiểm tra “sản phẩm liên quan gần nhất” khi catalog không có đúng nhóm hàng.
- Gắn lỗi thực tế từ người dùng vào Benchmark1000 thay vì chỉ sinh từ template.
