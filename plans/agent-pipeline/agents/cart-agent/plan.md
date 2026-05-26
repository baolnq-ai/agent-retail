# Plan: Cart Agent

- Created: 2026-05-21 14:18
- Updated: 2026-05-22 10:45
- Status: in_progress
- Related log: `logs/log-plan-agent-pipeline/cart-agent.md`
- Mirror log: `logs/planning/agent-pipeline/agents/cart-agent.md`
- Related doc: `docs/agent-pipeline/agents/cart-agent/design.md`
- Related tests: `test/agent-pipeline/agents/cart-agent/cases.md`, `test/agent-pipeline/agents/cart-agent/real-request-100-cases.md`
- Job status: `plans/agent-pipeline/agents/cart-agent/status.md`
- Job checklist: `plans/agent-pipeline/agents/cart-agent/checklist.md`

## Goal

Thiết kế và code lại Cart Agent thành hệ thống production xử lý 100% vấn đề giỏ hàng: xem, thêm, xóa, cập nhật, clear, xác nhận pending cart action, đọc lịch sử giỏ hàng và phối hợp với agent khác qua contract rõ. Cart Agent không xử lý trả hàng, lỗi sản phẩm, complaint hay bảo hành; các việc đó thuộc Customer Support Agent.

Cart Agent không chỉ là CRUD tool. Nó là **Cart SQL RAG Agent**: domain agent hiểu giỏ hàng, nhận mục tiêu từ Lead/Executor bằng ngôn ngữ/intent giàu ngữ cảnh, tự chia sub-task nội bộ, tự truy xuất dữ liệu giỏ hàng bằng SQL/Prisma tool riêng, tự retrieve cart history/memory, tự đánh giá lỗi/kết quả rỗng và hợp nhất response giàu ngữ cảnh để agent khác đọc hiểu.

## Scope

- In:
  - cart CRUD;
  - cart query/inspection như có sản phẩm nào chưa, số lượng bao nhiêu, tổng tiền hiện tại, item nào mới thêm/xóa;
  - cart state verification;
  - cart action history riêng;
  - agent interaction history riêng giữa Cart Agent và Lead/agent khác;
  - near/mid/far cart memory;
  - pending confirmation;
  - idempotency cho mọi write tool;
  - transaction/concurrency control;
  - SQL RAG goal/response contract cho agent khác gọi;
  - DB rule và migration plan;
  - tests cho cart state, history, idempotency, permission, trace.
  - bộ 100 realistic real-request evaluation cases cho Cart SQL RAG Agent và yêu cầu tinh chỉnh tới khi pass 100%.
- Out:
  - return/refund/complaint/warranty;
  - payment và order confirmation ngoài boundary cart;
  - product search chuyên sâu, chỉ nhận target đã resolve hoặc yêu cầu Search Agent resolve.

## Skills

- plan-skill
- backend-skill
- documentation-skill
- logging-skill
- testing-skill
- security-skill

## Current DB Assessment

### Current Prisma schema readout

Schema hiện tại trong `apps/api/prisma/schema.prisma` có các model liên quan trực tiếp:

| Model | Đang có | Đánh giá cho Cart Agent |
| --- | --- | --- |
| `User` | user account, session, cart, chat, preference, interaction relations | dùng làm owner scope chính |
| `UserSession` | session token hash + expiry | không expose cho Cart Agent |
| `Product` | title, brand, category, price, inventory, attributes, description | đủ cho cart write guard cơ bản, nhưng resolve sản phẩm mơ hồ vẫn thuộc Search Agent |
| `Cart` | active state, `version`, `status`, `subtotal`, `grandTotal` | đủ current snapshot, thiếu event/history/active-cart uniqueness mạnh |
| `CartItem` | `cartId`, `productId`, `quantity`, price snapshot, line total | đủ current item, thiếu soft history item đã xóa |
| `Order` | cartId, status, total, items JSON | đủ checkout snapshot tạm thời, chưa tối ưu query purchase history theo user |
| `PaymentIntent` | order payment state | ngoài boundary Cart Agent |
| `IdempotencyKey` | scope/key/responseJson | dùng lại được cho cart write nhưng cần scope + expiry/cleanup rõ |
| `ChatThread`, `ChatMessage` | chat history chung | không đủ làm private Cart Agent history |
| `UserPreference` | key/value memory chung, pending cart plan hiện đang ké ở đây | phải tách pending cart action riêng |
| `UserInteractionEvent` | event hành vi user/product chung | hữu ích cho recommendation, không thay thế `CartEvent` |

Runtime hiện tại trong `CommerceService` có add/update/remove/clear và recalculate cart totals, nhưng write + recalculate chưa được khóa bằng transaction/event ledger/idempotency cho cart CRUD. `CartManagerAgentService` hiện chỉ map từ analysis sang tool CRUD, chưa phải SQL RAG Agent: chưa tự retrieve schema, chưa có private interaction history, chưa có private planner/evaluator đúng nghĩa.

