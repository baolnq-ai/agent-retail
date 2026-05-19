# Phase 1 Backend Foundation

- Thời gian cập nhật: 2026-05-14
- Task: backend foundation theo `plan-skill`
- Phạm vi: env validation, structured logger, correlation id, health dependency status, runtime HTTP verification

## Nội dung đã triển khai

Backend API đã được chuẩn hoá theo cấu trúc skill:

```txt
apps/api/src/
  config/
    environment.ts
  controllers/
    health.controller.ts
  services/
    health.service.ts
  utils/
    correlation-id.ts
    json-logger.ts
```

## Env validation

`loadEnvironment()` validate `API_PORT`:

- Mặc định: `3001`.
- Chỉ nhận số nguyên trong khoảng `1..65535`.
- Giá trị sai sẽ throw lỗi rõ ràng trước khi app listen.

## Structured logging

`JsonLogger` ghi log JSON với các field chính:

- `timestamp`
- `level`
- `service`
- `context`
- `message`

## Correlation id

Health endpoint đọc header `x-correlation-id`:

- Nếu request gửi correlation id thì response giữ nguyên id đó.
- Nếu request không gửi thì server tự sinh UUID.
- Response header và body đều chứa correlation id để trace request.

## Health endpoint

`GET /health` trả runtime status:

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-14T...Z",
  "dependencies": {
    "api": "ok"
  },
  "correlationId": "runtime-request-1"
}
```

## Kiểm tra đã chạy

Đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime verification dùng request thật:

- Spawn API process thật từ `dist/main.js`.
- Gửi `GET /health` tới `http://127.0.0.1:<port>/health`.
- Assert HTTP 200, response body, dependency status và `x-correlation-id` header.
- Spawn web process thật từ `next start` và gửi HTTP request thật tới `/`.

## Trạng thái phase

Phase 1 pass. Không dùng smoke/fallback làm tiêu chí pass; health endpoint đã được xác nhận bằng runtime HTTP request thật.
