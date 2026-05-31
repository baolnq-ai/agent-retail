# Business RAG Agent

- Cập nhật: 31-05-2026
- Phạm vi: `BusinessRagAgentService`, `KnowledgeService`, `ModelGatewayService`

## Mục Tiêu

Business RAG Agent xử lý nhóm câu hỏi nghiệp vụ của cửa hàng: giới thiệu RetailHome, kênh hỗ trợ, bảo hành, đổi trả, hoàn tiền, giao hàng, thanh toán, hậu mãi, khuyến mãi, khiếu nại và hướng dẫn xử lý sự cố.

## Thiết Kế

- Tài liệu nghiệp vụ được seed vào bảng `KnowledgeDocument`.
- Câu hỏi và tài liệu được embedding qua `ModelGatewayService.embed()`.
- Vector được lưu/truy vấn qua Qdrant collection `business_knowledge`.
- Ứng viên từ Qdrant được sắp lại bằng `ModelGatewayService.rerank()`.
- Không dùng lexical fallback cho Business RAG nếu embedding/rerank lỗi; lỗi phải lộ để sửa hạ tầng/model.
- Product search vẫn dùng Catalog Search Agent, không dùng embedding/rerank.

## Nhóm Tài Liệu Nội Bộ

| Nhóm | Nội dung |
| --- | --- |
| `store` | Giới thiệu cửa hàng, phạm vi bán hàng, kênh liên hệ |
| `support` | CSKH, khiếu nại, thiếu phụ kiện, giao trễ |
| `policy` | Đổi trả, hoàn tiền, điều kiện nhận hàng |
| `warranty` | Bảo hành tiêu chuẩn, máy lọc, lõi lọc, thiết bị gia dụng |
| `shipping` | Giao hàng nội thành/tỉnh, hẹn lịch, kiểm hàng |
| `payment` | COD, chuyển khoản, thẻ, ví, đặt cọc |
| `after_sales` | Lắp đặt, hướng dẫn app, hậu mãi 30 ngày |
| `promotion` | Combo vật tư, ưu đãi đơn hàng lớn |
| `faq` | Hướng dẫn chọn sản phẩm theo ngành hàng |

## Tiêu Chí Pass

- Câu trả lời nghiệp vụ phải có RAG context.
- Trace phải có `rag-agent`, Qdrant/rerank evidence và blackboard evidence.
- Không trả lời chung chung nếu tài liệu nội bộ có dữ liệu.
- Không hứa đổi trả/bảo hành/hoàn tiền ngoài chính sách đã truy xuất.
