# Plan Backend Architecture, Database Và Sample Data

- Ngày cập nhật: 2026-05-14
- Task name: `backend-architecture-data`
- Trạng thái: plan con cho backend modules, database, API và dữ liệu mẫu

## 1. Mục tiêu

Thiết kế và triển khai backend production-grade cho retail chatbot agent, gồm module domain, database schema, API contract, dữ liệu mẫu thực tế, tool registry và nền tảng vận hành.

## 2. Dependencies

- Phụ thuộc: `plans/archive/initial-roadmap/master-implementation-roadmap.md` Phase 0 và Phase 1.
- Liên quan trực tiếp: `plans/platform/model-integration.md` cho ModelGateway, embedding/rerank.
- Block cho: frontend block schema, agent orchestration, production hardening.

## 3. Required resources / prerequisites

- Backend framework đã chốt, mặc định NestJS + TypeScript.
- ORM/query đã chốt, mặc định Prisma nếu cần tốc độ development.
- PostgreSQL 16+.
- pgvector extension.
- Redis.
- Local/test database strategy.
- Seed data retail mẫu.
- Env validation đã có.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong plan này.

## 4. Kiến trúc backend

Khuyến nghị: modular monolith bằng TypeScript.

```txt
apps/api/src/modules/
  auth/
  customers/
  conversations/
  agent/
  model-gateway/
  catalog/
  search/
  knowledge/
  recommendations/
  carts/
  orders/
  payments/
  shipping/
  promotions/
  handoff/
  audit/
  analytics/
  admin/
  observability/
```

Nguyên tắc:

- Module domain rõ ràng.
- Backend quyết định nghiệp vụ, model chỉ đề xuất intent/action qua schema.
- Mutation quan trọng phải có transaction, idempotency và audit.
- Redis không là source of truth cho cart/order.

## 5. Database/service mapping

### PostgreSQL

Dùng cho dữ liệu hệ thống chính:

- users/staff/customers
- conversations/messages/tool calls
- products/variants/categories/inventory
- carts/cart_items
- orders/order_items/order_events
- payment_intents/payment_events
- promotions
- knowledge_documents/chunks/vector embeddings
- audit_events
- handoff tickets

### pgvector

Dùng cho:

- `knowledge_chunks.embedding`
- optional `product_embeddings.embedding`

MVP dùng pgvector để giảm số hệ thống cần vận hành. Chỉ tách vector/search engine khi catalog lớn.

### Redis

Dùng cho:

- session cache
- rate limit
- model response cache ngắn hạn
- product detail cache
- cart lock/idempotency lock
- background job queue nếu dùng BullMQ
- streaming pub/sub nếu cần

### Object storage

Dùng cho product images, import files, reports, attachments nếu phase sau có upload.

## 6. Core schema đề xuất

### Catalog

```txt
categories(id, name, slug, parent_id, sort_order, is_active)
brands(id, name, slug, logo_url)
products(id, title, slug, brand_id, category_id, description, status, rating_avg, review_count, created_at, updated_at)
product_variants(id, product_id, sku, name, attributes_json, price, compare_at_price, currency, image_url, status)
inventory(id, variant_id, location_id, available_qty, reserved_qty, safety_stock, updated_at)
product_media(id, product_id, variant_id, url, alt_text, sort_order)
product_specs(id, product_id, spec_group, name, value, unit)
```

Index bắt buộc:

- `products(title)` full-text/trigram.
- `products(category_id, status)`.
- `product_variants(sku)` unique.
- `product_variants(price)`.
- `inventory(variant_id, location_id)`.

### Knowledge

```txt
knowledge_sources(id, type, name, version, trust_level, status)
knowledge_documents(id, source_id, title, content, metadata_json, status, updated_at)
knowledge_chunks(id, document_id, chunk_index, content, embedding vector, metadata_json)
```

Index bắt buộc:

- full-text on `knowledge_chunks.content`.
- vector index on `embedding`.
- `source_id`, `trust_level`.

### Conversation

```txt
conversation_sessions(id, channel, customer_id, anonymous_id, status, current_cart_id, assigned_staff_id, last_intent, created_at, updated_at)
messages(id, conversation_id, role, content_json, text_content, metadata_json, created_at)
tool_calls(id, conversation_id, message_id, tool_name, input_hash, input_summary, output_summary, status, latency_ms, error_code, created_at)
conversation_summaries(id, conversation_id, summary, token_count, created_at)
```

Không lưu raw sensitive data trong `input_summary/output_summary`.

### Customer/Auth

```txt
customers(id, name, phone, email, consent_marketing, segment, created_at, updated_at)
staff_users(id, email, name, role, status, password_hash_or_provider_id, created_at)
customer_addresses(id, customer_id, name, phone, address_line, ward, district, province, is_default)
```

MVP có thể dùng anonymous session, chỉ thu phone/email khi checkout.

### Cart

