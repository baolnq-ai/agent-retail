# Phase 15 Full Chat Pipeline Audit

- Thời gian cập nhật: 2026-05-15
- Phạm vi: toàn bộ hệ thống chat hiện tại gồm frontend chat widget, streaming, product suggestion UI, search/recommendation, LLM context, quick replies, add-to-cart, cart/order/payment interaction.

## 1. Kết luận ngắn

Pipeline chat hiện tại **chưa đủ ổn để gọi là agent bán hàng hoàn chỉnh**. Hệ thống đã có request thật tới API, LLM thật, embedding thật, rerank thật và cart/order/payment endpoint thật, nhưng tầng orchestration còn thiếu nhiều bước quyết định quan trọng:

- Search chỉ là heuristic token match đơn giản, không parse constraint tổng quát.
- Budget như `dưới 2tr`, `tầm 1tr9`, `khoảng 2 triệu` chưa được hiểu thành filter cứng.
- Rerank đang chạy sau khi candidate đã bị search heuristic quyết định, nên nếu search đưa sai candidate thì rerank không cứu được.
- LLM được giao tự diễn giải context nhưng không có schema answer/recommendation bắt buộc.
- `product_list` cho UI được chọn hậu kỳ từ text/candidate, chưa gắn với reasoning/constraint chính thức.
- Quick reply `Thêm X vào giỏ` hiện chỉ gửi text lại chat, **không tự execute add-to-cart**.
- Product suggestion carousel hiện tại dễ vỡ layout vì track nằm trong grid column nhỏ, card `min-width: 100%` cộng nav button/counter làm overflow khó kiểm soát.

## 2. Luồng frontend chat hiện tại

File chính: `apps/web/src/app/retail-client.tsx`

### 2.1 State chính

- `messages`: danh sách chat message hiển thị.
- `input`: nội dung ô nhập.
- `isChatBusy`: khóa chat khi streaming.
- `isActionBusy`: khóa cart/order/payment actions.
- `statusText`: trạng thái hiển thị trong header chat.
- `activeStep`: progress line.
- `chatMode`: `open | minimized | closed`.

### 2.2 Khi user gửi chat

`submitChat(message)`:

1. Trim message.
2. Nếu rỗng hoặc `isChatBusy` thì return.
3. Tạo user message và placeholder assistant message streaming.
4. Gọi `POST /api/v1/chat/stream`.
5. Parse NDJSON stream:
   - `status`: cập nhật status/progress.
   - `token`: append token vào assistant message.
   - `final`: thay content bằng text block, gắn products/policies/quick replies/cart.
6. `finally`: set `isChatBusy=false`.

### 2.3 Điểm yếu frontend

#### Quick replies chưa là action thật

Quick reply hiện tại:

```tsx
<button onClick={() => void submitChat(reply)}>{reply}</button>
```

Với reply `Thêm X vào giỏ`, frontend chỉ gửi câu đó về chatbot. Backend cũng không parse thành tool/action. Vì vậy user kỳ vọng “tự thêm vào giỏ” sẽ không đúng.

#### Product card add-to-cart là action thật

Button trên card gọi:

```tsx
handleAddToCart(product.id)
```

Luồng này gọi thật:

```txt
POST /api/v1/cart/:cartId/items
```

Nghĩa là hiện chỉ có **nút Thêm giỏ trên card** là add-to-cart thật, còn câu chat/quick reply “Thêm X vào giỏ” chưa phải tool call.

#### Carousel hiện tại chưa giống chat app

Hiện tại carousel:

- `.chat-product-carousel`: grid 3 cột: nav trái, slider, nav phải.
- `.chat-product-slider`: flex + transform.
- `.chat-product-card`: `min-width: 100%`.
- Counter absolute.

Vấn đề:

- Bubble assistant có `width: fit-content` và `max-width: 88%`, nên carousel tính width theo nội dung, rất dễ hẹp/vỡ.
- Slider nằm trong grid column giữa, nhưng card 100% của slider chứ không phải viewport ổn định.
- Nav buttons chiếm ngang bên trong bubble làm card bị bóp.
- Counter `bottom: -8px` có thể đè/overflow khỏi bubble.
- UX không giống Telegram/Messenger/Zalo: các app thường dùng chip/card ngang trong bubble với scroll-snap nhẹ hoặc pagination dots nhỏ, không đặt nav button lớn chen hai bên card.

## 3. Luồng backend chat hiện tại

File chính: `apps/api/src/services/agent.service.ts`

### 3.1 Endpoint

- `POST /api/v1/chat`: non-stream.
- `POST /api/v1/chat/stream`: NDJSON stream.

Controller stream:

