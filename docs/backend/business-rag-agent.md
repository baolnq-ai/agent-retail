# Business RAG Agent

- Cập nhật: 2026-05-29
- Phạm vi: `apps/api/src/services/agents/business-rag-agent.service.ts`, `apps/api/src/services/knowledge.service.ts`

## Mục Tiêu

Business RAG Agent xử lý nhóm câu hỏi nghiệp vụ của cửa hàng: giới thiệu RetailHome, kênh hỗ trợ, bảo hành, đổi trả, hoàn tiền, giao hàng, thanh toán, hậu mãi, khuyến mãi và khiếu nại.

## Thiết Kế

- Tài liệu nghiệp vụ được seed vào bảng `KnowledgeDocument`.
- RAG dùng `ModelGatewayService.embed()` để tạo vector cho câu hỏi và tài liệu.
- Vector được ghi và truy vấn qua Qdrant collection `business_knowledge`.
- Ứng viên từ Qdrant được sắp lại bằng `ModelGatewayService.rerank()`.
- Không dùng lexical fallback khi embedding hoặc rerank lỗi; lỗi phải lộ ra để sửa hạ tầng/model.
- Product search vẫn dùng hard keyword/facet riêng, không dùng embedding/rerank.

## Tài Liệu Đã Seed

Các nhóm tài liệu chính:

- `store`: giới thiệu cửa hàng.
- `support`: liên hệ, CSKH, khiếu nại.
- `policy`: đổi trả, hoàn tiền.
- `warranty`: bảo hành tiêu chuẩn, máy lọc và lõi lọc.
- `shipping`: giao hàng nội thành/tỉnh.
- `payment`: COD, chuyển khoản, thẻ, ví, đặt cọc.
- `after_sales`: lắp đặt, hướng dẫn app, hậu mãi 30 ngày.
- `promotion`: combo vật tư, ưu đãi đơn hàng lớn.
- `faq`: hướng dẫn chọn sản phẩm theo ngành hàng.

## Validation

- `corepack pnpm --filter @retail-agent/api test`: 106/106 pass.
- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- Request thật lưu tại `tests/backend-business-rag-results.json`.

## Kết Quả Request Thật

- Giới thiệu cửa hàng: trả về `store_profile_retailhome`, có embedding 2048 chiều và rerank score > 0.
- Bảo hành máy lọc/lõi lọc: trả về `policy_warranty_air_purifier_filters`.
- Đổi trả/hoàn tiền: trả về `policy_returns_7_days`.
- Hậu mãi/combo robot hút bụi: trả về `promotion_bundle_filters` và `policy_after_sales_30_days`.

dev by ambrouse
