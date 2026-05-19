# Phase 15 Full Chat Pipeline Audit Log

- Thời gian: 2026-05-15
- Task: review toàn bộ pipeline chat hiện tại gồm UI, streaming, retrieval, recommendation, LLM, quick replies, add-to-cart/cart/order/payment.

## Hoạt động chính

- Đọc `apps/api/src/services/agent.service.ts` để phân tích prepareChat, streaming, buildResponse, product_list, quick replies.
- Đọc `apps/api/src/services/catalog.service.ts` để phân tích search heuristic và scoring sản phẩm.
- Đọc `apps/api/src/services/model-gateway.service.ts` để xác nhận LLM/embedding/rerank đều gọi thật nhưng embedding chưa dùng cho vector search.
- Đọc `apps/api/src/services/knowledge.service.ts` để phân tích search policy bằng token overlap.
- Đọc `apps/api/src/services/commerce.service.ts` để phân tích cart/order/payment thật và gap action từ chat.
- Đọc `apps/api/src/controllers/agent.controller.ts` và `apps/api/src/models/agent.models.ts` để xác nhận response/event contract.
- Đọc `apps/web/src/app/retail-client.tsx` và `apps/web/src/app/styles.css` để phân tích frontend chat, quick replies, product carousel, stream parsing và action handlers.
- Gọi request thật `POST /api/v1/chat` với message `Tư vấn sản phẩm dưới 2 triệu` để kiểm tra behavior runtime.
- Ghi tài liệu audit chi tiết tại `docs/implementation/phase-15-full-chat-pipeline-audit.md`.

## Phát hiện chính

- Search hiện tại không parse ngân sách tổng quát như `dưới 2tr`, chỉ hard-code `4 triệu`.
- Budget/category/room chưa là hard filters trước rerank.
- Rerank chỉ rerank candidate đã được heuristic search chọn nên không đảm bảo constraint.
- LLM trả free text, không có output contract structured cho selected products/actions.
- Quick reply `Thêm X vào giỏ` chỉ gửi text lại chat, chưa execute cart action.
- Add-to-cart thật chỉ tồn tại ở nút product card.
- Carousel hiện tại dễ vỡ layout vì bubble `fit-content`, grid nav buttons và card `min-width:100%`.

## Artifact

- `docs/implementation/phase-15-full-chat-pipeline-audit.md`
