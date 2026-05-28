# Plan Model Integration - Retail Agent

- NgÃ y cáº­p nháº­t: 2026-05-14
- Task name: `model-integration`
- Tráº¡ng thÃ¡i: plan con, thá»±c hiá»‡n sau backend foundation

## 1. Má»¥c tiÃªu

TÃ­ch há»£p chat model, embedding vÃ  rerank server ná»™i bá»™ qua má»™t `ModelGateway` duy nháº¥t, cÃ³ timeout, retry cÃ³ kiá»ƒm soÃ¡t, circuit breaker, observability, fallback vÃ  evaluation.

## 2. Dependencies

- Phá»¥ thuá»™c: `plans/archive/initial-roadmap/master-implementation-roadmap.md` Phase 1 Backend foundation.
- Block cho: agent orchestration, search vector/rerank, AI evaluation.
- KhÃ´ng Ä‘Æ°á»£c gá»i direct model URL ngoÃ i module `model-gateway`.

## 3. Required resources / prerequisites

- Chat server: `https://replace-with-your-vllm-gateway.example.invalid`.
- Chat endpoint: `POST /v1/chat/completions`.
- Chat model id: `google/gemma-4-E4B-it`.
- Embedding/rerank server: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- Health: `GET /health`.
- Embedding: `POST /api/v1/embed`.
- Rerank: `POST /api/v1/rerank`.
- Backend config/env system Ä‘Ã£ cÃ³.
- Test runner Ä‘Ã£ cÃ³.
- Náº¿u `testing-skill` chÆ°a tá»“n táº¡i, dÃ¹ng checklist testing trong plan nÃ y.

## 4. ModelGateway contract

```ts
interface ModelGateway {
  chat(request: ChatRequest): Promise<ChatResponse>;
  classifyIntent(request: IntentRequest): Promise<IntentResult>;
  embed(texts: string[]): Promise<number[][]>;
  rerank(query: string, documents: string[]): Promise<RerankResult[]>;
  moderate(input: SafetyInput): Promise<SafetyResult>;
  summarizeConversation(input: SummaryInput): Promise<SummaryResult>;
}
```

MVP behavior:

- `chat()` dÃ¹ng `google/gemma-4-E4B-it`.
- `classifyIntent()` dÃ¹ng chat model vá»›i structured JSON prompt trÆ°á»›c.
- `embed()` dÃ¹ng `/api/v1/embed`.
- `rerank()` dÃ¹ng `/api/v1/rerank`.
- `moderate()` dÃ¹ng rule-based trÆ°á»›c, model classifier sau náº¿u cáº§n.
- `summarizeConversation()` dÃ¹ng chat model vá»›i token budget tháº¥p.

## 5. Timeout, retry, fallback

- Chat timeout: 20-45s, chá»‰ retry náº¿u chÆ°a stream token nÃ o.
- Embedding timeout: 10-15s, retry 1 láº§n cho network transient.
- Rerank timeout: 5-10s, retry 1 láº§n cho network transient.
- KhÃ´ng retry blind vá»›i mutation.
- Chat server lá»—i nhiá»u: fallback deterministic answer hoáº·c handoff.
- Rerank lá»—i: fallback keyword/vector score.
- Embedding lá»—i: fallback keyword search.

## 6. Prompt vÃ  output policy

- Prompt pháº£i cÃ³ metadata: `promptName`, `version`, `modelId`.
- Response model pháº£i validate schema trÆ°á»›c khi dÃ¹ng Ä‘á»ƒ gá»i tool/action.
- KhÃ´ng Ä‘Æ°a secret, system internals, raw SQL, payment data vÃ o prompt.
- Redact PII trÆ°á»›c khi gá»­i model náº¿u policy yÃªu cáº§u.
- Model khÃ´ng quyáº¿t Ä‘á»‹nh giÃ¡, tá»“n kho, payment, order state.

## 7. Tool calling strategy

Cáº§n test thá»±c táº¿ `google/gemma-4-E4B-it` qua vLLM cÃ³ há»— trá»£ tool/function calling chuáº©n OpenAI khÃ´ng.

- Náº¿u á»•n Ä‘á»‹nh: dÃ¹ng native tool calling, validate `tool_calls` theo schema.
- Náº¿u khÃ´ng á»•n Ä‘á»‹nh: dÃ¹ng strict JSON action protocol.

```json
{
  "response_type": "tool_request",
  "tool_name": "searchProducts",
  "arguments": { "query": "..." }
}
```

Parse báº±ng JSON schema nghiÃªm ngáº·t. Náº¿u parse fail thÃ¬ há»i láº¡i, retry cÃ³ giá»›i háº¡n hoáº·c handoff.

## 8. Phase thá»±c hiá»‡n

### Phase 1. Model smoke tests trong code

