# Kế hoạch nâng pipeline multi-agent blackboard và benchmark 1000 câu

Ngày tạo: 30-05-2026
Trạng thái: hoàn thành
Phạm vi: backend agent pipeline, DB/Redis task state, dashboard trace, benchmark/evaluator, docs/logs.

## Mục tiêu bắt buộc

- Sửa trực tiếp trên pipeline hiện tại, không đập bỏ source đang có.
- Không code đè vô tội vạ, không nhúng logic tạm, không để code cũ chết nằm lại.
- Không reset DB, không seed làm rỗng dữ liệu, không dùng mock/fallback để che lỗi.
- Chuyển dần runtime từ route tuyến tính sang lead orchestrator + task blackboard + tool/agent loop có ngân sách.
- Product search/recommend không dùng embedding/rerank; dùng catalog thật, keyword/facet/SKU/brand/category/budget và kiểm liên quan.
- Business RAG dùng embedding + rerank + knowledge DB cho chính sách, bảo hành, hậu mãi, thông tin cửa hàng.
- Cart agent bắt buộc xác thực đúng entity, số lượng, trạng thái đăng nhập trước thao tác.
- Evaluator kiểm semantic cuối: sai ý khách, sai product rail, sai lịch sử, sai cart, bịa dữ liệu đều fail.
- Response agent trả lời tự nhiên như nhân viên, không lộ pipeline, không lan man.
- Benchmark mới có 1000 câu theo tình huống thực tế, từng câu chạy nhẹ để tránh sập LLM/embed/rerank.

## Kiến trúc đích

### Lead Orchestrator

- Nhận câu user, lập task objective, constraints, budget.
- Quyết định vòng lặp agent/tool dựa trên state hiện tại, không chỉ dựa regex intent.
- Mỗi bước ghi task event vào blackboard.
- Có ngân sách:
  - tối đa số vòng agent cho một câu;
  - tối đa số tool call;
  - timeout mềm;
  - retry có lý do, không retry mù.
- Dừng khi evaluator đạt chuẩn hoặc cần hỏi làm rõ thật sự.

### Task Blackboard

- Lưu trạng thái của một câu hỏi trong DB/Redis, không dùng file md runtime.
- Dữ liệu cần có:
  - requestId, userId, cartId, message;
  - objective;
  - hypotheses;
  - agent steps;
  - tool calls;
  - evidence product/policy/history/cart;
  - decisions;
  - evaluator verdict;
  - final response contract.
- Phải đủ dữ liệu để dashboard replay pipeline.
- Không lưu secret, token, cookie, prompt ẩn.

### History Agent

- Chỉ phục vụ truy xuất lịch sử khi được yêu cầu cụ thể.
- Tool chính:
  - lấy N lượt gần nhất có product rail;
  - lấy lượt có cart action;
  - resolve tham chiếu "cái đó", "mẫu trên", "món rẻ hơn", "sản phẩm vừa thêm";
  - tóm tắt sở thích/ngữ cảnh dài hạn khi cần.
- Trả về evidence cụ thể, confidence, missing context.

### Catalog Search Agent

- Search bằng catalog thật, không embedding/rerank.
- Tool/lane:
  - exact SKU/id/title;
  - fuzzy title/brand/category;
  - hard keyword/facet;
  - budget/price range;
  - room size/use-case;
  - related family expansion khi không có sản phẩm chính xác.
- Bắt buộc ghi lý do vì sao chọn hoặc loại từng nhóm.
- Nếu không có loại chính xác, phải nói rõ "shop chưa có X" và chọn nhóm liên quan nhất có căn cứ.

### Recommendation Agent

- Chọn sản phẩm từ candidate đã được search agent chứng minh.
- Kiểm:
  - đúng nhóm;
  - đúng budget nếu có;
  - phù hợp use-case;
  - inventory;
  - lịch sử nếu là follow-up;
  - không kéo sản phẩm khác nhóm khi không có lý do.
