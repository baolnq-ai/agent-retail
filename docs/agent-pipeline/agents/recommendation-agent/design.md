# Recommendation Agent Design

- Cập nhật: 31-05-2026
- Trạng thái: hiện hành

## Mục Tiêu

Recommendation Agent chọn product rail từ candidate hợp lệ do Search Agent hoặc Cart Agent cung cấp. Agent này không tự search catalog rộng và không tự lấy sản phẩm ngoài danh sách được phép.

## Pipeline

```text
load goal + candidate evidence
  -> đọc nhu cầu, ngân sách, lịch sử và cart state nếu được cung cấp
  -> chấm fit theo category/brand/thuộc tính/giá/tồn kho/liên quan
  -> loại sản phẩm lệch nhóm hoặc vượt budget không có lý do
  -> chọn product rail
  -> trả lý do ngắn + allowed product ids cho Response Agent
```

## Tiêu Chí Chọn Sản Phẩm

- Đúng nhóm nhu cầu trước, giá rẻ hơn không được ưu tiên nếu lệch nhóm.
- Nếu không có sản phẩm chính xác, chọn nhóm liên quan nhất và ghi rõ vì sao liên quan.
- Follow-up như “mẫu trên”, “cái đó”, “rẻ hơn” phải dùng History Agent hoặc candidate đã lưu trong task.
- Không hiện product rail nếu tất cả candidate đều lệch nhu cầu.

## Boundary

Recommendation Agent không trả lời chính sách, không mutate cart, không gọi embedding/rerank cho product search. Nếu cần policy, Lead gọi Business RAG. Nếu cần thêm candidate, Lead gọi Search Agent.