Cart Agent production không nên tiếp tục dựa vào `ChatMessage`/`UserPreference.pending_cart_plan` để hiểu giỏ hàng. Cần thêm cart-owned ledger và memory để trả lời chính xác các câu như:

- "sản phẩm vừa xóa là gì?";
- "hồi nãy thêm món nào không thành công?";
- "giỏ có sản phẩm A chưa và tổng bao nhiêu?";
- "cart action này retry có bị add trùng không?";
- "agent nào đã yêu cầu clear giỏ và user đã confirm chưa?".

Hiện DB có nền cơ bản:

- `Cart`: current state, `userId`, `version`, `status`, totals.
- `CartItem`: item hiện tại, unique theo `cartId + productId`.
- `Order`, `PaymentIntent`: order/payment mock.
- `IdempotencyKey`: mới dùng cho order/payment, chưa dùng cho cart CRUD.
- `ChatThread`, `ChatMessage`, `UserPreference`, `UserInteractionEvent`: memory chung.

Thiếu cho Cart Agent production:

- chưa có `CartEvent` để biết sản phẩm nào bị thêm/xóa/cập nhật lúc nào;
- chưa có cart action audit theo `requestId`, `actor`, `agent`, `toolName`;
- chưa có idempotency cho `cart.add_item`, `cart.remove_item`, `cart.update_item`, `cart.clear`;
- chưa có memory riêng của Cart Agent theo gần/mid/xa;
- chưa có lịch sử riêng của Cart Agent về các lần nhận goal từ Lead, sub-plan đã chạy, tool result và response đã trả;
- chưa có pending cart action table riêng, hiện đang ké `UserPreference.pending_cart_plan`;
- chưa có optimistic concurrency rõ ở tool input như `expectedCartVersion`;
- chưa có soft history cho item đã xóa;
- `Order.items` đang là JSON snapshot, dùng được nhưng cần link event/order để Cart Agent biết cart đã checkout.

## Recommended Production Pipeline

Pipeline mạnh và chuẩn nhất cho Cart Agent là **SQL RAG agent goal protocol + internal planner + private SQL/tool graph + event-sourced cart ledger**.

```txt
Cart goal from Lead/Executor
  -> cart_security_guard
  -> cart_schema_retriever
      -> load allowed cart schema/contracts/tool descriptions
  -> cart_context_loader
      -> load current cart
      -> load near events
      -> load mid summary
      -> load far profile/history
  -> cart_internal_planner
      -> understand goal
      -> split private sub-tasks
      -> choose allowed SQL/cart tools
  -> sql_query_guard
      -> parameterized query only
      -> no arbitrary raw SQL from LLM
      -> user/cart scope enforced
  -> cart_retriever
      -> execute read/write tool
      -> collect cart rows, events, memory
  -> result_grounder
      -> convert rows into facts with evidence
  -> target_resolver_gate
      -> if target missing: return needs_product_resolution
      -> if target may be found in cart only: query cart item names first
  -> cart_policy_gate
      -> auth, stock, quantity, destructive action, expected version
  -> cart_plan_builder
  -> confirmation_gate
      -> if risky/multi-item/clear: create pending action
  -> cart_tool_executor
      -> transaction
      -> write cart item
      -> write CartEvent
      -> write idempotency response
  -> cart_verifier
      -> reload cart
      -> verify version/totals/items/events
  -> cart_memory_writer
      -> update near/mid/far memory
  -> cart_agent_response
      -> structured facts + natural handoff for Lead Agent
```

## SQL RAG Definition

Cart Agent là SQL RAG agent theo nghĩa:

- **SQL**: dùng tool truy vấn dữ liệu có cấu trúc từ `Cart`, `CartItem`, `Product`, `CartEvent`, `CartAgentMemory`, `PendingCartAction`.
- **RAG**: retrieve dữ liệu liên quan từ cart state, cart event, cart memory và interaction history riêng của Cart Agent; ground thành facts/evidence, rồi synthesize response cho Lead Agent.
- **Agent**: tự hiểu goal, tự lập private sub-plan, tự chọn tool, tự kiểm lỗi và tự hợp nhất kết quả.

Không được hiểu SQL RAG là cho LLM tự sinh raw SQL chạy thẳng vào database. Production rule là dùng allowlist query/repository tools, parameterized input, scope theo `userId/cartId`, timeout và trace đầy đủ.

## Agent-To-Agent Goal Protocol

Lead Agent không gọi Cart Agent bằng yes/no cứng và cũng không cần truyền task cứng kiểu web API. Lead Agent gửi mục tiêu bằng ngôn ngữ/intent, ví dụ: “Tôi cần bạn kiểm tra trong giỏ có sản phẩm A chưa và tổng tiền hiện tại là bao nhiêu”.

Cart SQL RAG Agent tự:

1. hiểu mục tiêu;
2. chia sub-task nội bộ;
3. retrieve schema/tool context được phép;
4. chọn SQL/cart tool phù hợp;
5. chạy tool với parameterized input;
6. đánh giá từng kết quả: ok, lỗi SQL, không có kết quả, target mơ hồ, hết hàng;
7. ground rows thành facts/evidence;
8. hợp nhất facts/issues;
9. trả response cho Lead Agent.

