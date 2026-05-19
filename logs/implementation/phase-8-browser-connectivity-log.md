# Phase 8 Browser Connectivity Log

- Thời gian: 2026-05-15
- Task: sửa lỗi frontend không tương tác được với backend

## Hoạt động chính

- Kiểm tra API live log và xác nhận route `/api/v1/chat` đã mapped.
- Xác định nguyên nhân browser không tương tác được là thiếu CORS giữa web port 7000 và API port 7010.
- Thêm `app.enableCors` trong API bootstrap.
- Restart API port 7010 với build mới.
- Test preflight `OPTIONS /api/v1/chat` với Origin `http://127.0.0.1:7000`.
- Test GET products và POST chat/cart có Origin browser.
- Thêm runtime test CORS vào API test suite.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api test:runtime
```

Live check pass:

```json
{
  "chatCors": "http://127.0.0.1:7000",
  "chatText": true,
  "cartCors": "http://127.0.0.1:7000",
  "cartItems": 1
}
```
