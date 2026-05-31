# Product Discovery Boundary

- Cập nhật: 31-05-2026
- Trạng thái: tài liệu boundary hiện hành

## Vai Trò

Product discovery hiện được tách thành hai agent:

- Catalog Search Agent: tìm candidate trong catalog thật bằng keyword/facet/SKU/brand/category/budget.
- Recommendation Agent: chọn product rail từ candidate đã được Search/Cart xác thực.

Không còn dùng embedding/rerank cho product search. Embedding/rerank chỉ dành cho Business RAG tài liệu nghiệp vụ.

## Contract

```text
Lead goal
  -> Search Agent: candidate + evidence
  -> Recommendation Agent: selected product rail + reason
  -> Evaluator Agent: kiểm đúng nhóm, đúng budget, đúng lịch sử
  -> Response Agent: nói tự nhiên, không lộ pipeline
```

## Tiêu Chuẩn Fail

- Trả sản phẩm khác nhóm khi catalog có nhóm phù hợp hơn.
- Vượt budget nhưng không nói rõ chưa có hàng trong ngân sách.
- Không có sản phẩm chính xác nhưng nói như đã tìm thấy đúng.
- Dùng sản phẩm ngoài candidate được phép.
