# Phase 7 Real Agent Chat And Interactions

- Thời gian cập nhật: 2026-05-15
- Task: hoàn thiện chat thật, LLM thật, embedding/rerank thật, frontend interactions thật

## Nội dung đã triển khai

### Backend

- Thêm `POST /api/v1/chat`.
- Endpoint dùng:
  - PostgreSQL catalog/knowledge data thật.
  - `ModelGatewayService.embed` gọi embedding server thật.
  - `ModelGatewayService.rerank` gọi rerank server thật.
  - `ModelGatewayService.chat` gọi LLM server thật.
- Response trả structured blocks:
  - `text`.
  - `product_list`.
  - `policy_answer`.
  - `cart_summary`.
  - `quick_replies`.
- Thêm runtime test `apps/api/tests/runtime-agent-chat.mjs`.

### Frontend

- Tách interactive client component `RetailClient`.
- Chat composer gọi `POST /api/v1/chat` thật.
- Product buttons gọi `POST /api/v1/cart/:cartId/items` thật.
- Order button gọi `POST /api/v1/orders` và `POST /api/v1/orders/:orderId/confirm` thật.
- Payment button gọi `POST /api/v1/payments/intents` thật.
- Cart/order/payment state cập nhật từ response backend thật.

## Runtime validation đã pass

Đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web test:runtime
```

Live app đang chạy:

- Web: `http://127.0.0.1:7000`
- API: `http://127.0.0.1:7010`

Live verification result:

```json
{
  "health": "ok",
  "database": "ok",
  "chatText": true,
  "embedding": true,
  "productBlock": true,
  "cartItems": 1,
  "order": "confirmed",
  "payment": "created",
  "webInteractive": true
}
```

## Giới hạn còn lại không được fake

- Payment hiện là payment intent provider `mock` vì chưa có external provider sandbox credentials. Endpoint vẫn là API thật và persist DB thật, nhưng không phải external payment gateway thật.
- Ops console/admin dashboard chưa triển khai full production.
- Project directory hiện chưa là git repository nên chưa thể commit/push.
