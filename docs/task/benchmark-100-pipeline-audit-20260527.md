# Benchmark 100 pipeline audit 2026-05-27

Tài liệu này ghi phạm vi, tiêu chí và kết quả kiểm thử pipeline chatbot retail bằng benchmark thật 100 câu. Thư mục report chính là `tests/benchmark-100`.

## Điều cần chứng minh

- Chatbot trả lời đúng nhu cầu mua sắm, không dư, không thiếu và không lộ thông tin nội bộ.
- Pipeline đi đúng logic agent: Lead điều phối, Memory/History xử lý ngữ cảnh, Search/RAG/Cart/Recommendation/Sales/Security/Support chạy đúng việc.
- Tool code thật được dùng đúng vai trò: đọc/ghi memory, resolve history, tìm catalog, rerank, cart get/add/update/remove, RAG policy và security review.
- Các câu follow-up như “thêm nó vào giỏ”, “so sánh cái ở trên”, “thêm phương án ít khoan đục nhất” dùng lịch sử thật thay vì đoán lại từ prompt hiện tại.

## Nhóm case

- Tìm sản phẩm theo nhu cầu mơ hồ, cụ thể và nhiều ràng buộc.
- So sánh sản phẩm theo tên, theo lịch sử và theo tiêu chí.
- Hỏi chi tiết sản phẩm, ưu/nhược điểm, độ phù hợp.
- Thêm/xóa/cập nhật số lượng/xem tổng tiền giỏ hàng.
- Follow-up phụ thuộc lịch sử gần.
- Chính sách đổi trả, bảo hành, giao hàng, hoàn tiền, khiếu nại.
- Nhiễu, sai chính tả, off-topic, prompt injection, yêu cầu không được phép.
- Guest/auth để kiểm tra giới hạn thao tác ghi.

## Kết quả hiện tại

- Run chính: `variant-a-full-100-final-v5`
- Kết quả: `100 pass, 0 warn, 0 fail / 100`
- Avg/p95 latency: `3543/9650 ms`
- Report: `tests/benchmark-100/reports/variant-a-full-100-final-v5-results.json`

## Kết luận kỹ thuật

Pipeline hiện đã ổn cho variant A sau các patch trong ngày 2026-05-27. Các điểm rủi ro đã được chặn gồm: LLM override sai intent compare/detail, safety bị kéo sang recommend, cart tự thêm sản phẩm thay thế khi target không tồn tại, và cart status bị hiểu nhầm thành cart mutation.

Vòng tiếp theo nên tạo `variant-b.json` với 100 câu mới hoàn toàn để kiểm tra chống overfit như yêu cầu ban đầu.
