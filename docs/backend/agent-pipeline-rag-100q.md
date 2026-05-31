# Agent Pipeline RAG Hardening

- Cập nhật: 31-05-2026
- Phạm vi: pipeline chatbot, product search, recommendation, Business RAG, cart, history và evaluator.
- Benchmark hiện tại: [Benchmark1000](<../../tests/backend tests/benchmark1000/README.md>)

## Mục Tiêu

Pipeline chatbot phải xử lý câu hỏi giống người dùng thật: thiếu ngữ cảnh, sai chính tả, hỏi bằng mã/tên gần đúng, hỏi theo sản phẩm trước đó, hỏi chính sách, hỏi công ty, hỏi lan man và thao tác giỏ hàng. Product search không dùng embedding/rerank; Business RAG dùng embedding, Qdrant và rerank.

## Kiến Trúc Hiện Tại

- Lead Orchestrator điều phối task và không tự bịa dữ liệu.
- Task Blackboard lưu evidence, tool calls, quyết định và evaluator verdict.
- History Agent chỉ truy xuất lịch sử theo yêu cầu cụ thể.
- Catalog Search Agent search cứng theo catalog thật: keyword/facet/SKU/brand/category/budget/tồn kho.
- Recommendation Agent chọn product rail từ candidate hợp lệ.
- Business RAG Agent dùng embedding -> Qdrant `business_knowledge` -> rerank -> context nội bộ.
- Cart Agent mutate giỏ hàng qua private tool và verify sau ghi.
- Evaluator Agent kiểm cuối trước khi Response Agent viết câu trả lời.

## Validation

- Benchmark chính: `tests/backend tests/benchmark1000`.
- Runner gọi request thật vào `POST /api/v1/chat`.
- Report sinh tự động nằm trong `tests/backend tests/benchmark1000/reports/` và không commit nếu chứa checkpoint/cookie.

## Ghi Chú

Không hardcode theo từng câu hỏi. Các rule phải là lớp nhận diện family/constraint, kiểm tra evidence và kiểm tra contract giữa agent.
