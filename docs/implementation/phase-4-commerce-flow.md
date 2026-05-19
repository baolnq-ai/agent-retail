# Phase 4 Cart/Order/Payment Flow

- Thời gian cập nhật: 2026-05-14
- Task: cart/order/payment APIs với runtime request thật và idempotency

## Nội dung đã triển khai

Đã thêm commerce models/service/controller:

```txt
apps/api/src/models/commerce.models.ts
apps/api/src/services/commerce.service.ts
apps/api/src/controllers/commerce.controller.ts
```

Runtime endpoints:

- `GET /api/v1/cart/:cartId`
- `POST /api/v1/cart/:cartId/items`
- `POST /api/v1/orders`
- `POST /api/v1/orders/:orderId/confirm`
- `POST /api/v1/payments/intents`

## Business behavior hiện có

- Cart in-memory có version, subtotal, grandTotal.
- Add item validate product tồn tại và quantity hợp lệ theo inventory sample.
- Create order yêu cầu `idempotency-key`.
- Confirm order chuyển trạng thái sang `confirmed`.
- Create payment intent yêu cầu order đã confirmed và `idempotency-key`.
- Payment provider hiện là `mock` adapter.

## Runtime verification

Đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime test gọi API thật:

1. Add `prod_air_clean_p35` vào cart.
2. Create order với idempotency key.
3. Gọi lại create order cùng key và assert cùng order id.
4. Confirm order.
5. Create mock payment intent với idempotency key.
6. Gọi lại create payment cùng key và assert cùng payment id.

## Blocker production chưa pass

Các mục sau chưa thể đánh dấu production pass vì chưa có dependency thật:

- Database transaction/locking thật.
- Persistent idempotency store thật.
- Payment provider sandbox/thật như VNPay/MoMo/PayOS/Stripe.
- Webhook signature/replay/out-of-order test với provider thật.

Không fake pass các mục này. Hiện chỉ pass runtime flow với in-memory store và mock payment adapter.
