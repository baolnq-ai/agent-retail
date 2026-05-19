# Phase 2 ModelGateway Log

- Thời gian: 2026-05-14
- Task: triển khai ModelGateway theo plan-skill

## Hoạt động chính

- Đọc lại `backend-skill`, `documentation-skill`, `logging-skill`.
- Kiểm tra model servers bằng Node fetch thật:
  - `GET https://replace-with-your-vllm-gateway.example.invalid/v1/models` trả 200.
  - `GET https://replace-with-your-embed-rerank-gateway.example.invalid/health` trả 200.
- Mở rộng env validation cho model gateway config.
- Thêm `ModelGatewayService` với health/chat/embed/rerank.
- Thêm `ModelGatewayController` để test gateway qua API runtime thật.
- Thêm runtime test `tests/runtime-model-gateway.mjs`.

## Test đã chạy

Pass toàn bộ:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime test thật đã xác nhận:

- API process thật chạy từ `dist/main.js`.
- API gọi thật tới chat model server, embedding server, rerank server.
- Chat response có content/model.
- Embedding response trả vector number arrays.
- Rerank xếp document máy lọc không khí ở index 0.

## Trạng thái

Phase 2 pass theo tiêu chí request thật. Không dùng fallback để pass.