Ví dụ user hỏi:

```txt
Giỏ hàng có sản phẩm A chưa và tổng tiền bao nhiêu rồi?
```

Lead/Analysis chỉ cần gửi goal:

```txt
Tôi cần bạn kiểm tra giỏ hàng: có sản phẩm A chưa, nếu có thì số lượng/thành tiền; đồng thời cho biết tổng tiền hiện tại.
```

Cart Agent tự lập private sub-plan:

```ts
{
  privatePlan: [
    { step: 'retrieve_allowed_schema', tool: 'cart.rag.get_schema_context' },
    { step: 'load_current_cart', tool: 'cart.sql.get_active_cart' },
    { step: 'calculate_totals', tool: 'cart.sql.get_cart_totals' },
    { step: 'find_item_by_name_or_id', tool: 'cart.sql.find_cart_item' },
    { step: 'evaluate_results', tool: 'cart.logic.evaluate_query_results' },
    { step: 'compose_agent_response', tool: 'cart.logic.compose_handoff' }
  ]
}
```

Cart Agent trả:

```ts
{
  status: 'completed',
  facts: [
    { type: 'item_found', productId: 'prod_a', productName: 'Sản phẩm A', quantity: 2, lineTotal: 4000000 },
    { type: 'cart_total', subtotal: 10000000, grandTotal: 10000000, currency: 'VND' }
  ],
  issues: [],
  agentMessage: 'Trong giỏ có Sản phẩm A số lượng 2, thành tiền 4.000.000 VND. Tổng giỏ hàng hiện tại là 10.000.000 VND.',
  leadInstruction: 'Đủ thông tin để trả lời user. Không cần gọi thêm agent trừ khi user muốn thanh toán hoặc tư vấn thêm.'
}
```

Nếu sản phẩm hết hàng khi thêm:

```ts
{
  status: 'rejected',
  facts: [{ type: 'stock_status', productId: 'prod_a', inventory: 0 }],
  issues: [{ code: 'out_of_stock', message: 'Sản phẩm A hiện đã hết hàng.' }],
  agentMessage: 'Không thể thêm Sản phẩm A vì sản phẩm đang hết hàng.',
  leadInstruction: 'Báo user sản phẩm hết hàng và cân nhắc gọi Recommendation/Search Agent để tìm sản phẩm thay thế.'
}
```

Nếu tên không tìm thấy hoặc target chưa rõ:

```ts
{
  status: 'needs_product_resolution',
  facts: [],
  issues: [{ code: 'product_not_resolved', message: 'Cart Agent chưa xác định được sản phẩm A trong catalog hoặc trong giỏ.' }],
  agentMessage: 'Mình chưa xác định được sản phẩm cần kiểm tra trong giỏ.',
  leadInstruction: 'Gọi Search/Product Agent để resolve productRef, sau đó gọi lại Cart Agent.'
}
```

Nếu SQL/tool lỗi:

```ts
{
  status: 'failed',
  facts: [],
  issues: [{ code: 'cart_query_failed', message: 'Không đọc được dữ liệu giỏ hàng do lỗi truy vấn.', recoverable: true }],
  agentMessage: 'Cart Agent chưa đọc được giỏ hàng vì tool truy vấn gặp lỗi.',
  leadInstruction: 'Không trả lời chắc chắn về giỏ hàng. Báo user thử lại hoặc chuyển sang trạng thái lỗi hệ thống.'
}
```

## Performance And Accuracy Review

Pipeline này đủ mạnh cho production nếu thêm rule **fast path** để tránh trì trệ. Cart Agent không được kéo mọi request qua LLM, RAG hoặc summary. Các thao tác rõ ràng phải chạy bằng code deterministic.

### Fast path

Dùng khi request đã có `userId`, `cartId`, `operation`, `productId`, `quantity` rõ:

```txt
validate input
  -> idempotency lookup
  -> load cart row + item row
  -> stock/version guard
  -> transaction mutate cart
  -> write CartEvent
  -> verify totals/version
  -> return CartAgentResult
```

Không gọi LLM, không đọc far memory, không summarize trong request path.

### Smart path

Dùng khi user nói mơ hồ như “xóa cái vừa thêm”, “thêm cái đó”, “mua lại món hay mua”:

```txt
load near cart events
  -> nếu resolve được target thì quay về fast path
  -> nếu chưa đủ thì trả needs_product_resolution cho Search Agent
```

### Slow path

Dùng nền/background, không chặn response chính:

```txt
CartEvent dài quá ngưỡng
  -> summarize near into mid memory
  -> update far behavior signals
```

### Latency target

| Flow | Target |
| --- | --- |
| `cart.get_state` | p95 < 100ms |
| Add/remove/update rõ target | p95 < 250ms |
| Pending confirm/clear | p95 < 350ms |
| Resolve từ near history | p95 < 400ms |
| Summary near->mid/far | async/background, không chặn chat |

### Accuracy rules

