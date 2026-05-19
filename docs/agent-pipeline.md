# Pipeline chatbot bán hàng

- Cập nhật: 2026-05-19
- Phạm vi: pipeline hiện tại của chatbot RetailHome, gồm bộ nhớ, phân tích câu hỏi, truy xuất, thao tác giỏ hàng, prompt LLM và dashboard trace.

## Mục tiêu

Chatbot là trợ lý bán hàng có tool thật, không phải LLM trả lời tự do. Mỗi câu trả lời phải dựa trên dữ liệu backend thật: catalog, chính sách, lịch sử tài khoản, giỏ hàng và kết quả tool đã xác minh.

Luồng tổng quát:

```txt
User message
  -> memory-agent điều tra lịch sử và wiki bộ nhớ có giới hạn
  -> user-analysis-agent phân tích ý định
  -> product-manager-agent quản lý tìm/resolve sản phẩm
  -> retrieval-agent chuẩn bị context sản phẩm/chính sách nếu cần
  -> cart-manager-agent thao tác giỏ nếu cần
  -> sales-agent gọi LLM viết câu trả lời cuối
  -> frontend hiển thị text, product cards, policy cards và cart summary
```

## 1. Memory agent

File chính:

```txt
apps/api/src/services/chat-memory.service.ts
```

Nhiệm vụ: đọc lịch sử theo tài khoản trước khi quyết định user đang muốn gì.

Dữ liệu đang dùng:

- lượt chat gần đây;
- tóm tắt dài hạn;
- sở thích/hành vi đã lưu;
- sản phẩm vừa đề xuất gần đây;
- thao tác giỏ đang chờ xác nhận;
- metadata của câu trả lời trước, gồm selected product ids và cart action product ids.

Logic chính:

```txt
1. Nhận câu mới.
2. Kiểm tra câu có cần lịch sử không.
3. Nếu có, lấy sản phẩm gần nhất từ trace/recent recommendations.
4. Trả về MemoryInvestigationResult.
```

Các câu thường cần lịch sử:

```txt
sản phẩm mới
cái vừa gợi ý
vừa rồi
thêm hết
mấy cái đó
sản phẩm khác
nó / đó / này
```

Kết quả trả ra có dạng đơn giản:

```txt
requiresHistory
resolvedReference
referenceProductIds
lastSelectedProductIds
lastCartActionProductIds
visitedNodes
memoryEvidence
summary
confidence
```

Memory-agent không quét vô hạn. Nó tạo các node từ recent turns, rolling summary, preference, recent recommendations, pending cart plan và trace metadata; sau đó bung rộng theo liên quan sản phẩm/từ khoá với giới hạn depth/node để chỉ đánh đúng vùng nhớ cần thiết.

Ví dụ:

```txt
User: thêm sản phẩm mới vào giỏ
Memory: sản phẩm mới = sản phẩm vừa được đề xuất gần nhất
```

## 2. User-analysis agent

File chính:

```txt
apps/api/src/services/agents/user-analysis-agent.service.ts
```

Nhiệm vụ: biến câu user thành intent có cấu trúc.

Các intent chính:

| Intent | Ý nghĩa |
| --- | --- |
| `recommend` | User muốn được gợi ý sản phẩm |
| `compare` | User muốn so sánh |
| `product_detail` | User hỏi chi tiết sản phẩm |
| `policy` | User hỏi chính sách |
| `cart_action` | User muốn thêm/xoá/sửa giỏ |
| `cart_status` | User hỏi giỏ hiện tại |
| `confirm_pending` | User xác nhận thao tác đang chờ |
| `cancel_pending` | User huỷ thao tác đang chờ |
| `smalltalk` | Câu thường, không cần tool |

Nó cũng xác định:

```txt
cartOperation: add/remove/clear/set_quantity/increment_quantity/decrement_quantity
retrievalMode: none/recent/fresh/alternatives
shouldShowProducts: true/false
quantity
references
constraints
needsClarification
```

Ý nghĩa `retrievalMode`:

| Mode | Khi nào dùng |
| --- | --- |
| `none` | Không cần tìm sản phẩm |
| `recent` | Dùng sản phẩm từ lịch sử gần nhất |
| `fresh` | Search catalog mới |
| `alternatives` | Tìm sản phẩm khác, loại sản phẩm vừa đề xuất hoặc trong giỏ |

Ví dụ:

```txt
User: gợi ý 2 máy lọc phòng 25m2 dưới 4 triệu
=> intent=recommend, retrievalMode=fresh, shouldShowProducts=true
```

```txt
User: thêm máy lọc đi
Memory đã tìm được máy lọc vừa đề xuất
=> intent=cart_action, cartOperation=add, retrievalMode=recent
```

