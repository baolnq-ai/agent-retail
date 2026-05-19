# Phase 8 Browser Connectivity

- Thời gian cập nhật: 2026-05-15
- Task: sửa frontend không tương tác được với backend từ browser

## Vấn đề

Frontend chạy ở `http://127.0.0.1:7000` còn API chạy ở `http://127.0.0.1:7010`. Browser fetch từ web sang API khác port cần CORS. API trước đó chưa bật CORS nên UI render được nhưng các action chat/cart/order/payment từ browser bị chặn.

## Nội dung đã sửa

- Bật CORS trong `apps/api/src/main.ts` cho:
  - `http://127.0.0.1:7000`
  - `http://localhost:7000`
- Cho phép methods: `GET`, `POST`, `OPTIONS`.
- Cho phép headers: `content-type`, `idempotency-key`, `x-correlation-id`.
- Thêm runtime test `apps/api/tests/runtime-cors.mjs`.

## Runtime verification

Đã pass:

```txt
corepack pnpm --filter @retail-agent/api test:runtime
```

Live browser-origin verification:

```json
{
  "chatCors": "http://127.0.0.1:7000",
  "chatText": true,
  "cartCors": "http://127.0.0.1:7000",
  "cartItems": 1
}
```

## Trạng thái

Frontend hiện có thể gọi backend thật từ browser origin `7000` sang API `7010` cho chat và cart. Các endpoint order/payment cũng dùng cùng CORS policy và đã nằm trong allowed headers/methods.