- Không mutate cart nếu target product chưa rõ.
- Không mutate cart nếu user chưa auth.
- Không claim success nếu verifier chưa reload cart và pass.
- Mọi write tool phải có idempotency key.
- Mọi write tool phải ghi `CartEvent` trong cùng transaction với cart mutation.
- `expectedCartVersion` được dùng để phát hiện stale/concurrent update.
- LLM chỉ hỗ trợ hiểu câu mơ hồ hoặc tóm tắt; LLM không được tự quyết định write tool.

## Simple Logic

Cart Agent nhận vào:

- user/cart identity: `userId`, `cartId`, `requestId`;
- lệnh giỏ hàng: xem, thêm, xóa, sửa số lượng, clear, confirm/cancel pending;
- target đã resolve nếu có: `productId`, `quantity`, `expectedCartVersion`;
- ngữ cảnh tùy chọn: message gốc, near history key, idempotency key.

Cart Agent làm:

1. Kiểm tra auth, schema, quyền và idempotency.
2. Đọc cart hiện tại và một phần history cần thiết.
3. Nếu target mơ hồ, trả `needs_product_resolution` thay vì đoán.
4. Nếu action rủi ro như clear hoặc multi-item, tạo pending confirmation.
5. Nếu action rõ và an toàn, execute bằng transaction.
6. Ghi `CartEvent` để có lịch sử chuẩn.
7. Reload cart để verify kết quả.
8. Cập nhật near/mid/far cart memory đúng ngưỡng.
9. Trả `CartAgentResult` cho Lead/Executor, không tự viết câu trả lời cuối.

Cart Agent trả ra:

- status: `completed`, `needs_auth`, `needs_product_resolution`, `needs_confirmation`, `conflict`, `rejected`, `failed`;
- cart snapshot sau cùng;
- danh sách operation đã chạy;
- event summary;
- memory signals;
- handoff gồm câu an toàn cho user và claim nào được phép/không được phép nói.

## Framework Decision For Cart Agent

- Dùng LangGraph JS nếu spike framework tổng pass, vì Cart Agent là graph stateful có guard, checkpoint, streaming trace và human confirmation.
- Nếu LangGraph quá nặng hoặc không hợp NestJS gateway hiện tại, code custom `CartAgentStateMachine` với cùng contract.
- Không dùng ReAct auto-loop cho cart CRUD. LLM chỉ được dùng ở bước hiểu ngôn ngữ/summary nếu cần; write tool phải deterministic.

## DB Changes Needed

### Required tables

```txt
CartEvent
  id
  cartId
  userId
  requestId
  idempotencyKey
  type: add | remove | set_quantity | increment | decrement | clear | checkout | pending_created | pending_confirmed | pending_cancelled
  productId?
  quantityBefore?
  quantityAfter?
  cartVersionBefore
  cartVersionAfter
  subtotalBefore
  subtotalAfter
  actorType: user | agent | system
  actorAgent?
  toolName
  sourceMessage?
  metadata Json?
  createdAt

CartAgentMemory
  id
  userId
  cartId?
  tier: near | mid | far
  key
  value Json
  summary?
  tokenEstimate
  eventCount
  lastEventAt
  expiresAt?
  createdAt
  updatedAt

CartAgentInteraction
  id
  userId
  cartId?
  requestId
  leadGoal
  normalizedGoal
  privatePlan Json
  toolResultsSummary Json
  facts Json
  issues Json
  agentMessage
  leadInstruction
  status
  createdAt
  summarizedAt?

PendingCartAction
  id
  userId
  cartId
  requestId
  status: pending | confirmed | cancelled | expired
  operations Json
  reason
  confirmationText
  expiresAt
  createdAt
  updatedAt
```

### Prisma migration detail

Các model cần thêm trong migration đầu tiên:

```prisma
model CartEvent {
  id                String   @id
  cartId            String
  userId            String?
  requestId         String
  idempotencyKey    String?
  type              String
  productId         String?
  quantityBefore    Int?
  quantityAfter     Int?
  cartVersionBefore Int
  cartVersionAfter  Int
  subtotalBefore    Int
  subtotalAfter     Int
  actorType         String
  actorAgent        String?
  toolName          String
  sourceMessage     String?
  metadata          Json?
  createdAt         DateTime @default(now())

  @@index([cartId, createdAt])
  @@index([userId, createdAt])
  @@index([requestId])
  @@index([idempotencyKey])
  @@index([productId])
}

model CartAgentMemory {
  id            String    @id
  userId        String
  cartId        String?
  tier          String
  key           String
  value         Json
  summary       String?
  tokenEstimate Int       @default(0)
  eventCount    Int       @default(0)
  lastEventAt   DateTime?
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, cartId, tier, key])
  @@index([userId, tier, updatedAt])
  @@index([cartId, tier, updatedAt])
}

model CartAgentInteraction {
  id                 String    @id
  userId             String
  cartId             String?
  requestId          String
  leadGoal           String
  normalizedGoal     String
  privatePlan        Json
  toolResultsSummary Json
  facts              Json
  issues             Json
  agentMessage       String
  leadInstruction    String
  status             String
  createdAt          DateTime  @default(now())
  summarizedAt       DateTime?

  @@index([userId, createdAt])
  @@index([cartId, createdAt])
  @@index([requestId])
  @@index([status])
}

model PendingCartAction {
  id               String   @id
  userId           String
  cartId           String
  requestId        String
  status           String
  operations       Json
  reason           String
  confirmationText String
  expiresAt        DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([userId, status, expiresAt])
  @@index([cartId, status])
  @@index([requestId])
}
```

