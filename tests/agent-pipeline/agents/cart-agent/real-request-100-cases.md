# Test Cases: Cart SQL RAG Agent Real Request 100

- Created: 2026-05-21 15:38
- Updated: 2026-05-22 13:20
- Related plan: `plans/agent-pipeline/agents/cart-agent/plan.md`
- Status: direct_runtime_passed
- Pass target: 100/100

## Latest Direct Runtime Pass

- Run date: 2026-05-22 13:16 Asia/Saigon
- Command: `corepack pnpm --filter @retail-agent/api test:runtime:cart-agent:100`
- Environment: local Postgres from `infra/docker/docker-compose.yml`, `DATABASE_URL=postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public`
- Passed: 100
- Failed: 0
- Report: `logs/planning/agent-pipeline/cart-agent-real-request-100-report.json`
- Coverage in this executable suite: auth, empty cart read, add, set quantity, increment, decrement, remove, clear pending confirm, DB interaction/memory.
- Remaining broader matrix items that depend on other agents: product search/recommendation/RAG/customer-support/final sales composer integration. Those remain tracked by their own agent plans and the top-level full real-request evaluation gate.

## Goal

Kiểm thử Cart SQL RAG Agent bằng 100 request thật trước khi đóng plan. Mỗi case phải chạy qua API hoặc agent runtime thật, đánh giá output thật, side effect DB thật, trace thật và pass hoặc có waiver rõ ràng trong log. Mục tiêu là tinh chỉnh tới khi đạt 100%.

## Rules

- Case không được chỉ là checklist hoặc mock chơi.
- Ưu tiên chạy qua HTTP/API hoặc agent runtime tương đương production.
- Mỗi case phải có seed data, request payload/message, expected output, expected DB side effect, expected trace/evidence.
- Mỗi case phải assert status, facts, issues, operations, cart snapshot, DB rows, trace/evidence.
- Không chấp nhận response “đúng đại ý” nếu facts sai.
- Không được claim success khi write tool fail hoặc verifier fail.
- Không được chạy raw SQL do LLM sinh.
- Nếu partial failure, response phải có partial facts + issue rõ.

## Real Request Harness

Test harness phải có dạng:

```txt
seed database
  -> send real HTTP/API request or call real CartAgent runtime
  -> capture response
  -> inspect DB side effects
  -> inspect trace/tool events
  -> evaluator checks expected facts/issues/claims
  -> pass/fail with reason
```

Mỗi test record phải lưu tối thiểu:

```ts
interface CartRealRequestCase {
  id: string;
  seed: string;
  request: {
    userId?: string;
    messageOrGoal: string;
    cartId?: string;
    resolvedProductIds?: string[];
  };
  expected: {
    status: string;
    facts: string[];
    issues: string[];
    dbEffects: string[];
    trace: string[];
    forbiddenClaims: string[];
  };
}
```

## Output Evaluation

Evaluator phải chấm:

- response status đúng;
- facts đúng số lượng, tiền, product, cart state;
- issues đúng loại lỗi;
- DB mutation đúng hoặc không mutate khi phải reject;
- `CartEvent`, `CartAgentInteraction`, trace được ghi đúng;
- không leak raw SQL/internal prompt;
- `agentMessage` và `leadInstruction` không mâu thuẫn facts.

## Coverage Matrix

