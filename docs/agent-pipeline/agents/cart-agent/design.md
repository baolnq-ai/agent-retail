# Cart Agent Design

- Cập nhật: 31-05-2026
- Trạng thái: hiện hành
- Service chính: `CartSqlRagAgentService`, `CartAgentPrivateToolExecutorService`, `CartAgentMutationWriterService`, `CartAgentStateService`

## Mục Tiêu

Cart Agent sở hữu toàn bộ nghiệp vụ giỏ hàng: xem giỏ, thêm, xóa, cập nhật số lượng, xóa toàn bộ, pending confirmation, audit và verify sau thao tác. Agent này không xử lý đổi trả, bảo hành, complaint hoặc refund; các nghiệp vụ đó thuộc Customer Support Agent + Business RAG.

## Boundary

Cart Agent được phép:

- Đọc giỏ hàng hiện tại.
- Resolve item trong giỏ khi đã có product evidence.
- Tạo pending action khi thao tác rủi ro hoặc entity chưa đủ chắc.
- Add/remove/update/clear cart qua private tool.
- Ghi ledger/audit và reload cart để verify.
- Trả structured facts/issues/userSafeMessage cho Lead.

Cart Agent không được:

- Đoán sản phẩm khi target mơ hồ.
- Chọn sản phẩm thay Search/Recommendation Agent.
- Claim thao tác thành công nếu write tool hoặc verifier chưa pass.
- Mutate cart khi khách chưa đăng nhập hoặc entity chưa xác thực.

## Luồng Xử Lý

```text
Lead task
  -> validate auth + cart state
  -> đọc target product evidence từ task/history/search nếu có
  -> build private cart tool plan
  -> execute allowlisted tool
  -> reload cart
  -> verify entity/số lượng/tổng tiền
  -> ghi ledger/history
  -> trả result cho Lead/Evaluator
```

## Tool Contract

Tool cart phải có input rõ, idempotency scope và evidence:

- `cart.sql.get_active_cart`
- `cart.sql.get_cart_items`
- `cart.sql.find_cart_item`
- `cart.write.add_item`
- `cart.write.remove_item`
- `cart.write.update_quantity`
- `cart.write.clear_cart`
- `cart.logic.verify_mutation`
- `cart.rag.compose_agent_response`

Lead không gọi trực tiếp các tool này. Chỉ Cart Agent được gọi và phải trả kết quả đã verify.

## Tiêu Chí Pass

- Guest cart action không được mutate và phải nhắc đăng nhập.
- Auth cart action phải mutate đúng product entity, đúng quantity.
- Follow-up như “thêm mẫu trên”, “bỏ cái đó” phải dùng History Agent hoặc cart/search evidence, không đoán.
- Nếu có nhiều candidate, tạo pending confirmation hoặc yêu cầu Lead hỏi làm rõ ngắn.
- Response cuối phải khớp cart summary thật sau khi reload.

## Dashboard Trace

Trace phải thể hiện ít nhất:

- `lead-agent` giao task cart.
- `cart-agent` nhận task.
- tool result completed/pending/error.
- `task-blackboard` có evidence.
- `sales-evaluator-agent` hoặc evaluator gate kiểm câu cuối.

Nếu thiếu các dấu hiệu này, benchmark cart phải fail hoặc warn để sửa pipeline.