Ghi chú production:

- Nếu DB là PostgreSQL, thêm raw migration partial unique index cho active cart: `unique(userId) where status = 'active' and userId is not null`. Prisma schema portable không biểu diễn partial index tốt, nên ghi rõ trong migration SQL.
- `CartAgentMemory @@unique([userId, cartId, tier, key])` cần test kỹ vì `cartId` nullable có behavior khác nhau theo database. Nếu dùng PostgreSQL và muốn uniqueness cả khi `cartId is null`, thêm `scopeKey` hoặc raw expression index.
- `IdempotencyKey` có thể tái sử dụng với scope `cart:add`, `cart:remove`, `cart:set_quantity`, `cart:clear`, `cart:pending`. Nên thêm cleanup job/TTL hoặc cột `expiresAt` ở migration sau nếu key tăng nhanh.
- `Order` có thể thêm `userId` P1 để query lịch sử mua hàng nhanh hơn, nhưng không block Cart Agent phase đầu vì có thể đi qua `Cart -> Order`.

### Recommended indexes

- `CartEvent(cartId, createdAt)`
- `CartEvent(userId, createdAt)`
- `CartEvent(requestId)`
- `CartEvent(idempotencyKey)`
- `CartEvent(productId)`
- `CartAgentMemory(userId, tier, updatedAt)`
- `CartAgentMemory(cartId, tier, updatedAt)`
- `CartAgentInteraction(userId, createdAt)`
- `CartAgentInteraction(cartId, createdAt)`
- `CartAgentInteraction(requestId)`
- `PendingCartAction(userId, status, expiresAt)`
- `PendingCartAction(cartId, status)`

## Cart Memory Tiers

| Tier | Dữ liệu | Mục đích | Retention |
| --- | --- | --- | --- |
| Near | current cart, pending action, 10-20 event gần nhất | hiểu thao tác vừa xảy ra | short-lived/request |
| Mid | summary theo cart session, sản phẩm đã thêm/xóa/cập nhật gần đây | hiểu ngữ cảnh trong phiên mua hàng | theo active cart/session |
| Far | thói quen cart lâu dài: hay bỏ gì, hay mua gì, category/brand/price pattern | hỗ trợ recommendation/search agent | theo user profile |

Khi event quá dài:

```txt
near events > threshold
  -> summarize into mid memory
  -> keep raw CartEvent as audit
  -> update far profile nếu behavior đủ ổn định
```

## Cart Agent Private History

Cart Agent có lịch sử riêng ngoài `CartEvent`.

`CartEvent` trả lời câu hỏi: **giỏ hàng đã thay đổi gì?**

`CartAgentInteraction` trả lời câu hỏi: **Cart Agent đã được hỏi gì, đã gọi tool nào, đã kết luận gì, đã báo gì cho Lead?**

Khi user/Lead nhắc:

- “lúc nãy bạn nói giỏ có gì?”
- “sản phẩm vừa kiểm tra còn không?”
- “cái vừa xóa là cái nào?”
- “sao hồi nãy không thêm được?”

Cart Agent sẽ retrieve `CartAgentInteraction` gần nhất kết hợp `CartEvent` để hiểu ngữ cảnh. Nếu interaction history dài, nó được summarize vào `CartAgentMemory` tier mid/far.

## Cart Agent Private Tools

Các tool này là tool riêng của Cart Agent. Lead Agent không gọi trực tiếp, chỉ Cart Agent planner được dùng.

| Tool | Mục đích | Write? |
| --- | --- | --- |
| `cart.rag.get_schema_context` | Lấy schema/tool docs được phép cho Cart Agent | no |
| `cart.rag.retrieve_cart_context` | Retrieve cart state + event + memory liên quan goal | no |
| `cart.rag.retrieve_interaction_history` | Retrieve lịch sử riêng của Cart Agent theo goal gần/mid/xa | no |
| `cart.rag.ground_rows_to_facts` | Biến rows/tool results thành facts có evidence | no |
| `cart.sql.get_active_cart` | Lấy active cart của user/cartId | no |
| `cart.sql.get_cart_items` | Lấy toàn bộ item trong giỏ kèm product snapshot cần thiết | no |
| `cart.sql.get_cart_totals` | Tính subtotal/grandTotal/item count từ DB | no |
| `cart.sql.find_cart_item` | Tìm item theo productId/name/alias trong giỏ | no |
| `cart.sql.get_cart_events` | Lấy near history add/remove/update | no |
| `cart.sql.get_agent_interactions` | Lấy interaction history riêng của Cart Agent | no |
| `cart.logic.plan_from_goal` | Chia goal thành private sub-plan | no |
| `cart.logic.evaluate_query_results` | Phân biệt SQL lỗi, không có kết quả, target mơ hồ, ok | no |
| `cart.logic.compose_handoff` | Hợp nhất facts/issues thành agent response | no |
| `cart.write.add_item` | Thêm sản phẩm đã resolve vào giỏ | yes |
| `cart.write.set_quantity` | Set số lượng | yes |
| `cart.write.increment_item` | Tăng số lượng | yes |
| `cart.write.decrement_item` | Giảm số lượng | yes |
| `cart.write.remove_item` | Xóa sản phẩm khỏi giỏ | yes |
| `cart.write.clear` | Xóa toàn bộ giỏ | yes |
| `cart.write.create_pending_action` | Tạo pending action cần xác nhận | yes |
| `cart.write.confirm_pending_action` | Xác nhận và execute pending action | yes |
| `cart.write.cancel_pending_action` | Hủy pending action | yes |