| Group | Cases | Scope |
| --- | ---: | --- |
| A | 1-10 | Auth, empty cart, basic reads |
| B | 11-20 | Inspect item and totals |
| C | 21-30 | Add item realistic flows |
| D | 31-40 | Update/remove/clear/pending |
| E | 41-50 | SQL RAG retrieval and grounding |
| F | 51-60 | Private interaction history |
| G | 61-70 | Edge cases, ambiguity, product resolution |
| H | 71-80 | Error handling and partial failure |
| I | 81-90 | Concurrency, idempotency, performance |
| J | 91-100 | Cross-agent handoff and regression |

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| CART-001 | Guest asks current cart | `needs_auth`, no DB write |
| CART-002 | Logged-in user has empty cart and asks total | `completed`, total 0, item count 0 |
| CART-003 | Empty cart asked “có sản phẩm A chưa?” | `product_not_in_cart`, total still returned if requested |
| CART-004 | Empty cart asks “giỏ có gì?” | facts show empty cart, no issue |
| CART-005 | Active cart exists with one item | `get_state` returns exact quantity/subtotal/grandTotal |
| CART-006 | Multiple active carts data anomaly | choose latest active cart and emit warning issue |
| CART-007 | Ordered cart only, no active cart | create/read active empty cart depending rule, no ordered mutation |
| CART-008 | Cart status inactive/ordered mutation attempt | reject mutation |
| CART-009 | User tries accessing another user's cart | reject authorization |
| CART-010 | Missing cartId but user has active cart | resolve active cart safely |
| CART-011 | Inspect item by productId in cart | `item_found`, quantity and line total exact |
| CART-012 | Inspect item by exact product title | `item_found` |
| CART-013 | Inspect item by brand + partial name | match only if unambiguous |
| CART-014 | Inspect item by ambiguous name with 2 matches | `needs_product_resolution` |
| CART-015 | Inspect item not in cart but exists in catalog | `product_not_in_cart` |
| CART-016 | Inspect item not in catalog | `product_not_resolved` |
| CART-017 | Ask total and item count | returns subtotal/grandTotal/itemCount |
| CART-018 | Ask “món đắt nhất trong giỏ” | returns max line/product fact |
| CART-019 | Ask “sản phẩm rẻ nhất trong giỏ” | returns min line/product fact |
| CART-020 | Ask “có bao nhiêu loại sản phẩm?” | returns distinct item lines |
| CART-021 | Add resolved in-stock product quantity 1 | cart updated, event written, verifier pass |
| CART-022 | Add resolved product quantity 2 | quantity +2, totals exact |
| CART-023 | Add same product already in cart | increment existing line, no duplicate line |
| CART-024 | Add quantity exceeds stock | `quantity_exceeds_stock`, no mutation |
| CART-025 | Add inventory 0 product | `out_of_stock`, suggestedNextAgent recommendation/search |
| CART-026 | Add product id not found | `product_not_resolved`, no mutation |
| CART-027 | Add product name unresolved | `needs_product_resolution` |
| CART-028 | Add product from Product/Search handoff | accepts resolved product id and mutates |
| CART-029 | Add all last recommendations requires confirmation | creates pending action |
| CART-030 | Add duplicate request same idempotency key | no double add |
| CART-031 | Set quantity from 1 to 3 | exact quantity/totals/event |
| CART-032 | Set quantity to 0 | removes item with correct event |
| CART-033 | Increment quantity by 1 | exact before/after facts |
| CART-034 | Decrement quantity by 1 | exact before/after facts |
| CART-035 | Decrement below 0 | reject safe, no mutation |
| CART-036 | Remove existing item | item removed, event written |
| CART-037 | Remove absent item | `product_not_in_cart`, no mutation |
| CART-038 | Clear cart with 1 low-risk item | rule-defined behavior pass |
| CART-039 | Clear cart with many items | creates pending action, no immediate clear |
| CART-040 | Confirm pending clear | clears cart, writes pending confirmed + clear events |
| CART-041 | Goal requires schema context | uses `cart.rag.get_schema_context` |
| CART-042 | Planner proposes raw SQL | blocked, uses allowlisted tool only |
| CART-043 | Retrieve cart context for total | only necessary fields selected |
| CART-044 | Ground SQL rows into facts | facts include evidence/tool source |
| CART-045 | Empty rows are not SQL error | issue `product_not_in_cart`, not failed |
| CART-046 | SQL timeout on item query | issue `cart_query_failed`, no guessing |
| CART-047 | SQL totals ok, item query fail | partial total fact + item issue |
| CART-048 | SQL item ok, totals fail | item fact + total issue |
| CART-049 | CartEvent retrieval needed for “vừa xóa” | reads near events |
| CART-050 | Far memory retrieval needed for “hay mua” | reads far summary without blocking write |
| CART-051 | Lead asks “sản phẩm vừa kiểm tra còn không?” | uses CartAgentInteraction to resolve item |
| CART-052 | Lead asks “hồi nãy sao không thêm được?” | returns previous issue reason |
| CART-053 | Previous add failed out of stock | history returns `out_of_stock` |
| CART-054 | Previous target ambiguous | history returns ambiguity and suggested action |
| CART-055 | Interaction history long | summary created in CartAgentMemory |
| CART-056 | Interaction summary used after raw window limit | resolves from summary |
| CART-057 | Raw interaction still audit readable | raw row retained |
| CART-058 | CartEvent and Interaction disagree | current SQL state wins, issue warning |
| CART-059 | “cái vừa thêm” after two add events | resolves latest add event |
| CART-060 | “cái trước đó” after latest add | resolves previous interaction/event by order |
| CART-061 | Product alias matches one cart item | item found |
| CART-062 | Product alias matches multiple cart items | needs resolution |
| CART-063 | Vietnamese typo in product name | fuzzy/semantic rule or needs resolution, no wrong mutation |
| CART-064 | User asks policy/return in cart goal | handoff customer_support/RAG, no cart mutation |
| CART-065 | User asks checkout/payment | cart agent reports cart state, handoff order/payment agent |
| CART-066 | User asks complaint | handoff customer_support |
| CART-067 | User asks compare cart item with catalog item | return cart facts and suggest Search/Recommendation |
| CART-068 | User asks “mua lại món hay mua” | far behavior fact or needs product resolution |
| CART-069 | User asks “xóa món đắt nhất” | risky/derived target requires confirmation or clear rule |
| CART-070 | User asks “thêm cái rẻ nhất” without candidate scope | needs product resolution/recommendation |
| CART-071 | DB connection error before any fact | failed + cart_query_failed |
| CART-072 | DB error after partial read | partial facts + issue |
| CART-073 | Cart write succeeds but event write fails | transaction rollback or verification fail |
| CART-074 | Event write succeeds but cart write fails | no inconsistent commit |
| CART-075 | Verifier reload mismatch | verification_failed, no success claim |
| CART-076 | Pending action expired | expired/rejected, no mutation |
| CART-077 | Confirm pending wrong user | reject auth |
| CART-078 | Cancel pending action | status cancelled, no cart mutation |
| CART-079 | Tool returns malformed data | validation failure, safe issue |
| CART-080 | Product price changed after item added | totals use cart line/unit price rule defined |
| CART-081 | Concurrent add same product different idempotency keys | final quantity consistent |
| CART-082 | Concurrent set quantity stale version | one pass, stale conflict |
| CART-083 | Retry write after timeout same idempotency key | returns cached/equivalent result |
| CART-084 | Read path p95 budget | meets target or logs perf failure |
| CART-085 | Write path p95 budget | meets target or logs perf failure |
| CART-086 | History retrieval bounded | no full table scan |
| CART-087 | Mid/far summary async | response not blocked |
| CART-088 | Large cart 100 items ask total | returns within budget |
| CART-089 | Large cart inspect exact item | uses indexed lookup |
| CART-090 | Trace for every tool call | trace has status/duration/error summary |
| CART-091 | Lead receives completed cart answer | leadInstruction says enough info |
| CART-092 | Lead receives product_not_resolved | suggestedNextAgent search |
| CART-093 | Lead receives out_of_stock | suggestedNextAgent recommendation/search |
| CART-094 | Lead receives customer support handoff | suggestedNextAgent customer_support |
| CART-095 | Response never leaks raw SQL | no raw SQL in agentMessage/userSafeMessage |
| CART-096 | Response never leaks internal prompt/tool secret | no sensitive leak |
| CART-097 | Sales agent final answer uses allowedClaims only | no forbidden claim |
| CART-098 | Cart rail/UI data matches CartAgentResult | no mismatch |
| CART-099 | Regression: “thêm HomeSweep Mop Max 2” | product resolved, cart add succeeds if in stock |
| CART-100 | Regression: “giỏ có HomeSweep Mop Max 2 chưa, tổng bao nhiêu” | item fact + total fact accurate |

## Pass Report Template

```txt
Run date:
Command:
Environment:
Passed:
Failed:
Waived:
Real requests:
DB assertions:
Trace assertions:
Output evaluator:
Notes:
Next tuning:
```