```txt
carts(id, customer_id, anonymous_id, status, version, currency, subtotal, discount_total, shipping_fee, grand_total, created_at, updated_at)
cart_items(id, cart_id, variant_id, quantity, unit_price, line_total, metadata_json)
cart_promotions(id, cart_id, promotion_id, code, discount_amount)
idempotency_keys(id, scope, key, request_hash, response_json, expires_at, created_at)
```

### Order

```txt
orders(id, order_number, customer_id, cart_snapshot_json, status, payment_status, fulfillment_status, version, subtotal, discount_total, shipping_fee, grand_total, currency, shipping_address_json, customer_note, created_at, updated_at)
order_items(id, order_id, variant_id, sku, title, quantity, unit_price, line_total, snapshot_json)
order_events(id, order_id, event_type, from_state, to_state, actor_type, actor_id, reason, metadata_json, created_at)
```

Order states:

- `draft`
- `pending_confirmation`
- `confirmed`
- `awaiting_payment`
- `paid`
- `fulfilling`
- `shipped`
- `completed`
- `cancel_requested`
- `cancelled`
- `failed`

### Payment

```txt
payment_intents(id, order_id, provider, provider_ref, amount, currency, status, payment_url, idempotency_key, expires_at, created_at, updated_at)
payment_events(id, payment_intent_id, provider_event_id, event_type, signature_valid, payload_hash, status, created_at)
```

Payment states:

- `created`
- `pending`
- `succeeded`
- `failed`
- `expired`
- `cancelled`
- `refunded`
- `reconciled`

### Handoff/Ops

```txt
handoff_tickets(id, conversation_id, customer_id, priority, reason, status, assigned_staff_id, summary, created_at, updated_at)
internal_notes(id, ticket_id, staff_id, note, created_at)
```

### Audit/Analytics

```txt
audit_events(id, actor_type, actor_id, action, entity_type, entity_id, before_summary, after_summary, correlation_id, created_at)
analytics_events(id, event_name, customer_id, conversation_id, metadata_json, created_at)
```

## 7. API design

### Chat/agent

- `POST /api/v1/chat/sessions`
- `GET /api/v1/chat/sessions/:id`
- `POST /api/v1/chat/sessions/:id/messages`
- `GET /api/v1/chat/sessions/:id/messages`
- `POST /api/v1/chat/sessions/:id/handoff`

Response message dùng block schema:

```json
{
  "messageId": "msg_001",
  "conversationId": "conv_001",
  "blocks": [
    { "type": "text", "content": "Tôi tìm thấy 3 sản phẩm phù hợp." },
    { "type": "product_list", "products": [] },
    { "type": "quick_replies", "items": [] }
  ],
  "state": {
    "requiresConfirmation": false,
    "handoffAvailable": true
  }
}
```

### Catalog/search

- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/products/:id/availability`
- `POST /api/v1/search/products`
- `POST /api/v1/recommendations/products`

### Cart/order/payment

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `POST /api/v1/cart/promotions`
- `POST /api/v1/orders/drafts`
- `POST /api/v1/orders/drafts/:id/confirm`
- `GET /api/v1/orders/:id`
- `GET /api/v1/orders/:id/editable-fields`
- `PATCH /api/v1/orders/:id`
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/payments/intents`
- `POST /api/v1/payments/webhooks/:provider`

### Admin/Ops

- `GET /api/v1/admin/conversations`
- `GET /api/v1/admin/conversations/:id`
- `POST /api/v1/admin/conversations/:id/takeover`
- `POST /api/v1/admin/conversations/:id/release`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/payments`
- `GET /api/v1/admin/dashboard/overview`
- `GET /api/v1/admin/dashboard/agent-performance`

## 8. Tool registry cho agent

- `searchProducts`
- `getProductDetails`
- `compareProducts`
- `recommendProducts`
- `recommendAlternatives`
- `searchKnowledge`
- `getCart`
- `addCartItem`
- `updateCartItem`
- `removeCartItem`
- `calculateCart`
- `createOrderDraft`
- `getEditableOrderFields`
- `updateOrderDraft`
- `confirmOrderDraft`
- `getOrderStatus`
- `createPaymentIntent`
- `handoffToHuman`

Mỗi tool phải có JSON schema, validation, auth context, rate limit, audit và policy kiểm tra state.

## 9. Sample data thực tế

Categories:

- Điện gia dụng
- Thiết bị nhà bếp
- Chăm sóc cá nhân
- Điện thoại & phụ kiện
- Mẹ và bé
- Nhà cửa đời sống

Products mẫu:

1. Máy lọc không khí AiroClean P35: 3.490.000 VND, phòng 25-35m2, HEPA H13, PM2.5, app control, inventory 42.
2. Máy lọc không khí FreshHome Mini 20: 1.990.000 VND, phòng 15-22m2, HEPA H12, noise 28dB, inventory 18.
3. Nồi chiên không dầu ChefMax AF55: 2.290.000 VND, 5.5L, 8 preset, inventory 35.
4. Máy pha cà phê BaristaGo Compact: 3.990.000 VND, espresso, milk frother, 15 bar, inventory 12.
5. Bàn chải điện SmilePro S2: 890.000 VND, 3 chế độ, timer, IPX7, inventory 76.
6. Tai nghe SoundLite ANC Pro: 1.790.000 VND, ANC, pin 40h, Bluetooth 5.3, inventory 28.

FAQ/policy mẫu:

- Đổi trả trong 7 ngày nếu sản phẩm lỗi từ nhà sản xuất.
- Hoàn tiền trong 3-7 ngày làm việc tuỳ phương thức thanh toán.
- Miễn phí giao hàng cho đơn từ 1.000.000 VND trong nội thành.
- Hỗ trợ xuất hoá đơn VAT trong vòng 24h sau khi đặt hàng.
- Đơn đã bàn giao vận chuyển không thể sửa sản phẩm, chỉ có thể yêu cầu đổi trả sau khi nhận.

Conversation mẫu:

- “Tôi cần máy lọc không khí cho phòng ngủ 25m2, dưới 4 triệu.”
- “So sánh AiroClean P35 với FreshHome Mini 20.”
- “Thêm AiroClean vào giỏ, số lượng 1.”
- “Tôi muốn đổi sang giao về Quận 7.”
- “Đơn của tôi thanh toán rồi có sửa số lượng được không?”

## 10. Phase thực hiện

### Phase 1. Database schema và migrations

- Thời gian: 1 ngày.
- Dependencies: backend foundation.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `documentation-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Tạo schema core.
  - Tạo migrations.
  - Tạo seed data.