### Complete tool inventory

Lead Agent chỉ thấy **1 public interface**:

| Public interface | Purpose |
| --- | --- |
| `cart.agent.run_goal` | Nhận goal/ngữ cảnh từ Lead, chạy Cart SQL RAG Agent, trả `CartAgentResult` có facts/issues/handoff |

Cart Agent có **36 private tools** nội bộ. Tổng bề mặt thiết kế là **1 public interface + 36 private tools**.

#### RAG/schema/context tools: 6

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 1 | `cart.rag.get_schema_context` | Lấy schema, field, relation và rule DB được phép dùng | no |
| 2 | `cart.rag.retrieve_cart_context` | Load current cart, items, pending action, near events liên quan goal | no |
| 3 | `cart.rag.retrieve_interaction_history` | Load private Cart Agent interaction history khi goal nhắc "lúc nãy", "vừa rồi" | no |
| 4 | `cart.rag.retrieve_memory` | Load near/mid/far cart memory theo user/cart | no |
| 5 | `cart.rag.ground_rows_to_facts` | Convert DB rows/tool results thành facts có evidence | no |
| 6 | `cart.rag.compose_agent_response` | Compose structured facts/issues/agentMessage/leadInstruction | no |

#### SQL read tools: 8

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 7 | `cart.sql.get_active_cart` | Lấy active cart theo `userId`/`cartId` | no |
| 8 | `cart.sql.get_cart_items` | Lấy toàn bộ item và product snapshot cần thiết | no |
| 9 | `cart.sql.get_cart_totals` | Tính subtotal/grandTotal/itemCount từ DB | no |
| 10 | `cart.sql.find_cart_item` | Tìm item theo `productId`, title/brand/category alias trong cart | no |
| 11 | `cart.sql.get_cart_events` | Lấy ledger add/remove/update/clear gần đây | no |
| 12 | `cart.sql.get_agent_interactions` | Lấy các lần Cart Agent đã nhận goal, tool summary, kết luận | no |
| 13 | `cart.sql.get_pending_action` | Lấy pending cart action còn hạn | no |
| 14 | `cart.sql.get_cart_memory` | Lấy memory rows theo tier/key | no |

#### Logic/planner/evaluator tools: 7

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 15 | `cart.logic.plan_from_goal` | Parse structured response của LLM hoặc rule parser thành private plan | no |
| 16 | `cart.logic.validate_private_plan` | Chặn tool lạ, thiếu input, write thiếu idempotency/version rule | no |
| 17 | `cart.logic.evaluate_query_results` | Phân biệt ok, empty, SQL error, conflict, out of stock | no |
| 18 | `cart.logic.resolve_cart_reference` | Resolve "món vừa thêm", "cái đó", "sản phẩm A trong giỏ" từ cart context | no |
| 19 | `cart.logic.decide_confirmation` | Quyết định cần pending confirmation hay được chạy ngay | no |
| 20 | `cart.logic.build_allowed_claims` | Xác định claim nào Lead được phép nói với user | no |
| 21 | `cart.logic.redact_trace_payload` | Ẩn thông tin nhạy cảm trước khi log/trace | no |

#### Write tools: 9

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 22 | `cart.write.add_item` | Thêm sản phẩm đã resolve vào cart | yes |
| 23 | `cart.write.set_quantity` | Set số lượng tuyệt đối, `0` tương đương remove | yes |
| 24 | `cart.write.increment_item` | Tăng số lượng theo delta | yes |
| 25 | `cart.write.decrement_item` | Giảm số lượng theo delta | yes |
| 26 | `cart.write.remove_item` | Xóa một sản phẩm khỏi cart | yes |
| 27 | `cart.write.clear` | Xóa toàn bộ cart, luôn cần confirmation nếu có item | yes |
| 28 | `cart.write.create_pending_action` | Tạo pending confirmation cho action rủi ro/mơ hồ/multi-item | yes |
| 29 | `cart.write.confirm_pending_action` | Confirm và execute pending action còn hạn | yes |
| 30 | `cart.write.cancel_pending_action` | Hủy pending action | yes |

#### Audit/memory/trace tools: 6

