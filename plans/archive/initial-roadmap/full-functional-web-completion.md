# Plan Full Functional Web Completion

- NgÃ y cáº­p nháº­t: 2026-05-15
- Task name: `full-functional-web-completion`
- Má»¥c tiÃªu: hoÃ n thiá»‡n web retail agent Ä‘á»ƒ cÃ¡c chá»©c nÄƒng core dÃ¹ng Ä‘Æ°á»£c tháº­t, khÃ´ng tÃ­nh smoke test hoáº·c fallback lÃ  pass.

## 1. Success criteria báº¯t buá»™c

Chá»‰ coi hoÃ n thÃ nh khi cÃ¡c má»¥c sau pass báº±ng runtime test tháº­t:

1. API backend Ä‘ang cháº¡y tháº­t trong dáº£i port 7000-7050.
2. Web Ä‘ang cháº¡y tháº­t trong dáº£i port 7000-7050.
3. Docker PostgreSQL/pgvector vÃ  Redis cháº¡y healthy.
4. Product/catalog/knowledge Ä‘á»c tá»« PostgreSQL seeded data tháº­t.
5. Chat endpoint gá»i LLM tháº­t qua `CHAT_MODEL_BASE_URL=https://replace-with-your-vllm-gateway.example.invalid`.
6. Search/knowledge flow gá»i embedding/rerank tháº­t qua `EMBED_RERANK_BASE_URL=https://replace-with-your-embed-rerank-gateway.example.invalid`.
7. Frontend chat composer gá»­i request tháº­t vÃ  render assistant response tháº­t.
8. Add-to-cart gá»i backend tháº­t vÃ  cart UI cáº­p nháº­t tá»« response tháº­t.
9. Order confirmation gá»i backend tháº­t vá»›i idempotency key tháº­t.
10. Payment intent gá»i backend tháº­t; hiá»‡n provider lÃ  mock náº¿u chÆ°a cÃ³ provider sandbox credentials, nhÆ°ng pháº£i gá»i endpoint tháº­t vÃ  persist DB tháº­t.
11. Runtime tests kiá»ƒm tra HTML/API response tháº­t, khÃ´ng pass báº±ng mock-only hoáº·c fallback.

## 2. Skills cáº§n dÃ¹ng

- `backend-skill`: API agent/chat, service logic, DB persistence.
- `frontend-skill`: interactive customer UI, accessibility/responsive.
- `documentation-skill`: docs sau tá»«ng phase.
- `logging-skill`: logs sau tá»«ng phase.
- `push-code-skill`: chá»‰ Ã¡p dá»¥ng náº¿u thÆ° má»¥c lÃ  git repo vÃ  user xÃ¡c nháº­n push.
- `testing-skill`: hiá»‡n chÆ°a cÃ³; dÃ¹ng checklist trong plan nÃ y.

## 3. TÃ i nguyÃªn cáº§n thiáº¿t

- Docker Desktop Ä‘ang cháº¡y.
- PostgreSQL Docker: `localhost:55432`.
- Redis Docker: `localhost:56379`.
- Chat model server: `https://replace-with-your-vllm-gateway.example.invalid` model `google/gemma-4-E4B-it`.
- Embedding/rerank server: `https://replace-with-your-embed-rerank-gateway.example.invalid`.
- API port má»¥c tiÃªu: `7010`.
- Web port má»¥c tiÃªu: `7000`.

## 4. Phase A - Backend real agent/chat API

- Thá»i gian dá»± kiáº¿n: 1-2 giá».
- Skills: backend, documentation, logging.
- Implementation:
  - Táº¡o agent service/controller endpoint `POST /api/v1/chat`.
  - Endpoint nháº­n message/cartId.
  - Search products tháº­t tá»« DB.
  - Search knowledge tháº­t tá»« DB.
  - Gá»i embedding/rerank tháº­t qua ModelGateway Ä‘á»ƒ chá»n context.
  - Gá»i chat LLM tháº­t qua ModelGateway vá»›i context Ä‘Ã£ láº¥y.
  - Tráº£ structured blocks: text, product_list, cart_summary, quick_replies.
- Testing:
  - Runtime API test gá»i `/api/v1/chat` tháº­t.
  - Assert response cÃ³ assistant text tá»« model tháº­t.
  - Assert product block cÃ³ product seeded DB.
  - Assert embedding/rerank endpoint Ä‘Æ°á»£c gá»i qua model gateway path tháº­t.
- Pass criteria:
  - KhÃ´ng fallback náº¿u model/embedding server fail.
  - Test fail náº¿u LLM/embedding/rerank khÃ´ng reachable.

## 5. Phase B - Frontend interactive customer flow

- Thá»i gian dá»± kiáº¿n: 2-4 giá».
- Skills: frontend, documentation, logging.
- Implementation:
  - Chuyá»ƒn page sang interactive client components khi cáº§n.
  - Chat composer gá»i `/api/v1/chat` tháº­t.
  - Render assistant text vÃ  product cards tá»« response tháº­t.
  - Product card button gá»i add-to-cart endpoint tháº­t.
  - Cart panel Ä‘á»c/cáº­p nháº­t cart tháº­t.
  - Confirm order gá»i create order + confirm order tháº­t.
  - Payment action gá»i create payment intent tháº­t.
- Testing:
  - Runtime web test vá»›i app Ä‘ang cháº¡y tháº­t.
  - Fetch HTML/API routes tháº­t vÃ  kiá»ƒm tra page render Ä‘Ãºng.
  - Browser-like flow báº±ng Node fetch náº¿u Playwright chÆ°a cÃ i: call page, chat API, add cart, order, payment.
- Pass criteria:
  - User cÃ³ thá»ƒ chat -> xem gá»£i Ã½ -> thÃªm giá» -> xÃ¡c nháº­n Ä‘Æ¡n -> táº¡o payment intent báº±ng request tháº­t.

## 6. Phase C - Full runtime validation

- Thá»i gian dá»± kiáº¿n: 1-2 giá».
- Skills: backend, frontend, documentation, logging.
- Tests báº¯t buá»™c:
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm --filter @retail-agent/api test:runtime`
  - `corepack pnpm --filter @retail-agent/web test:runtime`
  - Runtime flow riÃªng cho chat/cart/order/payment trÃªn ports 7000/7010.
- Pass criteria:
  - 100% tests pass.
  - API/web váº«n cháº¡y sau tests.
  - KhÃ´ng report hoÃ n thÃ nh náº¿u dependency tháº­t fail.

## 7. Phase D - Documentation/logging

- Thá»i gian dá»± kiáº¿n: 30 phÃºt.
- Output:
  - `docs/implementation/phase-7-real-agent-chat.md`
  - `logs/implementation/phase-7-real-agent-chat-log.md`
  - Update frontend docs náº¿u behavior thay Ä‘á»•i.

## 8. Blocker khÃ´ng Ä‘Æ°á»£c fake

- Náº¿u chat model server hoáº·c embedding/rerank server khÃ´ng reachable, task khÃ´ng Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u hoÃ n thÃ nh 100%.
- Náº¿u muá»‘n payment provider tháº­t ngoÃ i mock, cáº§n provider sandbox credentials; náº¿u chÆ°a cÃ³, chá»‰ cÃ³ thá»ƒ pass mock payment endpoint tháº­t/persisted DB, khÃ´ng Ä‘Æ°á»£c gá»i lÃ  real external payment provider.
- Náº¿u cáº§n push, thÆ° má»¥c hiá»‡n chÆ°a lÃ  git repository nÃªn khÃ´ng thá»ƒ push cho Ä‘áº¿n khi user xÃ¡c nháº­n git workflow.