- Testing bắt buộc:
  - Migration chạy được trên DB sạch.
  - Seed repeatable.
  - Index chính tồn tại.
- Documentation bắt buộc:
  - Document schema, state, seed command.
- Logging bắt buộc:
  - Log migration/seed result.
- Pass criteria:
  - Migrate + seed chạy repeatable.

### Phase 2. Catalog/search/knowledge APIs

- Thời gian: 1-2 ngày.
- Dependencies: Phase 1, ModelGateway embed/rerank nếu dùng vector.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `documentation-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Product APIs.
  - Search keyword/vector.
  - Knowledge ingestion.
  - Rerank integration.
- Testing bắt buộc:
  - Search relevance.
  - Vector stored.
  - Rerank đúng query mẫu.
  - API contract tests.
- Documentation bắt buộc:
  - Document endpoints và ingestion flow.
- Logging bắt buộc:
  - Log query mẫu, latency, relevance result.
- Pass criteria:
  - Query mẫu trả đúng sản phẩm và có source/citation.

### Phase 3. Cart/order/payment APIs

- Thời gian: 2-3 ngày.
- Dependencies: Phase 1, product/variant/inventory.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `documentation-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Cart business rules.
  - Order draft/confirm/edit/cancel state machine.
  - Payment intent mock/interface.
  - Audit events.
- Testing bắt buộc:
  - Integration core flow.
  - Idempotency duplicate request.
  - Concurrent cart update.
  - Webhook mock replay nếu có.
- Documentation bắt buộc:
  - Document state machine, idempotency, payment interface.
- Logging bắt buộc:
  - Log integration and concurrency test result.
- Pass criteria:
  - Core checkout flow đúng và không tạo trùng order/payment.

### Phase 4. Agent tool layer

- Thời gian: 1-2 ngày.
- Dependencies: Phase 2, Phase 3.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `documentation-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Tool registry.
  - JSON schema validation.
  - Auth/state policy.
  - Audit tool calls.
- Testing bắt buộc:
  - Tool schema contract.
  - Unauthorized/sensitive action blocked.
  - Audit event generated.
- Documentation bắt buộc:
  - Document tool list and schema policy.
- Logging bắt buộc:
  - Log tool test matrix.
- Pass criteria:
  - Agent chỉ gọi tool qua schema và policy.

### Phase 5. Admin APIs và analytics

- Thời gian: 1-2 ngày.
- Dependencies: conversation, order, payment, audit data.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `documentation-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Ops console endpoints.
  - Dashboard metrics.
  - Conversation detail and tool timeline.
- Testing bắt buộc:
  - RBAC.
  - Dashboard correctness từ seed/events.
  - Pagination/filter contract.
- Documentation bắt buộc:
  - Document admin endpoints and metrics definitions.
- Logging bắt buộc:
  - Log admin API validation.
- Pass criteria:
  - Dashboard trả số liệu đúng từ seed/events.

## 11. Definition of Done

- Schema/migration/seed repeatable.
- API contracts có validation.
- Cart/order/payment có idempotency, state machine, audit.
- Tool registry có schema và policy.
- Backend tests của phase pass.
- Documentation và logs được cập nhật.

## 12. Rủi ro

- Over-engineering DB quá sớm -> giữ modular monolith, chỉ tách service khi có traffic thật.
- Search kém do sample data ít -> chuẩn hoá metadata và FAQ tốt.
- Cart/order race condition -> version + transaction + idempotency.
- Model hallucination -> backend facts chỉ từ tool output.