1. Validate message.
2. Set CORS cho origin web.
3. Write từng event JSON line:
   - `status`
   - `token`
   - `final`
   - `error`

### 3.2 AgentService.prepareChat()

Luồng hiện tại:

1. Lấy `message`, `cartId`.
2. Chạy song song:
   - `catalogService.searchProducts(message)`
   - `knowledgeService.searchKnowledge(message)`
   - `commerceService.getCart(cartId)`
3. `ensureRecommendationCandidates(message, initialProducts, cart)`.
4. `buildContextDocuments(products, knowledge)`.
5. Gọi embedding thật:
   - `embed([message, ...contextDocuments])`
6. Gọi rerank thật:
   - `rerank(message, contextDocuments)`
7. Lấy top 5 reranked documents làm context cho LLM.
8. Prompt LLM bằng system + user context.

### 3.3 AgentService.chatStream()

1. Emit status “Đang phân tích nhu cầu”.
2. Prepare chat.
3. Emit status “Đang gọi LLM và stream token”.
4. Gọi OpenAI-compatible stream.
5. Emit token liên tục.
6. Clean text.
7. Emit final response blocks.

### 3.4 AgentService.buildResponse()

Hiện tại block final gồm:

- `text`
- `product_list`
- `policy_answer`
- `cart_summary`
- `quick_replies`

`product_list` được chọn bằng:

```ts
selectVisibleProducts(requestMessage, content, prepared.products)
```

Logic hiện tại:

- Nếu policy-only thì không trả product card.
- Nếu text LLM nhắc tên product thì ưu tiên product đó.
- Nếu không, fallback candidate products.
- So sánh: tối đa 3 sản phẩm.
- Tư vấn thường: tối đa 2 sản phẩm.

Điểm yếu: selection này là hậu kỳ, không phải output có cấu trúc từ planner/retriever. Nếu LLM nói sai hoặc không nhắc đúng title, UI vẫn có thể lệch.

## 4. Search/recommendation hiện tại

File: `apps/api/src/services/catalog.service.ts`

### 4.1 Cách search hiện tại

```ts
const products = await prisma.product.findMany();
const score = scoreProduct(product, normalizedQuery);
filter score > 0;
sort score desc, price asc;
```

### 4.2 scoreProduct hiện tại

- Token score: query token có trong title/brand/category/description/attributes.
- Hard-code room:
  - query chứa `25m2` và product có `25-35m2` thì +5.
- Hard-code budget:
  - query chứa `4 triệu` và price <= 4,000,000 thì +2.
- Hard-code flagship air purifier:
  - query `máy lọc` + `25m2` + title AiroClean P35 thì +8.

### 4.3 Vì sao query “dưới 2tr” có thể sai

Search hiện tại **không parse**:

- `2tr`
- `2 triệu`
- `1tr9`
- `1.9 triệu`
- `dưới`, `không quá`, `tối đa`, `khoảng`, `tầm`

Chỉ có special case `4 triệu`.

Do đó câu “sản phẩm dưới 2tr” không tạo filter `price <= 2_000_000`. Candidate có thể chỉ được chọn do token chung như `sản phẩm`, `máy`, category, description. Sau đó LLM thấy context có sản phẩm 2.230.000 hoặc 2.410.000 và tưởng đó là hợp lệ.

### 4.4 Kết quả request thật ghi nhận

Request kiểm tra:

```txt
POST /api/v1/chat
message: Tư vấn sản phẩm dưới 2 triệu
```

Một lần trả đúng sản phẩm dưới 2tr:

- AqraLife Camera View 2 — 910.000
- OralPro Massager Mini 2 — 970.000
- Windy Desk Fan 1 — 990.000

Nhưng kết quả user thấy trước đó trả sai:

- HomeSweep Mop Max 2 — 2.230.000
- PureZen Plus 2 — 2.410.000

Điều này chứng minh pipeline hiện không deterministic theo constraint. Có thể thay đổi theo DB order/context/rerank/LLM generation.

## 5. Rerank/embedding hiện tại

File: `apps/api/src/services/model-gateway.service.ts`

### 5.1 Embedding

Gọi thật:

```txt
POST EMBED_RERANK_BASE_URL/api/v1/embed
```

Input:

```ts
[message, ...contextDocuments]
```

Hiện embedding chỉ dùng để lấy diagnostics `embeddingDimensions`, chưa dùng để vector search DB.

### 5.2 Rerank

Gọi thật:

```txt
POST EMBED_RERANK_BASE_URL/api/v1/rerank
```

Input:

- query: user message
- documents: product docs + knowledge docs

