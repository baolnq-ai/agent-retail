# Catalog Search Agent Design

- Cập nhật: 31-05-2026
- Trạng thái: hiện hành

## Mục Tiêu

Catalog Search Agent chịu trách nhiệm tìm và resolve sản phẩm từ catalog thật. Agent này không dùng embedding/rerank. Mọi kết quả phải có evidence từ PostgreSQL/catalog: tên, SKU, brand, category, giá, tồn kho, thuộc tính và nhóm sản phẩm.

## Pipeline

```text
normalize query
  -> nhận diện SKU/tên/brand/category/budget/thuộc tính
  -> exact search theo SKU/id/tên
  -> keyword/facet search
  -> mở rộng nhóm liên quan có kiểm soát
  -> lọc budget/tồn kho/category
  -> kiểm tra semantic family bằng rule catalog
  -> trả candidate + evidence cho Lead/Recommendation
```

## Quy Tắc Liên Quan

- Hỏi “máy lạnh/điều hòa” mà catalog không có thì không được trả nồi chiên, nồi cơm hoặc đồ bếp. Phải báo chưa có hàng chính xác và tìm nhóm gần nhất như quạt/máy lọc không khí nếu catalog có.
- Hỏi “máy lọc cho nhà 4 người” phải ưu tiên máy lọc không khí/máy lọc nước theo ngữ cảnh, không nhảy sang máy xay.
- Hỏi bằng mã/tên sai chính tả phải thử exact, alias, token gần đúng và brand/category trước khi kết luận không có.
- Nếu không đủ dữ liệu để chọn một sản phẩm duy nhất, trả candidate hợp lệ và để Recommendation Agent chọn rail.

## Boundary

Search Agent chỉ trả candidate và evidence. Recommendation Agent quyết định sản phẩm nào được hiện ở product rail. Cart Agent mới được mutate giỏ hàng. Business RAG Agent mới dùng embedding/rerank cho tài liệu nghiệp vụ.
