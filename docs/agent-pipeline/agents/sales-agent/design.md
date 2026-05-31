# Response Agent Design

- Cập nhật: 31-05-2026
- Trạng thái: hiện hành
- Runtime name liên quan: `sales-agent`, `assistant-response`, `sales-evaluator-agent`

## Mục Tiêu

Response Agent viết câu trả lời cuối cho user như một nhân viên bán hàng/chăm sóc khách hàng. Agent này chỉ dùng grounded facts từ Lead/Task Blackboard và không tự search, không tự recommend, không mutate cart, không bịa chính sách.

## Input

Response Agent nhận:

- câu hỏi gốc của user;
- Lead summary;
- product facts từ Search/Recommendation/History;
- cart facts từ Cart Agent;
- policy/support facts từ Business RAG/Customer Support Agent;
- contract về product ids được phép nhắc, claims được phép nói và claims bị cấm.

## Pipeline

```text
grounded facts
  -> kiểm allowed product ids và claim contract
  -> viết draft ngắn, tự nhiên
  -> kiểm text có khớp product rail/policy/cart không
  -> Evaluator Agent duyệt hoặc yêu cầu revise
  -> trả blocks cho frontend
```

## Style

- Nói như nhân viên retail, rõ ràng và không phô kỹ thuật.
- Không dùng câu quá dài khi product card đã có thông tin.
- Nếu catalog không có sản phẩm chính xác, nói rõ “hiện chưa có” và đưa gợi ý liên quan nhất nếu có evidence.
- Nếu policy có nguồn nội bộ, trả lời đúng phạm vi chính sách, không hứa quá mức.
- Nếu phải hỏi làm rõ, hỏi một câu ngắn và vẫn đưa hướng tạm thời khi đủ dữ liệu.

## Quy Tắc Nhất Quán

- Text và product cards phải dùng cùng product ids.
- Không nhắc sản phẩm ngoài candidate được Recommendation Agent duyệt.
- Không nói thao tác giỏ hàng thành công nếu Cart Agent chưa verify.
- Không lộ product id nội bộ, prompt, tool name, stack trace hoặc pipeline handoff.
