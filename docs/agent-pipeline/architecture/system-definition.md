# Agent Pipeline System Definition

- Created: 2026-05-21 13:46
- Updated: 2026-05-21 19:55
- Status: draft
- Related plans: `plans/agent-pipeline/`

## Purpose

Định nghĩa hệ agent mới cho chatbot RetailHome. Tài liệu này là nguồn tham chiếu kiến trúc khi code lại pipeline.

## Principle

Pipeline mới dùng Lead Agent làm trung tâm điều phối. Lead Agent không làm thay việc của agent chuyên trách. Nó chỉ phân tích, lập kế hoạch, yêu cầu agent khác làm việc, tổng hợp kết quả và kiểm tra câu trả lời cuối.

## Agents

### Lead Agent

Vai trò:

- phân tích sâu câu hỏi;
- lấy và đọc ngữ cảnh từ Storage/Memory Agent;
- lập `ExecutionPlan`;
- điều phối agent khác;
- đánh giá kết quả agent;
- kiểm tra câu trả lời cuối.

Không làm:

- không mutate cart;
- không tự query catalog;
- không tự trả lời chính sách nếu chưa có RAG/tool evidence;
- không tự chọn sản phẩm nếu chưa có recommendation/search result.

### Cart Agent

Vai trò:

- xem giỏ hàng;
- thêm sản phẩm;
- xóa sản phẩm;
- cập nhật số lượng;
- xác nhận side effect sau khi thao tác.

Điều kiện:

- chỉ execute khi target product rõ;
- nếu thiếu target, trả `needs_resolution` cho Lead Agent.

### Recommendation Agent

Vai trò:

- đề xuất sản phẩm theo nhu cầu, ngân sách, sở thích, hành vi;
- chấm điểm product fit;
- giải thích lý do đề xuất;
- trả product rail nhất quán với câu trả lời.

Pipeline con:

```txt
Recommendation request
  -> lấy user preference/behavior
  -> lấy candidate từ Search Agent hoặc Product Manager
  -> rerank theo sale fit
  -> judge sản phẩm cuối
  -> trả score + reasons + product rail
```

### Search Agent

Vai trò:

- hard search theo tên, alias, category, brand, attribute, price, stock;
- fallback semantic/embedding khi query mơ hồ;
- rerank candidates;
- dùng LLM judge để loại kết quả lệch.

Pipeline con:

```txt
Search request
  -> hard filters
  -> exact/alias lexical search
  -> category/attribute expansion
  -> embedding fallback nếu thiếu kết quả
  -> rerank
  -> LLM judge
  -> SearchResult
```

### Storage/Memory Agent

Vai trò:

- quản lý lịch sử hội thoại;
- rolling summary;
- sở thích;
- hành vi;
- sản phẩm từng xem/đề xuất;
- pending action và context đang dang dở.

Không làm:

- không viết câu trả lời user;
- không tự quyết định intent cuối.

### RAG Agent

Vai trò:

- truy xuất thông tin chính sách shop;
- pháp lý;
- thương hiệu;
- hướng dẫn mua hàng;
- thông tin sản phẩm có nguồn tài liệu.

Điều kiện:

- trả evidence/source rõ;
- nếu không có nguồn, báo không đủ dữ liệu.

### Security Moderation Agent

Vai trò:

- kiểm duyệt input;
- phát hiện prompt injection;
- kiểm tra yêu cầu lộ dữ liệu;
- kiểm tra output trước khi gửi user;
- đảm bảo không leak tool prompt/internal handoff.

### Customer Support Agent

Vai trò:

- xử lý lỗi sản phẩm;
- đổi trả;
- complaint;
- bảo hành;
- escalations;
- phối hợp RAG Agent để dùng chính sách đúng.

## Security And Support Contract Addendum

Detailed contracts:

- Security Moderation Agent: `plans/agent-pipeline/agents/security-agent/plan.md`
- Customer Support Agent: `plans/agent-pipeline/agents/customer-support-agent/plan.md`

Security Agent must guard input, plan/action gates, memory/RAG/cart/support access and final output. It must not mutate business data and must not log secrets, tokens, cookies, passwords or unnecessary PII.

Customer Support Agent must handle defects, returns, refunds, warranty, shipping, wrong/missing items, complaints and human handoff. It must use RAG/tool evidence for support policy claims and must not promise refund/return/warranty without evidence.

## Response Rule

Response cuối chỉ được nói các sự kiện đã có evidence:

- thao tác giỏ hàng phải dựa trên Cart Agent result;
- sản phẩm đề xuất phải dựa trên Recommendation/Search result;
- chính sách phải dựa trên RAG Agent result;
- trường hợp không đủ thông tin phải hỏi lại user.