- Không tự bịa sản phẩm ngoài catalog.

### Business RAG Agent

- Dùng embedding + Qdrant + rerank + knowledge DB.
- Phục vụ:
  - cửa hàng;
  - đổi trả;
  - bảo hành;
  - hậu mãi;
  - khuyến mãi;
  - giao hàng;
  - lắp đặt;
  - khiếu nại;
  - quy trình CSKH.
- Trả về doc evidence, trust level, đoạn căn cứ ngắn, answer brief.

### Cart Agent

- Trước add/remove/update phải resolve đúng product entity.
- Với guest phải xử lý đúng auth block và vẫn tư vấn được.
- Với thao tác rủi ro như clear cart phải có confirm.
- Không được thêm/xóa sai sản phẩm vì history lệch.

### Evaluator Agent

- Gate cuối bắt buộc trước response.
- Fail nếu:
  - trả lời không đúng câu hỏi chính;
  - product rail sai nhóm/ngân sách/lịch sử;
  - sản phẩm trong text khác product rail;
  - business answer không có RAG evidence;
  - cart state/tool result không khớp;
  - hỏi lại quá sớm dù có thể tự xử lý;
  - off-topic bị trả lời lan man ngoài cửa hàng;
  - có bịa dữ liệu ngoài catalog/knowledge/cart.
- Khi fail:
  - yêu cầu lead chạy thêm agent/tool nếu còn budget;
  - hoặc chặn và tạo response hỏi làm rõ ngắn, chỉ khi thiếu dữ liệu bắt buộc.

### Response Agent

- Nhận final contract từ lead.
- Trả lời tự nhiên, ngắn, đúng vai trò nhân viên CSKH/bán hàng.
- Không lộ agent/tool/pipeline.
- Không markdown phức tạp trong chat.
- Không nói "khung gợi ý" nếu không có product rail.

## Tiêu chuẩn pass mới

Một case chỉ pass khi đạt tất cả điều kiện áp dụng:

- Trả lời đúng câu hỏi chính.
- Nếu có sản phẩm: product rail đúng nhóm, đúng budget nếu có, đúng lịch sử nếu là follow-up.
- Nếu không có sản phẩm chính xác: nói rõ chưa có và gợi ý sản phẩm liên quan nhất, có lý do.
- Nếu là nghiệp vụ: trả lời dựa trên RAG nội bộ, không nói chung chung.
- Nếu là giỏ hàng: thao tác đúng entity, đúng số lượng, đúng trạng thái đăng nhập.
- Nếu câu lan man/ngáo/ngắn: vẫn dẫn dắt tự nhiên, không từ chối cụt.
- Nếu off-topic: kéo về phạm vi cửa hàng lịch sự, không trả lời lan man ngoài nghiệp vụ.
- Nếu thiếu thông tin bắt buộc: hỏi làm rõ, nhưng phải đưa hướng tạm thời nếu có đủ dữ liệu; hỏi lại là thiểu số.

## Benchmark 1000 câu

### Nhóm test bắt buộc

- Hội thoại dài 15-30 lượt: đổi ý, quay lại sản phẩm cũ, "cái đó", "mẫu trên", "món rẻ hơn".
- Tìm bằng mã, tên sai chính tả, tên gần đúng, thương hiệu + ngân sách + thuộc tính.
- Câu cực dài nhiều ý nhiễu: sản phẩm + bảo hành + giao hàng + khiếu nại.
- Không liên quan hoàn toàn, phá rối, nói lan man rồi quay lại mua hàng.
- Semantic grading: đúng nhóm, budget, history, cart state; không chỉ kiểm product_list.
- RAG nghiệp vụ: đổi trả, bảo hành, thiếu phụ kiện, giao trễ, lắp đặt, khuyến mãi, hậu mãi, khiếu nại.
- Memory: nhớ nhu cầu, sản phẩm đã đề xuất, món trong giỏ; không bịa khi thiếu dữ liệu.
- Vai khách mới, khách cũ, người không biết gì, người khó tính, người phá rối.