```txt
User: sản phẩm trong giỏ hiện tại có gì?
=> intent=cart_status, retrievalMode=none, shouldShowProducts=false
```

Điểm quan trọng: chỉ nhắc chữ “sản phẩm” không còn tự động kích hoạt đề xuất.

## 3. Orchestrator

File chính:

```txt
apps/api/src/services/agent.service.ts
apps/api/src/services/agent-orchestrator.service.ts
```

Nhiệm vụ: sắp xếp thứ tự các agent và quyết định bước nào cần chạy.

Luồng hiện tại:

```txt
1. Load memory, cart và catalog.
2. Chạy memory-agent để điều tra lịch sử.
3. Chạy user-analysis-agent với kết quả memory.
4. Quyết định retrievalMode.
5. Nếu cần, search sản phẩm/chính sách.
6. Chạy cart-manager nếu có thao tác giỏ.
7. Build context và prompt cho LLM.
8. Lưu trace cho dashboard.
```

Pipeline đã có dạng nhiều agent phối hợp, nhưng vẫn bị giới hạn số vòng để tránh chạy quá lâu. Khi câu mơ hồ, memory được ưu tiên trước khi hỏi lại user.

## 4. Product-manager agent

File chính:

```txt
apps/api/src/services/agents/product-manager-agent.service.ts
apps/api/src/services/catalog.service.ts
```

Nhiệm vụ: quản lý toàn bộ việc resolve/tìm/chọn sản phẩm trước khi các agent khác dùng. Orchestrator không tự đoán sản phẩm nữa mà gửi yêu cầu cho agent này.

Pipeline:

```txt
1. Nhận message, intent, memory result và giỏ hiện tại.
2. Nếu retrievalMode=recent, lấy product ids đã được memory-agent resolve.
3. Nếu retrievalMode=fresh, gọi catalog search.
4. Nếu retrievalMode=alternatives, loại sản phẩm vừa đề xuất và sản phẩm trong giỏ.
5. Trả candidates, selectedProducts, excludedProductIds, evidence và confidence.
```

## 5. Retrieval agent

File chính:

```txt
apps/api/src/services/catalog.service.ts
apps/api/src/services/knowledge.service.ts
apps/api/src/services/model-gateway.service.ts
```

Nhiệm vụ: chuẩn bị sản phẩm/chính sách thành context có thể đưa vào LLM.

Thuật toán tìm sản phẩm nền trong catalog:

```txt
1. Lấy sản phẩm từ database.
2. Parse điều kiện giá: dưới/trên/tầm/khoảng bao nhiêu triệu.
3. Tính điểm theo token trong title, brand, category, description, attributes.
4. Cộng điểm khi match diện tích phòng, budget hoặc keyword quan trọng.
5. Sort theo điểm cao trước, nếu bằng điểm thì giá thấp hơn trước.
```

Sau đó hệ thống build context documents và gọi:

```txt
embedding thật
rerank thật
```

Nếu rerank lỗi hoặc trả kết quả không hợp lệ:

```txt
fallback về lexical ranking
ghi lỗi non-fatal vào trace
```

## 6. Cart-manager agent

File chính:

```txt
apps/api/src/services/agents/cart-manager-agent.service.ts
apps/api/src/services/commerce.service.ts
```

Nhiệm vụ: thao tác giỏ hàng thật. LLM không được tự thêm/xoá/sửa giỏ.

Tool hiện có:

```txt
cart.add
cart.remove
cart.clear
cart.setQuantity
cart.incrementQuantity
cart.decrementQuantity
cart.confirmPendingPlan
cart.cancelPendingPlan
```

Cách resolve sản phẩm:

```txt
1. Ưu tiên product ids đã được memory-agent resolve.
2. Nếu user nói tên/danh mục như “máy lọc”, lọc trong sản phẩm lịch sử trước.
3. Nếu user nói “cái thứ 2”, dùng thứ tự sản phẩm vừa đề xuất.
4. Nếu user nói “trong giỏ”, tìm trong giỏ hiện tại.
5. Fallback cuối mới dùng selected products từ retrieval.
```

Quy tắc xác nhận:

```txt
Cần xác nhận:
- xoá toàn bộ giỏ;
- thao tác rộng hoặc nguy hiểm;
- không xác định rõ sản phẩm.

Không cần xác nhận:
- thêm sản phẩm đã resolve rõ từ lịch sử;
- user nói rõ “thêm hết”, “thêm cả 2”.
```

Quy tắc bắt buộc:

```txt
Bot chỉ được nói đã thêm/xoá/sửa nếu toolResults báo completed.
```

