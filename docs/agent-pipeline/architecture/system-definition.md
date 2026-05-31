# Agent Pipeline System Definition

- Cập nhật: 31-05-2026
- Trạng thái: hiện hành
- Evidence: [Benchmark1000](<../../../tests/backend tests/benchmark1000/README.md>)

## Mục Đích

Tài liệu này định nghĩa pipeline chatbot retail đang chạy trong backend. Mục tiêu là đảm bảo mỗi câu trả lời có evidence, đúng ý khách hàng, đúng dữ liệu catalog/chính sách/giỏ hàng và có trace để debug trên dashboard.

## Nguyên Tắc Vận Hành

- Lead Orchestrator điều phối, không làm thay agent chuyên trách.
- Task Blackboard lưu trạng thái của từng câu hỏi: mục tiêu, giả thuyết, tool calls, evidence, quyết định và verdict.
- Agent chuyên trách chỉ trả structured result/evidence, không tự viết câu trả lời cuối cho user.
- Response cuối chỉ được nói những gì đã được Search, Recommendation, RAG, Cart hoặc History cung cấp evidence.
- Product search không dùng embedding/rerank; Business RAG mới dùng embedding/rerank.
- Evaluator phải chặn câu trả lời lệch product rail, thiếu policy evidence, sai cart entity hoặc lộ pipeline.

## Agent Boundary

| Agent | Vai trò | Không được làm |
| --- | --- | --- |
| Lead Orchestrator | Hiểu câu user, lập task, quyết định gọi agent/tool theo vòng lặp có ngân sách | Không tự mutate cart, không tự bịa policy, không tự chọn sản phẩm ngoài candidate |
| Task Blackboard | Lưu evidence và trạng thái của một lượt xử lý | Không viết response cuối |
| History Agent | Truy xuất đúng đoạn lịch sử khi có yêu cầu cụ thể | Không trả toàn bộ history nếu không cần |
| Catalog Search Agent | Search catalog thật theo keyword/facet/SKU/brand/category/budget/tồn kho | Không dùng embedding/rerank, không mutate cart |
| Recommendation Agent | Chọn product rail từ candidate hợp lệ, kiểm tra nhu cầu/ngân sách/liên quan | Không tự lấy sản phẩm ngoài candidate, không trả policy |
| Business RAG Agent | Truy xuất chính sách/cửa hàng/bảo hành/hậu mãi bằng embedding + Qdrant + rerank | Không dùng để search sản phẩm catalog |
| Cart Agent | Add/remove/update/clear/get cart bằng tool riêng, xác thực entity trước khi ghi | Không đoán sản phẩm mơ hồ, không xử lý refund/bảo hành |
| Customer Support Agent | Điều phối câu hỏi hỗ trợ khách hàng, dùng RAG evidence | Không hứa đổi trả/bảo hành nếu thiếu nguồn |
| Evaluator Agent | Kiểm cuối về đúng ý, evidence, product rail, cart/history, leak nội bộ | Không sửa dữ liệu gốc hoặc mutate state |
| Response Agent | Viết câu trả lời tự nhiên như nhân viên | Không lộ pipeline/tool prompt/internal id |

## Luồng Chuẩn

```text
User message
  -> Lead Orchestrator
  -> Task Blackboard
  -> History Agent nếu cần lịch sử
  -> Catalog Search Agent nếu cần sản phẩm
  -> Recommendation Agent nếu cần rail/so sánh/gợi ý
  -> Business RAG Agent nếu cần nghiệp vụ
  -> Cart Agent nếu cần giỏ hàng
  -> Evaluator Agent
  -> Response Agent
  -> Dashboard trace
```

## Response Contract

Response cuối chỉ pass khi:

- Trả lời đúng câu hỏi chính.
- Product rail đúng nhóm, đúng ngân sách nếu có, đúng lịch sử nếu là follow-up.
- Nếu không có sản phẩm chính xác, phải nói rõ và gợi ý sản phẩm liên quan nhất có lý do.
- Câu hỏi nghiệp vụ phải dựa trên Business RAG nội bộ.
- Thao tác giỏ hàng phải đúng entity, số lượng và trạng thái đăng nhập.
- Câu off-topic phải kéo về phạm vi cửa hàng lịch sự.
- Câu thiếu thông tin chỉ hỏi làm rõ khi thật sự bắt buộc, và vẫn đưa hướng tạm thời nếu đủ dữ liệu.