### Nguyên tắc chạy

- Chạy từng câu hoặc batch nhỏ, delay giữa request để tránh sập LLM/embed/rerank.
- Sau mỗi fix lớn phải đổi seed/case set 1000 câu mới cùng chuẩn, rồi chạy lại từ đầu.
- Lưu report đầy đủ nhưng không lưu cookie/token/secret.
- Case pass ảo phải sửa evaluator trước, không sửa riêng câu hỏi.

## Thứ tự triển khai

1. Đóng băng phạm vi sửa: đọc các điểm nối cần thiết, không audit lan man.
2. Thêm model/service task blackboard bằng DB/Redis theo pattern hiện có.
3. Nâng orchestrator thành lead loop có ngân sách, dùng registry hiện tại làm allowlist agent/tool.
4. Chuẩn hóa tool contract cho history/search/recommend/RAG/cart/evaluator/response.
5. Siết product search/recommend và history entity resolution.
6. Siết business RAG evidence và support answer brief.
7. Siết cart entity verification.
8. Siết evaluator semantic và benchmark grader.
9. Cập nhật dashboard trace để hiển thị blackboard step/evidence/verdict.
10. Tạo/generate bộ 1000 câu thực chiến và runner chạy nhẹ.
11. Chạy validation: typecheck, API test, web typecheck, setup, benchmark.
12. Dọn code cũ không dùng, cập nhật docs/logs/README nếu ảnh hưởng cách dùng.

## Rủi ro và cách tránh

- Rủi ro làm loạn pipeline: chỉ sửa qua service/contract rõ, không nhét logic rời rạc vào controller.
- Rủi ro DB rỗng: migration additive, không reset, seed chỉ upsert.
- Rủi ro dashboard vỡ: giữ trace fields cũ, thêm field mới theo optional.
- Rủi ro LLM quá tải: benchmark delay, timeout, resume checkpoint không chứa secret.
- Rủi ro pass ảo: grader phải kiểm semantic/output evidence, không chỉ intent/block.
- Rủi ro regex tràn lan: parser nhỏ chỉ dùng cho số tiền, SKU, diện tích, số lượng; quyết định nghiệp vụ nằm ở agent/tool/evaluator.

## Definition of Done

- Pipeline runtime có lead loop + blackboard + evaluator semantic bắt buộc.
- Agent/tool outputs có structured contract.
- Dashboard hiển thị được flow mới và không vỡ flow cũ.
- Bộ 1000 câu thực chiến chạy hoàn tất theo tiêu chuẩn pass mới.
- Không còn case pass ảo rõ ràng trong report cuối.
- Typecheck/test chính pass.
- Docs/logs cập nhật, plan chuyển sang `finished`.

## Kết quả triển khai

- Đã thêm task blackboard DB/Redis, event/evidence cho runtime và trace dashboard.
- Đã siết catalog search/recommend không dùng embedding/rerank, bổ sung related-family cho nhu cầu gần đúng và follow-up.
- Đã siết Business RAG dùng embedding/Qdrant/rerank kèm keyword recovery có evidence.
- Đã siết evaluator/grader cho semantic product/history/cart/policy/off-topic/noisy.
- Đã thêm generator benchmark 1000 câu và runner chạy batch nhẹ có checkpoint.
- Validation cuối:
  - `corepack pnpm --filter '@retail-agent/api' typecheck`: pass.
  - `corepack pnpm --filter '@retail-agent/web' typecheck`: pass.
  - `corepack pnpm --filter '@retail-agent/api' test`: 121/121 pass.
  - `SKIP_DOCKER=1 ./setup.ps1`: pass, API 3110/Web 3100.
  - Benchmark seed `2026053026`: 1000/1000 pass, warn 0, fail 0.