## 7. Sales agent và prompt LLM

File chính:

```txt
apps/api/src/services/agent.service.ts
```

Sales agent là bước cuối. Nó không tự quyết định tool, chỉ viết câu trả lời từ context đã chuẩn bị.

System prompt hiện yêu cầu:

```txt
- Trả lời như nhân viên tư vấn bán hàng tiếng Việt.
- Chỉ dùng catalog, chính sách và giỏ hàng được cung cấp.
- Không bịa thông tin ngoài context.
- Không hiển thị mã sản phẩm nội bộ.
- Trả lời tự nhiên trong 3-5 câu ngắn.
- Chỉ nhắc đúng sản phẩm đã được chọn.
- Nếu tool giỏ hàng chưa completed thì không được nói đã thao tác thành công.
```

Context đưa vào prompt gồm:

```txt
Nhu cầu khách
Agent route
Kết quả user-analysis-agent
Kết quả memory-agent resolve sản phẩm
Rolling summary
Lịch sử gần đây
Sở thích đã lưu
Kết quả tool giỏ hàng đã thực thi
Sản phẩm được chọn
RAG/chính sách đã xếp hạng
Giỏ hàng hiện tại nếu cần
```

Ví dụ rút gọn:

```txt
User: thêm máy lọc đi
Memory: resolved product = air-filter-001
Analysis: intent=cart_action, cartOperation=add, retrieval=recent
Tool result: cart.add completed
Sales agent: “Mình đã thêm máy lọc vừa đề xuất vào giỏ hàng của bạn.”
```

## 8. Frontend

File chính:

```txt
apps/web/src/app/retail-client.tsx
```

Backend trả response dạng block:

```txt
text
product_list
cart_summary
policy_answer
quick_replies
```

Frontend hiển thị:

| Block | Cách hiển thị |
| --- | --- |
| `text` | Bong bóng chat |
| `product_list` | Card/slider sản phẩm |
| `cart_summary` | Cập nhật giỏ hàng frontend |
| `policy_answer` | Card chính sách |
| `quick_replies` | Nút gợi ý nhanh |

Khi cart thay đổi, frontend phát event:

```txt
retail-cart-changed
```

Các trang khác nghe event này để cập nhật giỏ ngay.

## 9. Dashboard trace

File chính:

```txt
apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx
apps/api/src/services/agent-trace.service.ts
```

Dashboard đọc trace mới nhất:

```txt
GET /api/v1/agent/traces/latest
```

Nó hiển thị:

```txt
sơ đồ agent và node phụ trợ
pipeline stages
dữ liệu bộ nhớ/cache
truy xuất/rerank
thao tác giỏ hàng
context LLM
lỗi/dự phòng
```

Node có `kind=agent` sẽ hiện tag `agent`. Các node phụ trợ như database sản phẩm, database lịch sử, wiki bộ nhớ, context text hoặc cart tool vẫn hiện trên graph nhưng không có tag agent.

Trace giúp nhìn được câu chat đã đi qua agent nào, dùng sản phẩm nào, tool nào completed và có fallback nào không.

## 10. Tóm tắt ngắn

Pipeline hiện tại:

```txt
1. Đọc bộ nhớ và giỏ hàng.
2. Điều tra lịch sử nếu câu có tham chiếu mơ hồ.
3. Phân tích intent, operation, retrieval mode.
4. Tìm sản phẩm/chính sách nếu cần.
5. Resolve sản phẩm cho cart action.
6. Gọi tool giỏ hàng thật và xác minh kết quả.
7. Build prompt từ dữ liệu đã xác minh.
8. LLM viết câu trả lời cuối.
9. Frontend hiển thị blocks.
10. Dashboard lưu và hiển thị trace.
```

## 11. Điểm còn cần nâng tiếp

Các điểm nên nâng ở phase sau:

```txt
1. Memory investigation hiện vẫn còn nhiều rule-based.
2. Chưa có vector memory riêng cho lịch sử dài hạn.
3. Chưa có ConversationContextAgent tạo state chuẩn cho mọi agent dùng chung.
4. Chưa có scoring đầy đủ giữa sản phẩm lịch sử, sản phẩm trong giỏ và sản phẩm search mới.
5. Chưa có runtime test dài cho nhiều lượt hội thoại liên tiếp.
```

Hướng nâng tiếp nên là tạo `ConversationContextAgent` để trả một object trung tâm:

```txt
currentIntent
previousIntent
referencedProducts
candidateTargets
ambiguityLevel
recommendedAction
shouldAskUser
memoryEvidence
```

Sau đó user-analysis, retrieval và cart-manager dùng chung object này thay vì mỗi agent tự đoán một phần.
