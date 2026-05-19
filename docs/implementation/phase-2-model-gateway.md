# Phase 2 ModelGateway

- Thời gian cập nhật: 2026-05-14
- Task: ModelGateway với request thật tới chat/embed/rerank servers

## Nội dung đã triển khai

Đã thêm `ModelGatewayService` và `ModelGatewayController`:

```txt
apps/api/src/services/model-gateway.service.ts
apps/api/src/controllers/model-gateway.controller.ts
```

Endpoints runtime:

- `GET /model-gateway/health`
- `POST /model-gateway/chat`
- `POST /model-gateway/embed`
- `POST /model-gateway/rerank`

## Model servers

- Chat: `https://replace-with-your-vllm-gateway.example.invalid`
- Model: `google/gemma-4-E4B-it`
- Embedding/rerank: `https://replace-with-your-embed-rerank-gateway.example.invalid`

Các env vars đã được validate trong backend config:

- `CHAT_MODEL_BASE_URL`
- `CHAT_MODEL_ID`
- `EMBED_RERANK_BASE_URL`

## Runtime verification

Đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime ModelGateway test thực hiện qua API đang chạy thật:

1. Spawn `node dist/main.js`.
2. Gửi `GET /model-gateway/health`.
3. Gửi `POST /model-gateway/chat` tới chat model server thật.
4. Gửi `POST /model-gateway/embed` tới embedding server thật.
5. Gửi `POST /model-gateway/rerank` tới rerank server thật.
6. Assert response schema và ranking mẫu.

## Trạng thái phase

Phase 2 pass. Không dùng fallback/smoke để pass; test đã đi qua API runtime thật và model servers thật.
