# Cart Agent Design

- Created: 2026-05-21 14:18
- Updated: 2026-05-21 16:58
- Status: draft
- Related plan: `plans/agent-pipeline/agents/cart-agent/plan.md`

## Summary

Cart Agent là **Cart SQL RAG Agent** sở hữu 100% domain giỏ hàng: truy vấn giỏ hàng, CRUD, state, audit, pending confirmation và cart memory. Nó không xử lý trả hàng, lỗi sản phẩm, complaint hay bảo hành.

## Current Database Gap

Schema hiện tại có `Cart` và `CartItem` cho state hiện tại, nhưng chưa đủ production vì thiếu lịch sử/audit. Agent không thể biết chắc “sản phẩm nào bị xóa lúc nào”, “đã thêm gì rồi”, “thao tác nào do agent nào làm”, hay “request nào đã được retry”.

### Current schema readout

- `Cart`/`CartItem` đủ cho current snapshot, chưa đủ cho lịch sử agent và audit.
- `Product.inventory` đủ guard stock cơ bản, nhưng resolve tên mơ hồ vẫn thuộc Search Agent.
- `IdempotencyKey` có thể tái sử dụng cho cart write scope, nhưng cần cleanup/expiry rõ.
- `ChatThread`/`ChatMessage` là chat history chung, không thay thế được `CartAgentInteraction`.
- `UserPreference.pending_cart_plan` hiện là chỗ lưu ké pending action, cần thay bằng `PendingCartAction`.
- `UserInteractionEvent` hữu ích cho recommendation, không thay thế được `CartEvent`.

## Recommended Architecture

Mạnh nhất cho Cart Agent là:

```txt
LangGraph StateGraph hoặc custom state machine
  + SQL RAG over cart schema/state/events/memory
  + typed tool contract
  + event-sourced cart ledger
  + near/mid/far cart memory
  + idempotent write tools
  + transaction + optimistic concurrency
  + trace per node/tool
```

LangGraph đáng dùng nếu spike tổng pass vì tài liệu chính thức hỗ trợ graph orchestration, streaming, persistence/checkpoint và memory. LangChain tool docs cũng khuyến nghị tool có input schema rõ, thường dùng Zod. Tuy nhiên cart CRUD không nên để ReAct auto-loop tự do quyết định; executor phải gọi deterministic tool theo plan đã validate.

## SQL RAG Role

Cart Agent là SQL RAG agent:

```txt
Lead goal
  -> retrieve allowed cart schema/tool context
  -> retrieve Cart Agent interaction history if goal references previous interaction
  -> plan private SQL/cart tool calls
  -> execute allowlisted SQL/Prisma tools
  -> retrieve CartEvent/CartAgentMemory when needed
  -> ground rows into facts/evidence
  -> evaluate empty/error/conflict/out-of-stock
  -> compose agent response for Lead
```

Production rule: LLM không được chạy raw SQL tự do. SQL RAG dùng allowed tools, query templates hoặc Prisma repositories với parameterized input, scope theo `userId/cartId`, timeout và trace.

References:

- LangGraph JS overview: https://docs.langchain.com/oss/javascript/langgraph
- LangGraph memory: https://docs.langchain.com/oss/javascript/langgraph/add-memory
- LangGraph persistence: https://docs.langchain.com/oss/javascript/langgraph/persistence
- LangChain JS tools: https://docs.langchain.com/oss/javascript/langchain/tools

## Data Model Direction

Thêm các bảng production:

- `CartEvent`: audit/event ledger cho mọi thao tác cart.
- `CartAgentMemory`: memory riêng của Cart Agent theo near/mid/far.
- `PendingCartAction`: pending confirmation riêng, không lưu ké trong `UserPreference`.

## Ownership

Cart Agent được phép:

- đọc current cart;
- trả lời các task về giỏ hàng cho agent khác như kiểm tra sản phẩm trong giỏ, số lượng, tổng tiền, item vừa thêm/xóa;
- đọc cart history;
- tạo pending action;
- confirm/cancel pending action;
- add/remove/update/clear cart;
- ghi cart event;
- ghi cart memory.

Cart Agent không được:

- tự chọn sản phẩm khi target mơ hồ;
- tự xử lý refund/return/complaint/warranty;
- tự tạo response cuối cho user ngoài `userSafeMessage` dạng handoff;
- claim action success nếu verifier chưa pass.

## Memory Tiers

- Near: current cart + pending action + event gần nhất.
- Mid: summary theo active cart/session.
- Far: behavior lâu dài từ cart/order event.

Raw `CartEvent` phải được giữ làm audit; summary chỉ dùng để nén ngữ cảnh cho agent.

## Simple Runtime Logic

Cart Agent nhận:

- `userId`, `cartId`, `requestId`;
- goal từ Lead/Executor bằng ngôn ngữ/intent, ví dụ “kiểm tra có sản phẩm A trong giỏ chưa và tổng tiền bao nhiêu”;
- target đã resolve nếu có: `productId`, `quantity`;
- `idempotencyKey` cho write tool;
- `expectedCartVersion` nếu client/Lead có cart version.

Cart Agent làm:

```txt
1. Validate input/auth/idempotency.
2. Hiểu goal và tự chia private sub-plan.
3. Retrieve schema/tool context được phép.
4. Tự gọi tool riêng: SQL read, cart write, history, logic evaluator.
5. Nếu goal nhắc tương tác trước đó, retrieve `CartAgentInteraction`.
6. Ground rows/tool results/history thành facts có evidence.
7. Đánh giá từng tool result: ok, SQL lỗi, không có kết quả, target mơ hồ, hết hàng.
8. Nếu action rủi ro, tạo pending confirmation.
9. Nếu action rõ, mutate cart bằng transaction.
10. Ghi CartEvent trong cùng transaction.
11. Reload cart để verify.
12. Lưu `CartAgentInteraction`.
13. Hợp nhất facts/issues/agentMessage.
14. Trả structured result cho Lead Agent.
15. Summary mid/far chạy nền, không chặn response chính.
```

## Agent Response Style

Cart Agent không nhận task web API cứng và không trả yes/no cứng. Lead Agent giao mục tiêu; Cart Agent tự gọi private tools rồi trả **structured facts** và một đoạn **agentMessage** để Lead Agent hoặc Sales/Support Agent đọc hiểu.

Ví dụ goal:

```txt
Tôi cần biết sản phẩm A có trong giỏ không và tổng tiền hiện tại.
```

Response:

```txt
status: completed
facts:
  - product A đang có trong giỏ, số lượng 2, thành tiền 4.000.000 VND
  - tổng giỏ hàng 10.000.000 VND
issues: none
agentMessage: Trong giỏ có sản phẩm A số lượng 2. Tổng tiền hiện tại là 10.000.000 VND.
leadInstruction: Đủ dữ liệu để trả lời user.
```

Nếu có vấn đề:

```txt
status: needs_product_resolution | rejected | failed
issues:
  - product_not_resolved
  - product_not_in_cart
  - out_of_stock
  - quantity_exceeds_stock
  - cart_query_failed
  - verification_failed
leadInstruction: gọi Search Agent, Recommendation Agent hoặc hỏi lại user.
```

## Private Tool Rule

Lead Agent không gọi SQL/cart tool trực tiếp. Chỉ Cart Agent được dùng:

- `cart.rag.get_schema_context`
- `cart.rag.retrieve_cart_context`
- `cart.rag.retrieve_interaction_history`
- `cart.rag.ground_rows_to_facts`
- `cart.sql.get_active_cart`
- `cart.sql.get_cart_items`
- `cart.sql.get_cart_totals`
- `cart.sql.find_cart_item`
- `cart.sql.get_cart_events`
- `cart.sql.get_agent_interactions`
- `cart.logic.plan_from_goal`
- `cart.logic.evaluate_query_results`
- `cart.logic.compose_handoff`
- `cart.write.*`

Nhờ vậy Cart Agent vẫn là agent thật: nó hiểu mục tiêu, chọn tool, kiểm lỗi, hợp nhất kết quả rồi mới báo lại.

Tool inventory:

- 1 public interface: `cart.agent.run_goal`.
- 36 private tools:
  - 6 RAG/schema/context tools;
  - 8 SQL read tools;
  - 7 logic/planner/evaluator tools;
  - 9 write tools;
  - 6 audit/memory/trace tools.

## LLM Response-Only Rule

Cart Agent không dùng LLM/vLLM toolcall trong production. LLM chỉ được trả structured response/private plan theo schema. Backend parse, validate, reject plan sai, rồi deterministic executor mới gọi private tools allowlist.

vLLM server vì vậy không cần bật `--enable-auto-tool-choice` cho Cart Agent. Nếu thử toolcall ở agent khác sau này, không cấp DB/write tools thật và vẫn phải validate qua backend.

## Private Interaction History

Cart Agent có lịch sử riêng để hiểu các nhắc lại trong hội thoại agent-to-agent.

- `CartEvent`: lưu sự kiện thay đổi giỏ hàng.
- `CartAgentInteraction`: lưu goal từ Lead, private plan, tool result summary, facts, issues, agentMessage, leadInstruction.
- `CartAgentMemory`: lưu summary gần/vừa/xa khi interaction/event quá dài.

Ví dụ khi Lead hỏi “sản phẩm vừa kiểm tra còn trong giỏ không?”, Cart Agent dùng `CartAgentInteraction` để biết “vừa kiểm tra” là sản phẩm nào, sau đó dùng SQL tool kiểm tra cart state hiện tại.

## SQL Guardrails

- Không raw SQL tự do từ LLM.
- Chỉ dùng allowlisted query/tool.
- Query luôn parameterized.
- Query luôn scope theo `userId/cartId`.
- Không expose secret/session/password.
- SQL lỗi thì trả `cart_query_failed`, không đoán.
- Empty rows khác với SQL lỗi: empty rows có thể là `product_not_in_cart`.

## Performance Rule

CRUD rõ target phải chạy fast path deterministic, không gọi LLM. LLM chỉ được dùng cho câu mơ hồ hoặc tóm tắt history. Near history đọc có giới hạn, mid/far memory dùng summary đã chuẩn bị sẵn. Mục tiêu là accuracy cao mà không làm chậm chat.

## Accuracy Rule

Cart Agent không đoán sản phẩm. Nếu target chưa rõ, nó trả `needs_product_resolution` để Search Agent xử lý. Nếu tool write chưa success và verifier chưa pass, response cuối không được nói đã thêm/xóa/cập nhật.