| # | Tool | Purpose | Write? |
| --- | --- | --- | --- |
| 31 | `cart.audit.write_event` | Ghi `CartEvent` trong transaction hoặc ngay sau read-only decision quan trọng | yes |
| 32 | `cart.audit.write_interaction` | Ghi `CartAgentInteraction` cho mỗi goal từ Lead | yes |
| 33 | `cart.memory.write_near` | Ghi near memory ngắn hạn khi cần | yes |
| 34 | `cart.memory.summarize_mid` | Tóm tắt near events/interactions thành mid memory | yes |
| 35 | `cart.memory.update_far` | Cập nhật far behavior signal ổn định | yes |
| 36 | `cart.trace.emit` | Ghi trace node/tool với payload đã redact | yes |

Rule bắt buộc: private tools không được expose trực tiếp qua frontend hoặc Lead. Lead chỉ gọi `cart.agent.run_goal`; Cart Agent tự quyết định tool nội bộ, validate plan, chạy tool allowlist, verify, rồi mới trả result.

### LLM response-only decision

Chốt theo hướng production: **không dùng toolcall từ LLM/vLLM cho Cart Agent**.

- LLM chỉ trả structured response/private plan theo schema do backend ép.
- Backend parse JSON, validate bằng Zod/class-validator, chặn output không đúng schema.
- Backend deterministic executor tự gọi private tools theo allowlist.
- Tool lạ, raw SQL, action thiếu `userId/cartId`, write thiếu `idempotencyKey`, hoặc plan vượt quyền đều bị reject.
- Cart write/SQL path không phụ thuộc vào `tool_choice`, parser toolcall, hoặc khả năng function calling của model.
- vLLM server không cần bật `--enable-auto-tool-choice` cho Cart Agent. Nếu sau này thử nghiệm toolcall ở agent khác, phải tách riêng và không cấp DB/write tools thật.

Flow đúng:

```txt
Lead goal
  -> Cart Agent prompt asks LLM for structured analysis/plan only
  -> parse + validate response schema
  -> backend allowlist executor runs tools
  -> verifier reloads DB state
  -> backend composes CartAgentResult
```

## SQL Safety Rules

- Không chạy raw SQL do LLM sinh trực tiếp.
- Mọi query đi qua repository/Prisma hoặc SQL template allowlist.
- Query phải scope theo `userId` và `cartId`.
- Chỉ select các cột cần thiết; không trả password/session/token/secret.
- Read tool có timeout ngắn và retry an toàn.
- Write tool phải có idempotency key và transaction.
- Mọi SQL/tool result phải có trace summary, không log dữ liệu nhạy cảm.
- Nếu SQL lỗi hoặc timeout, Cart Agent trả issue `cart_query_failed`, không đoán.

## Internal Result Evaluation

Cart Agent phải tự đánh giá từng tool result trước khi trả Lead:

| Tool result | Cart Agent hiểu là | Response |
| --- | --- | --- |
| SQL success + item found | Có sản phẩm trong giỏ | fact `item_found` |
| SQL success + empty rows | Không có sản phẩm trong giỏ hoặc target không match | issue `product_not_in_cart` hoặc `product_not_resolved` |
| SQL error/timeout | Không đủ dữ liệu để kết luận | issue `cart_query_failed` |
| Product inventory 0 khi add | Không thể thêm vì hết hàng | issue `out_of_stock` |
| Product not found từ Product/Search handoff | Chưa có target hợp lệ | issue `product_not_resolved` |
| Stale cart version | Có xung đột trạng thái | issue `cart_conflict` |
| Write success nhưng verify fail | Không được claim success | issue `verification_failed` |

## Cart Agent Tool Contract

| Tool | Side effect | Requires auth | Idempotency | Notes |
| --- | --- | --- | --- | --- |
| `cart.get_state` | no | yes | no | đọc current cart + totals |
| `cart.get_history` | no | yes | no | đọc near/mid/far cart history |
| `cart.plan_action` | no | yes | no | tạo plan từ target đã resolve |
| `cart.create_pending_action` | write | yes | yes | dùng cho clear/multi-item/risky |
| `cart.confirm_pending_action` | write | yes | yes | execute pending action còn hạn |
| `cart.cancel_pending_action` | write | yes | yes | hủy pending action |
| `cart.add_item` | write | yes | yes | cần productId, quantity, expectedCartVersion? |
| `cart.set_quantity` | write | yes | yes | quantity 0 tương đương remove |
| `cart.increment_item` | write | yes | yes | delta > 0 |
| `cart.decrement_item` | write | yes | yes | delta > 0 |
| `cart.remove_item` | write | yes | yes | cần productId rõ |
| `cart.clear` | write | yes | yes | destructive, cần confirmation nếu có item |

## Interaction With Other Agents