- Thá»i gian: 0.5 ngÃ y.
- Dependencies: backend config/test runner.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - ThÃªm env `CHAT_MODEL_BASE_URL`, `CHAT_MODEL_ID`, `EMBED_RERANK_BASE_URL`.
  - Viáº¿t health client cho chat/embed/rerank.
  - Viáº¿t smoke test chat/embed/rerank.
- Testing báº¯t buá»™c:
  - Server reachable.
  - Response schema Ä‘Ãºng.
  - UTF-8 tiáº¿ng Viá»‡t Ä‘Ãºng qua Node client.
- Documentation báº¯t buá»™c:
  - Ghi env vars vÃ  endpoint contract.
- Logging báº¯t buá»™c:
  - Log káº¿t quáº£ smoke, latency, lá»—i náº¿u cÃ³.
- Pass criteria:
  - Test tá»± Ä‘á»™ng xÃ¡c nháº­n 3 capability hoáº¡t Ä‘á»™ng.

### Phase 2. Gateway abstraction

- Thá»i gian: 0.5-1 ngÃ y.
- Dependencies: Phase 1.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Implement interfaces.
  - Add timeout/retry/circuit breaker.
  - Add request id/token usage logs.
  - Chuáº©n hoÃ¡ error mapping.
- Testing báº¯t buá»™c:
  - Unit test timeout/retry/fallback.
  - Contract test direct gateway methods.
- Documentation báº¯t buá»™c:
  - Document gateway behavior vÃ  fallback matrix.
- Logging báº¯t buá»™c:
  - Log model provider, model id, latency, error code, token usage náº¿u cÃ³.
- Pass criteria:
  - Service dÃ¹ng gateway, khÃ´ng gá»i direct URL ngoÃ i module.

### Phase 3. Agent integration

- Thá»i gian: 1 ngÃ y.
- Dependencies: Phase 2, tool registry cÆ¡ báº£n.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Intent classifier.
  - Tool decision structured output.
  - Prompt templates versioned.
  - Confirmation policy hook cho sensitive action.
- Testing báº¯t buá»™c:
  - Conversation tests chá»n Ä‘Ãºng tool.
  - JSON validity tests.
  - Sensitive actions khÃ´ng cháº¡y náº¿u chÆ°a confirm.
- Documentation báº¯t buá»™c:
  - Document prompt names, output schema, confirmation rules.
- Logging báº¯t buá»™c:
  - Log eval cases pass/fail.
- Pass criteria:
  - Agent chá»n Ä‘Ãºng tool á»Ÿ bá»™ test máº«u vÃ  khÃ´ng mutate khi chÆ°a confirm.

### Phase 4. Eval vÃ  tuning

- Thá»i gian: 1-2 ngÃ y.
- Dependencies: Phase 3.
- Skills cáº§n Ä‘á»c trÆ°á»›c: `backend-skill`, `logging-skill`, `testing-skill` náº¿u tá»“n táº¡i.
- Implementation:
  - Dataset há»™i thoáº¡i máº«u.
  - Regression runner.
  - Latency/token report.
- Testing báº¯t buá»™c:
  - 50 cÃ¢u intent classification.
  - 50 cÃ¢u product advice/search.
  - 30 cÃ¢u policy QA.
  - 30 cÃ¢u cart/order action.
  - 20 cÃ¢u prompt injection/red-team.
  - 20 cÃ¢u tiáº¿ng Viá»‡t cÃ³ dáº¥u, slang, typo.
- Documentation báº¯t buá»™c:
  - Document eval dataset vÃ  threshold.
- Logging báº¯t buá»™c:
  - Log accuracy, hallucination, latency p50/p95, UTF-8 result.
- Pass criteria:
  - Äáº¡t threshold Ä‘Ã£ chá»‘t trÆ°á»›c khi dÃ¹ng trong flow chÃ­nh.

## 9. Definition of Done

- Gateway gá»i Ä‘Æ°á»£c chat/embed/rerank.
- Timeout/retry/fallback cÃ³ test.
- Prompt/output schema cÃ³ version vÃ  validation.
- UTF-8 verified qua Node/browser.
- Eval dataset cháº¡y Ä‘Æ°á»£c vÃ  report cÃ³ lÆ°u log.
- KhÃ´ng cÃ³ direct model URL ráº£i rÃ¡c ngoÃ i gateway.
- Documentation vÃ  logging Ä‘Æ°á»£c cáº­p nháº­t.

## 10. Rá»§i ro

- Tool calling native khÃ´ng á»•n Ä‘á»‹nh -> dÃ¹ng strict JSON action protocol.
- Tiáº¿ng Viá»‡t bá»‹ encoding lá»—i -> verify báº±ng Node/browser, khÃ´ng dá»±a vÃ o PowerShell console.
- Latency cao -> intent routing, cache, deterministic shortcut.
- Server ná»™i bá»™ downtime -> health check, circuit breaker, handoff.
