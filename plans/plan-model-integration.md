# Plan Model Integration - Retail Agent

- Ngày cập nhật: 2026-05-14
- Task name: `model-integration`
- Trạng thái: plan con, thực hiện sau backend foundation

## 1. Mục tiêu

Tích hợp chat model, embedding và rerank server nội bộ qua một `ModelGateway` duy nhất, có timeout, retry có kiểm soát, circuit breaker, observability, fallback và evaluation.

## 2. Dependencies

- Phụ thuộc: `plans/plan-master-implementation-roadmap.md` Phase 1 Backend foundation.
- Block cho: agent orchestration, search vector/rerank, AI evaluation.
- Không được gọi direct model URL ngoài module `model-gateway`.

## 3. Required resources / prerequisites

- Chat server: `https://replace-with-your-vllm-gateway.example.invalid`.
- Chat endpoint: `POST /v1/chat/completions`.
- Chat model id: `google/gemma-4-E4B-it`.
- Embedding/rerank server: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- Health: `GET /health`.
- Embedding: `POST /api/v1/embed`.
- Rerank: `POST /api/v1/rerank`.
- Backend config/env system đã có.
- Test runner đã có.
- Nếu `testing-skill` chưa tồn tại, dùng checklist testing trong plan này.

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

- `chat()` dùng `google/gemma-4-E4B-it`.
- `classifyIntent()` dùng chat model với structured JSON prompt trước.
- `embed()` dùng `/api/v1/embed`.
- `rerank()` dùng `/api/v1/rerank`.
- `moderate()` dùng rule-based trước, model classifier sau nếu cần.
- `summarizeConversation()` dùng chat model với token budget thấp.

## 5. Timeout, retry, fallback

- Chat timeout: 20-45s, chỉ retry nếu chưa stream token nào.
- Embedding timeout: 10-15s, retry 1 lần cho network transient.
- Rerank timeout: 5-10s, retry 1 lần cho network transient.
- Không retry blind với mutation.
- Chat server lỗi nhiều: fallback deterministic answer hoặc handoff.
- Rerank lỗi: fallback keyword/vector score.
- Embedding lỗi: fallback keyword search.

## 6. Prompt và output policy

- Prompt phải có metadata: `promptName`, `version`, `modelId`.
- Response model phải validate schema trước khi dùng để gọi tool/action.
- Không đưa secret, system internals, raw SQL, payment data vào prompt.
- Redact PII trước khi gửi model nếu policy yêu cầu.
- Model không quyết định giá, tồn kho, payment, order state.

## 7. Tool calling strategy

Cần test thực tế `google/gemma-4-E4B-it` qua vLLM có hỗ trợ tool/function calling chuẩn OpenAI không.

- Nếu ổn định: dùng native tool calling, validate `tool_calls` theo schema.
- Nếu không ổn định: dùng strict JSON action protocol.

```json
{
  "response_type": "tool_request",
  "tool_name": "searchProducts",
  "arguments": { "query": "..." }
}
```

Parse bằng JSON schema nghiêm ngặt. Nếu parse fail thì hỏi lại, retry có giới hạn hoặc handoff.

## 8. Phase thực hiện

### Phase 1. Model smoke tests trong code

- Thời gian: 0.5 ngày.
- Dependencies: backend config/test runner.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Thêm env `CHAT_MODEL_BASE_URL`, `CHAT_MODEL_ID`, `EMBED_RERANK_BASE_URL`.
  - Viết health client cho chat/embed/rerank.
  - Viết smoke test chat/embed/rerank.
- Testing bắt buộc:
  - Server reachable.
  - Response schema đúng.
  - UTF-8 tiếng Việt đúng qua Node client.
- Documentation bắt buộc:
  - Ghi env vars và endpoint contract.
- Logging bắt buộc:
  - Log kết quả smoke, latency, lỗi nếu có.
- Pass criteria:
  - Test tự động xác nhận 3 capability hoạt động.

### Phase 2. Gateway abstraction

- Thời gian: 0.5-1 ngày.
- Dependencies: Phase 1.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Implement interfaces.
  - Add timeout/retry/circuit breaker.
  - Add request id/token usage logs.
  - Chuẩn hoá error mapping.
- Testing bắt buộc:
  - Unit test timeout/retry/fallback.
  - Contract test direct gateway methods.
- Documentation bắt buộc:
  - Document gateway behavior và fallback matrix.
- Logging bắt buộc:
  - Log model provider, model id, latency, error code, token usage nếu có.
- Pass criteria:
  - Service dùng gateway, không gọi direct URL ngoài module.

### Phase 3. Agent integration

- Thời gian: 1 ngày.
- Dependencies: Phase 2, tool registry cơ bản.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Intent classifier.
  - Tool decision structured output.
  - Prompt templates versioned.
  - Confirmation policy hook cho sensitive action.
- Testing bắt buộc:
  - Conversation tests chọn đúng tool.
  - JSON validity tests.
  - Sensitive actions không chạy nếu chưa confirm.
- Documentation bắt buộc:
  - Document prompt names, output schema, confirmation rules.
- Logging bắt buộc:
  - Log eval cases pass/fail.
- Pass criteria:
  - Agent chọn đúng tool ở bộ test mẫu và không mutate khi chưa confirm.

### Phase 4. Eval và tuning

- Thời gian: 1-2 ngày.
- Dependencies: Phase 3.
- Skills cần đọc trước: `backend-skill`, `logging-skill`, `testing-skill` nếu tồn tại.
- Implementation:
  - Dataset hội thoại mẫu.
  - Regression runner.
  - Latency/token report.
- Testing bắt buộc:
  - 50 câu intent classification.
  - 50 câu product advice/search.
  - 30 câu policy QA.
  - 30 câu cart/order action.
  - 20 câu prompt injection/red-team.
  - 20 câu tiếng Việt có dấu, slang, typo.
- Documentation bắt buộc:
  - Document eval dataset và threshold.
- Logging bắt buộc:
  - Log accuracy, hallucination, latency p50/p95, UTF-8 result.
- Pass criteria:
  - Đạt threshold đã chốt trước khi dùng trong flow chính.

## 9. Definition of Done

- Gateway gọi được chat/embed/rerank.
- Timeout/retry/fallback có test.
- Prompt/output schema có version và validation.
- UTF-8 verified qua Node/browser.
- Eval dataset chạy được và report có lưu log.
- Không có direct model URL rải rác ngoài gateway.
- Documentation và logging được cập nhật.

## 10. Rủi ro

- Tool calling native không ổn định -> dùng strict JSON action protocol.
- Tiếng Việt bị encoding lỗi -> verify bằng Node/browser, không dựa vào PowerShell console.
- Latency cao -> intent routing, cache, deterministic shortcut.
- Server nội bộ downtime -> health check, circuit breaker, handoff.