- Search Agent: resolve product target khi user nói tên mơ hồ, ordinal, “cái đó”, “sản phẩm vừa rồi”.
- Recommendation Agent: đọc far cart behavior để tránh đề xuất sản phẩm user hay xóa/bỏ qua.
- Storage/Memory Agent: nhận cart memory summary nhưng không sở hữu cart event ledger.
- RAG Agent: không liên quan cart CRUD, chỉ được gọi nếu câu hỏi chuyển sang chính sách.
- Customer Support Agent: nhận handoff nếu user nói lỗi, trả hàng, complaint, bảo hành.
- Security Agent: kiểm tra quyền, prompt injection, destructive action.
- Lead Agent: sau này chỉ điều phối theo `CartAgentRequest` và đọc `CartAgentResult`.

## Cart Agent Result Contract

```ts
interface CartAgentResult {
  status:
    | 'completed'
    | 'needs_auth'
    | 'needs_product_resolution'
    | 'needs_confirmation'
    | 'conflict'
    | 'rejected'
    | 'failed';
  cart: CartSnapshot;
  facts: CartFact[];
  issues: Array<{
    code:
      | 'product_not_in_cart'
      | 'product_not_resolved'
      | 'out_of_stock'
      | 'quantity_exceeds_stock'
      | 'cart_query_failed'
      | 'verification_failed'
      | 'needs_auth'
      | 'needs_confirmation'
      | 'cart_conflict'
      | 'tool_failed';
    message: string;
    recoverable: boolean;
    suggestedNextAgent?: 'search' | 'recommendation' | 'security' | 'customer_support' | 'lead';
  }>;
  operations: CartOperationResult[];
  events: CartEventSummary[];
  memory: {
    near: CartMemoryItem[];
    midSummary?: string;
    farSignals: CartBehaviorSignal[];
  };
  handoff: {
    agentMessage: string;
    userSafeMessage: string;
    leadInstruction: string;
    allowedClaims: string[];
    forbiddenClaims: string[];
  };
}
```

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Chốt Cart Agent DB design và migration plan | done | Prisma schema includes Cart Agent tables; migration artifact still tracked in checklist |
| 2 | Thiết kế SQL RAG schema context, query allowlist và private tool registry | done | Private registry + executor tests |
| 3 | Thiết kế Cart Agent contracts | done | Contract tests |
| 4 | Implement agent-to-agent goal protocol, internal planner và private sub-plan | partial | Goal protocol wrapper tests |
| 5 | Implement cart event ledger + idempotency cho CRUD | partial | Ledger + mutation writer tests pass; verifier/runtime integration pending |
| 6 | Implement Cart Agent private interaction history | pending | Interaction history tests |
| 7 | Implement near/mid/far cart memory | pending | Memory summarization tests |
| 8 | Implement Cart Agent state graph/state machine | pending | Cart agent unit/integration tests |
| 9 | Implement pending confirmation flow | pending | Confirmation tests |
| 10 | Tích hợp với Product/Search handoff và Lead future contract | pending | Cross-agent contract tests |
| 11 | Trace/observability cho từng node/tool | pending | Trace tests |
| 12 | Tối ưu fast path, latency budget và background summarization | pending | Performance tests/benchmark |
| 13 | Chạy real-request evaluation suite 100 case qua API/agent runtime và tinh chỉnh tới pass 100% | pending | `test/agent-pipeline/agents/cart-agent/real-request-100-cases.md` pass report + DB/trace evidence |
| 14 | Regression runtime cart/chat | pending | API tests pass |

## Verification

- CRUD cart pass qua API/integration.
- Add/remove/update/clear đều ghi `CartEvent`.
- Mọi write tool idempotent.
- Concurrent update không làm sai quantity/totals.
- Không thao tác nếu chưa auth.
- Không thao tác nếu product target mơ hồ.
- Clear/multi-item destructive action cần pending confirmation.
- Cart Agent nhớ được item vừa xóa/thêm/cập nhật từ near history.
- Cart Agent nhớ được các tương tác trước với Lead/agent khác qua `CartAgentInteraction`.
- Cart Agent trả facts/issues/agentMessage đủ để Lead Agent hiểu tình trạng giỏ hàng.
- Cart Agent xử lý được multi-task read như kiểm tra item + tính tổng tiền trong một lần gọi.
- Nếu sản phẩm hết hàng, không tìm thấy hoặc không có trong giỏ, Cart Agent trả issue rõ và suggested next agent.
- SQL RAG chỉ dùng allowed schema/tool context, không chạy raw SQL tùy ý.
- SQL/tool rows được ground thành facts có evidence trước khi compose response.
- Bộ realistic test 100 case phải chạy bằng request thật qua API/agent runtime, đánh giá output/DB side effect/trace và pass 100% trước khi đóng Cart Agent.
- Nếu case nào chưa thể tự động hóa, phải có manual verification và lý do rõ trong log.
- Mid summary được cập nhật khi event dài.
- Far behavior không chứa raw PII và không dùng để quyết định sai quyền.

## Close criteria

- DB có event ledger và memory cart riêng.
- Cart CRUD production-safe: transaction, idempotency, audit, version verify.
- Cart Agent có state graph/tool contract rõ.
- Test case cart pass 100%, gồm 100 real-request evaluation cases và regression/integration liên quan.
- Lead Agent có thể gọi Cart Agent qua contract mà không cần biết chi tiết DB.
