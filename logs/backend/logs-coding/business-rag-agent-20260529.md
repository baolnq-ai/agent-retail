# Business RAG Agent - 2026-05-29

## Đã Làm

- Thêm `BusinessRagAgentService` cho nhóm nghiệp vụ cửa hàng/chính sách/hậu mãi.
- Chuyển `KnowledgeService` sang retrieval thật bằng embedding, Qdrant và rerank.
- Seed thêm tài liệu nghiệp vụ vào bảng `KnowledgeDocument`: giới thiệu cửa hàng, liên hệ, đổi trả, hoàn tiền, bảo hành, giao hàng, thanh toán, lắp đặt, hậu mãi, khuyến mãi, FAQ tư vấn và khiếu nại.
- Giữ product search/recommend ở hard keyword/facet, không dùng embedding/rerank cho sản phẩm.
- Cập nhật trace/pipeline để `rag-agent` thể hiện đúng business vector search và reranked docs.

## Validation

- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/api test`: 106/106 pass.
- `.\setup.ps1`: pass, API `3110`, web `3100`, nginx `3120`.

## Request Thật

Kết quả lưu ở `tests/backend-business-rag-results.json`.

- Giới thiệu RetailHome: dùng `store_profile_retailhome`.
- Bảo hành máy lọc/lõi lọc: dùng `policy_warranty_air_purifier_filters`.
- Đổi trả/hoàn tiền: dùng `policy_returns_7_days`.
- Hậu mãi/combo robot hút bụi: dùng `promotion_bundle_filters` và `policy_after_sales_30_days`.

## Ghi Chú

- RAG nghiệp vụ không fallback lexical khi embedding/rerank lỗi.
- Không ghi secret hoặc nội dung `.env`.

dev by ambrouse
