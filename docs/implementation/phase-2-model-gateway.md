# Phase 2 ModelGateway

- Thá»i gian cáº­p nháº­t: 2026-05-14
- Task: ModelGateway vá»›i request tháº­t tá»›i chat/embed/rerank servers

## Ná»™i dung Ä‘Ã£ triá»ƒn khai

ÄÃ£ thÃªm `ModelGatewayService` vÃ  `ModelGatewayController`:

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

CÃ¡c env vars Ä‘Ã£ Ä‘Æ°á»£c validate trong backend config:

- `CHAT_MODEL_BASE_URL`
- `CHAT_MODEL_ID`
- `EMBED_RERANK_BASE_URL`

## Runtime verification

ÄÃ£ cháº¡y thÃ nh cÃ´ng:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime ModelGateway test thá»±c hiá»‡n qua API Ä‘ang cháº¡y tháº­t:

1. Spawn `node dist/main.js`.
2. Gá»­i `GET /model-gateway/health`.
3. Gá»­i `POST /model-gateway/chat` tá»›i chat model server tháº­t.
4. Gá»­i `POST /model-gateway/embed` tá»›i embedding server tháº­t.
5. Gá»­i `POST /model-gateway/rerank` tá»›i rerank server tháº­t.
6. Assert response schema vÃ  ranking máº«u.

## Tráº¡ng thÃ¡i phase

Phase 2 pass. KhÃ´ng dÃ¹ng fallback/smoke Ä‘á»ƒ pass; test Ä‘Ã£ Ä‘i qua API runtime tháº­t vÃ  model servers tháº­t.
