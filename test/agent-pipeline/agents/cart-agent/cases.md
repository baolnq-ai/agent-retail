# Test Cases: Cart Agent

- Created: 2026-05-21 14:18
- Updated: 2026-05-21 16:58
- Related plan: `plans/agent-pipeline/agents/cart-agent/plan.md`
- Status: planned

## Goal

Kiểm chứng Cart Agent production xử lý đúng CRUD, history, memory, idempotency, concurrency, auth và cross-agent handoff.

## Cases

| ID | Scenario | Expected |
| --- | --- | --- |
| CA-001 | User chưa đăng nhập muốn thêm sản phẩm | `needs_auth`, không ghi cart event write |
| CA-002 | Add product rõ target với idempotency key mới | Cart item tăng đúng, ghi `CartEvent.add`, trả `completed` |
| CA-003 | Retry cùng add request/idempotency key | Không cộng trùng quantity, trả cached/equivalent result |
| CA-004 | Remove product đang có trong cart | Item bị xóa hoặc quantity về 0, ghi before/after quantity |
| CA-005 | Set quantity vượt inventory | Reject an toàn, không mutate cart, ghi trace error |
| CA-006 | Decrement product về 0 | Xóa item, ghi event `decrement` hoặc `remove` theo rule đã chốt |
| CA-007 | Clear cart có nhiều item | Tạo `PendingCartAction`, chưa clear ngay |
| CA-008 | Confirm pending action còn hạn | Execute action, ghi pending confirmed + cart events |
| CA-009 | Confirm pending action hết hạn | `rejected` hoặc `expired`, không mutate cart |
| CA-010 | User nói “xóa cái vừa thêm” | Dùng near cart history để resolve product vừa thêm |
| CA-011 | User nói “mua lại món hay mua” | Dùng far behavior để trả needs_product_resolution hoặc đề xuất handoff |
| CA-012 | Concurrent update cùng cart version | Một request pass, request stale trả `conflict` |
| CA-013 | Cart event quá dài | Mid summary được cập nhật, raw event vẫn giữ |
| CA-014 | Complaint “sản phẩm lỗi muốn trả” | Cart Agent không xử lý, handoff Customer Support Agent |
| CA-015 | Final handoff claim success khi verifier fail | Guardrail chặn, trả failed/safe message |
| CA-016 | Add rõ `productId` + `quantity` | Chạy fast path, không gọi LLM/memory far |
| CA-017 | Near history resolve “xóa cái vừa thêm” | Chỉ đọc bounded near events, không scan toàn bộ history |
| CA-018 | Mid/far summary cần cập nhật | Chạy async/background, response chính không bị chặn |
| CA-019 | Stale `expectedCartVersion` | Trả `conflict`, không mutate cart |
| CA-020 | Benchmark add/remove/update rõ target | Đạt latency budget đã định trong plan |
| CA-021 | Lead gửi goal “kiểm tra sản phẩm A + tính tổng tiền” | Cart Agent tự chia private sub-plan, trả `facts` có item quantity/lineTotal và cart subtotal/grandTotal |
| CA-022 | Inspect sản phẩm không có trong giỏ | Trả issue `product_not_in_cart`, không gọi write tool |
| CA-023 | Add sản phẩm đã resolve nhưng inventory = 0 | Trả issue `out_of_stock`, gợi ý Lead gọi Recommendation/Search thay thế |
| CA-024 | Add sản phẩm chưa resolve tên | Trả `needs_product_resolution` + `leadInstruction` gọi Product/Search Agent |
| CA-025 | Multi-task read + write trong một request | Execute theo thứ tự plan, trả facts trước/sau và operations rõ ràng |
| CA-026 | SQL find item lỗi timeout | Trả issue `cart_query_failed`, không kết luận có/không |
| CA-027 | SQL totals ok nhưng find item empty | Trả tổng tiền và issue `product_not_in_cart`, không fail toàn bộ response |
| CA-028 | Private sub-plan có một bước fail recoverable | Hợp nhất partial facts + issues + leadInstruction rõ |
| CA-029 | LLM planner tạo raw SQL tùy ý | Bị chặn, chỉ cho dùng allowlisted SQL/Prisma tools |
| CA-030 | Goal cần schema context | Cart Agent retrieve `cart.rag.get_schema_context` trước khi chọn query tool |
| CA-031 | SQL rows trả về nhiều item | Ground rows thành facts có evidence, không compose trực tiếp từ raw rows |
| CA-032 | Lead hỏi “sản phẩm vừa kiểm tra còn trong giỏ không?” | Retrieve `CartAgentInteraction`, resolve sản phẩm trước đó, rồi query cart hiện tại |
| CA-033 | Tool add fail vì hết hàng rồi Lead hỏi “sao hồi nãy không thêm được?” | Dùng interaction history trả issue trước đó là `out_of_stock` |
| CA-034 | Interaction history dài quá ngưỡng | Summary vào `CartAgentMemory` mid/far, raw interaction vẫn audit được |

| CA-035 | LLM response có `tool_calls` hoặc function-call payload | Runtime bỏ qua toolcall, chỉ parse structured response schema hợp lệ |
| CA-036 | LLM structured plan chứa tool không nằm trong 36 private tools | `cart.logic.validate_private_plan` reject, không execute tool |
| CA-037 | LLM structured plan chứa raw SQL | Reject với issue `unsafe_plan`, không query DB |
| CA-038 | LLM đề xuất write tool thiếu `idempotencyKey` | Reject plan hoặc tạo clarification/pending, không mutate cart |
| CA-039 | Lead cố gọi trực tiếp `cart.write.add_item` | Bị chặn; Lead chỉ được gọi `cart.agent.run_goal` |
| CA-040 | vLLM server không bật auto tool choice | Cart Agent vẫn chạy vì chỉ cần structured response, backend tự execute tools |

## Automation target

- Contract tests cho `CartAgentRequest`, `CartAgentResult`, `CartEvent`.
- Integration tests với database thật/test container cho cart CRUD.
- API/chat regression cho add/remove/update/clear/pending confirmation.
- Concurrency test cho optimistic cart version.
- Idempotency test cho mọi write tool.
