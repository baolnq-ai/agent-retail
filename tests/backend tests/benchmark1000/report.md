# Báo Cáo Phương Pháp Benchmark1000 Backend Chatbot Retail

- Ngày lập báo cáo: 31-05-2026
- Đối tượng đánh giá: pipeline chatbot retail đa tác tử của RetailHome
- Dữ liệu kiểm thử: request thật vào API, catalog/DB/model thật theo môi trường chạy
- Vị trí evidence: `tests/backend tests/benchmark1000/`

## Tóm Tắt

Benchmark1000 được thiết kế để đánh giá chatbot như một tổng đài bán hàng và chăm sóc khách hàng. Trọng tâm không phải là số lượng câu đơn lẻ, mà là độ đúng của hành vi trong bối cảnh hội thoại thật: khách hỏi thiếu thông tin, dùng từ sai, hỏi theo sản phẩm vừa nhắc, yêu cầu thao tác giỏ hàng, hỏi chính sách hoặc nói chuyện ngoài phạm vi rồi quay lại mua hàng.

Một case không được xem là đạt nếu chỉ có response không lỗi. Case chỉ đạt khi câu trả lời đúng mục tiêu khách hàng, dữ liệu sản phẩm/policy/cart có evidence, pipeline gọi đúng agent/tool, và response không lộ cơ chế nội bộ.

Ghi chú giới hạn: Benchmark1000 là bộ hồi quy có kiểm soát, không phải bằng chứng rằng chatbot đã mượt trong mọi hội thoại người dùng thật. Bộ test có thể bắt lỗi rõ ràng về product rail, policy, cart, history và trace, nhưng vẫn cần bổ sung case từ log thực tế, nhất là câu dài có nhiều sản phẩm, câu so sánh, follow-up “cái đó/mẫu trên” sau nhiều lượt và tình huống đổi ý liên tục.

## Kiến Trúc Đang Được Kiểm Thử

Pipeline hiện tại gồm các lớp chính:

1. Lead Orchestrator đọc câu user, lập mục tiêu và điều phối.
2. Task Blackboard lưu trạng thái của một lượt xử lý: mục tiêu, giả thuyết, tool calls, evidence và quyết định.
3. History Agent truy xuất lịch sử khi lead hoặc agent khác cần ngữ cảnh cụ thể.
4. Catalog Search Agent tìm sản phẩm bằng catalog thật, keyword/facet/SKU/brand/category/budget, không dùng embedding/rerank.
5. Recommendation Agent chọn product rail từ candidate hợp lệ, kiểm tra nhu cầu, ngân sách, tồn kho và liên quan gần nhất.
6. Business RAG Agent dùng embedding, Qdrant và rerank cho tài liệu nghiệp vụ nội bộ.
7. Cart Agent thao tác giỏ hàng qua tool riêng, bắt buộc xác thực entity sản phẩm trước khi mutate.
8. Evaluator Agent kiểm tra đáp án cuối có đúng ý, đúng product rail, đúng policy/cart/history và không bịa.
9. Response Agent viết câu trả lời tự nhiên như nhân viên, không lộ pipeline.

## Thiết Kế Bộ Câu Hỏi

| Lớp kiểm thử | Tình huống đại diện | Rủi ro cần bắt |
| --- | --- | --- |
| Hội thoại dài | 15-30 lượt, đổi ý, quay lại món cũ | Quên lịch sử, nhầm “cái đó”, lẫn sản phẩm trong giỏ |
| Search sản phẩm | Sai chính tả, mã gần đúng, brand + budget | Trả sản phẩm không cùng nhóm, vượt ngân sách, dùng fallback mơ hồ |
| Recommendation | Không có sản phẩm chính xác, cần gần nhất | Đề xuất lung tung, không nêu lý do liên quan |
| Business RAG | Bảo hành, thiếu phụ kiện, đổi trả, giao trễ | Trả lời chung chung, thiếu nguồn nội bộ, lẫn sản phẩm với policy |
| Cart | Add/remove/update/clear, guest/auth, pending confirmation | Mutate sai entity, sai số lượng, bỏ qua đăng nhập |
| Off-topic | Chọc phá, hỏi ngoài nghiệp vụ, quay lại mua hàng | Trả lời lan man ngoài phạm vi hoặc từ chối cụt |
| Dashboard | Trace sau từng request | Thiếu node/edge/tool result khiến không debug được |

## Tiêu Chí Pass

Một case chỉ pass khi thỏa đồng thời các điều kiện liên quan:

- Trả lời đúng câu hỏi chính của khách.
- Nếu có product rail: sản phẩm đúng nhóm, đúng budget nếu có, đúng lịch sử nếu là follow-up.
- Nếu catalog không có sản phẩm chính xác: nói rõ chưa có và gợi ý sản phẩm liên quan nhất, có lý do.
- Nếu là nghiệp vụ: câu trả lời dựa trên Business RAG nội bộ, có context document và blackboard evidence.
- Nếu là giỏ hàng: thao tác đúng entity, đúng số lượng, đúng trạng thái đăng nhập.
- Nếu câu lan man/ngắn/ngáo: dẫn dắt tự nhiên về phạm vi cửa hàng.
- Nếu off-topic: kéo về cửa hàng lịch sự, không trả lời dài ngoài nghiệp vụ.
- Nếu thiếu thông tin bắt buộc: hỏi làm rõ ngắn, nhưng vẫn đưa hướng tạm thời khi dữ liệu đủ.
- Dashboard trace có agent/node/edge/playback phù hợp để truy vết.

## Cách Đọc Kết Quả

Runner sinh hai loại artifact:

- JSON chứa toàn bộ response thật, block types, product ids, policy ids, cart summary, flow trace và issue codes.
- Markdown report cho người đọc nhanh: tổng pass/warn/fail, latency, lỗi nổi bật và bảng từng case.

Khi một case fail, thứ tự đọc khuyến nghị:

1. `issues` để biết fail do semantic, policy, cart, history hay trace.
2. `textPreview` và `blocks` để kiểm tra câu trả lời user thấy.
3. `productIds`, `policyIds`, `cart` để kiểm tra entity/evidence.
4. `flow` để biết agent/tool nào thiếu hoặc gọi sai.
5. Dashboard `/agent-dashboard` để xem node/edge/playback trực quan.

## Kết Luận

Benchmark1000 là bộ kiểm tra hồi quy chính cho pipeline chatbot retail. Bộ này thay thế các benchmark 20/30/100 câu cũ trong thư mục `tests/`. Các test cũ đã được dọn để tránh nhiễu evidence; mọi vòng tối ưu pipeline mới phải cập nhật tại thư mục này.

Kết luận này không che rủi ro hiện tại: pipeline mới tốt hơn để đo và debug, nhưng chất lượng hội thoại thực tế vẫn phụ thuộc vào History Agent, Evaluator và vòng kiểm tra recommendation. Khi gặp lỗi ngoài bộ test, phải đưa lỗi đó thành case mới, không vá bằng regex hoặc fallback riêng cho một câu.