Rerank chỉ rerank list đã được heuristic search đưa vào. Nếu candidate pool thiếu hoặc sai budget, rerank không có cơ chế hard constraint để loại.

## 6. Knowledge/policy hiện tại

File: `apps/api/src/services/knowledge.service.ts`

Search policy cũng token match:

- Load all knowledge docs.
- Score bằng token overlap.
- Sort score desc.

Điểm yếu:

- Không phân intent rõ giữa policy query và product query.
- `policy_answer` vẫn có thể xuất hiện trong câu hỏi product nếu token overlap.
- Quick reply có thể luôn đưa “Tóm tắt chính sách đổi trả” nếu `knowledge.length > 0`, kể cả query đang mua hàng.

## 7. Cart/order/payment hiện tại

File: `apps/api/src/services/commerce.service.ts`

### 7.1 Cart

- `getCart(cartId)` upsert cart.
- `addItem(cartId, productId, quantity)`:
  - verify product exists.
  - verify quantity/inventory.
  - upsert cart item.
  - recalculate totals.

### 7.2 Order/payment

- `createOrder(cartId, idempotencyKey)`:
  - requires non-empty cart.
  - stores idempotent response.
- `confirmOrder(orderId)`.
- `createPaymentIntent(orderId, idempotencyKey)`:
  - requires confirmed order.
  - creates mock payment URL.

### 7.3 Chat integration gap

Chat does **not** call commerce actions directly. There is no tool/action layer like:

```ts
{ action: 'add_to_cart', productId, quantity }
```

Therefore:

- User: “thêm sản phẩm đầu tiên vào giỏ”
- Current behavior: LLM trả lời/hướng dẫn hoặc quick reply text.
- Expected agent behavior: backend maps “sản phẩm đầu tiên” to recommended product, executes `addItem`, returns updated cart.

This is missing.

## 8. Các lỗi/gap chính cần sửa

### 8.1 Search constraint parsing thiếu

Cần parser cho:

- Budget:
  - `dưới 2tr`, `dưới 2 triệu`, `không quá 2 triệu`, `tầm 1tr9`, `1.900.000`, `<= 2m`.
- Category/type:
  - máy lọc, nồi chiên, robot hút bụi, đèn, camera, quạt, chăm sóc cá nhân.
- Room size:
  - `25m2`, `25 m²`, `phòng 25 mét`, `20-30m2`.
- Attribute needs:
  - êm, HEPA, tiết kiệm điện, Wi-Fi, nhỏ gọn, dung tích 5L.
- Intent:
  - recommend, compare, policy, add_to_cart, cart_status, checkout/payment.

### 8.2 Budget phải là hard filter

Nếu user nói “dưới 2tr”, candidate product **không được vượt 2.000.000** trừ khi không có sản phẩm nào và text phải nói rõ “không có sản phẩm đúng ngân sách”.

### 8.3 Rerank chỉ nên rerank sau hard filters

Đề xuất pipeline đúng:

1. Parse intent + constraints.
2. SQL/DB hard filter:
   - price <= maxBudget
   - category/type
   - inventory > 0
3. Soft scoring:
   - token/category/attributes/room.
4. Build top N candidates.
5. Rerank top N.
6. LLM chỉ nhận candidates đã pass constraint.
7. UI product_list lấy từ cùng ranked candidates, không lấy hậu kỳ từ text.

### 8.4 LLM cần output contract rõ

Hiện LLM chỉ trả free text. Nên tách:

- Planner/retriever tạo structured state.
- LLM chỉ viết câu trả lời dựa trên selected products.
- Response final blocks lấy từ selected products, không phụ thuộc LLM tự nhắc tên.

### 8.5 Add-to-cart qua chat chưa có tool/action

Cần intent `add_to_cart`:

- “thêm sản phẩm đầu tiên” -> resolve từ last recommended products trong conversation/session hoặc request context.
- “thêm AiroClean P35” -> resolve product by title/id alias.
- “thêm 2 cái” -> parse quantity.
- Execute `commerceService.addItem()`.
- Return updated cart + confirmation text.

Hiện chưa có conversation memory/session last recommendation, nên “sản phẩm đầu tiên” không thể resolve ổn định.

### 8.6 Frontend chat UI chưa chuẩn chat app

Nên redesign theo pattern chat apps:

- Assistant bubble text full width ổn định hơn: `width: min(100%, 360px)` thay vì `fit-content` khi có cards.
- Suggestions nên là horizontal chip/card rail trong bubble hoặc dưới bubble:
  - card compact cao 64-76px,
  - scroll-snap hoặc step buttons overlay nhỏ,
  - không đặt nav button chiếm grid hai bên card,
  - dots nhỏ ở dưới hoặc counter text nhỏ trong header.
- Quick replies giống Messenger/Zalo:
  - pill chips dưới assistant bubble,
  - một dòng wrap, nhỏ gọn,
  - không disable trừ khi đang gửi.
- Product card nên có:
  - title 1 dòng,
  - price rõ,
  - reason 1 dòng nếu có,
  - CTA “Thêm” nhỏ.

## 9. Pipeline đề xuất thay thế

### 9.1 Backend structured pipeline

```txt
User message
  -> Normalize Vietnamese text
  -> Intent parser
  -> Constraint parser
  -> Candidate retrieval with hard filters
  -> Soft scoring
  -> Rerank selected candidates
  -> Action resolver, if intent is actionable
  -> LLM answer generation with constrained context
  -> Response blocks from deterministic selected state
```

### 9.2 Intent types nên có

```ts
type ChatIntent =
  | 'recommend_products'
  | 'compare_products'
  | 'product_detail'
  | 'policy_question'
  | 'add_to_cart'
  | 'cart_status'
  | 'checkout'
  | 'payment'
  | 'unknown';
```

### 9.3 Constraint object nên có

```ts
interface ProductConstraints {
  maxPrice?: number;
  minPrice?: number;
  categories?: string[];
  roomSizeM2?: number;
  attributes?: string[];
  brands?: string[];
  sort?: 'price_asc' | 'relevance' | 'rating';
}
```

### 9.4 Candidate object nên có

```ts
interface ProductCandidate {
  product: Product;
  hardMatch: boolean;
  score: number;
  reasons: string[];
}
```

### 9.5 Response blocks nên bổ sung metadata

Hiện `product_list` chỉ có products. Nên đổi thành:

```ts
{
  type: 'product_list',
  version: 2,
  items: Array<{
    product: Product,
    reason: string,
    matches: string[]
  }>
}
```

Frontend khi đó hiển thị reason đúng, không đoán.

## 10. Test cần thêm

### 10.1 Runtime backend chat constraints

Các case bắt buộc fail nếu sai:

- “sản phẩm dưới 2tr” -> every product.price <= 2_000_000.
- “máy lọc dưới 2tr” -> if no air purifier <= 2tr, answer must say no exact match; product_list empty or nearest alternatives clearly labelled.
- “máy lọc phòng 25m2 dưới 4 triệu” -> product_list includes only products <= 4_000_000 and relevant room size.
- “so sánh A và B” -> product_list exactly A/B if both exist.
- “chính sách hoàn tiền” -> no unrelated product cards.

### 10.2 Runtime action tests

- Ask recommend -> get product list.
- Ask “thêm sản phẩm đầu tiên vào giỏ” -> cart item count increases.
- Ask “giỏ hàng có gì” -> response uses real cart.
- Ask checkout/payment -> enforce order/payment flow.

### 10.3 Frontend interaction tests

- Chat input button clickable when idle.
- Quick reply click sends request.
- Product card “Thêm” calls cart endpoint.
- Carousel does not overflow chat bubble at desktop/mobile widths.

## 11. Ưu tiên sửa tiếp theo

### P0 - correctness

1. Implement query intent + constraint parser.
2. Make budget/category/room hard filters before rerank.
3. Make product_list deterministic from selected candidates.
4. Add runtime tests for budget constraints.
5. Add chat action intent `add_to_cart` and session/last recommendation resolution.

### P1 - UX

1. Redesign product suggestions as chat-app style compact rail.
2. Remove grid nav buttons around card.
3. Add stable bubble width when message has product suggestions.
4. Add product reason line.
5. Improve quick reply chips.

### P2 - quality

1. Structured LLM prompt/JSON plan or server-side answer template for recommendations.
2. Use embeddings for real vector retrieval, not diagnostics only.
3. Add conversation state for last recommended products.
4. Add observability logs for parsed intent/constraints/candidates/rerank/final products.

## 12. Tóm tắt nguyên nhân câu trả lời sai dưới 2tr

Câu trả lời sai kiểu “dưới 2tr nhưng gợi ý 2.230.000/2.410.000” không phải chỉ do LLM. Nguyên nhân gốc là pipeline:

1. Không parse `dưới 2tr` thành `maxPrice=2_000_000`.
2. Không hard-filter price trước khi tạo context.
3. Rerank vẫn có thể đưa sản phẩm vượt ngân sách vào top context.
4. LLM tin context đó và viết câu trả lời sai.
5. UI product cards lấy từ candidate/text hậu kỳ nên cũng có thể lệch.

Cần sửa ở retrieval/orchestration trước, không chỉ prompt hoặc UI.
