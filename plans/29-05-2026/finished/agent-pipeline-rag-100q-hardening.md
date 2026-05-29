# Plan: Agent pipeline RAG 100Q hardening

Ngày: 29-05-2026

## Mục tiêu

- Sửa pipeline chatbot để hiểu câu hỏi người dùng tự nhiên, sai chính tả, thiếu ngữ cảnh, hỏi lan man, hỏi theo mã/tên sản phẩm, hỏi chính sách và follow-up liên tục.
- Tách đúng vai trò:
  - Product search/recommend dùng keyword, family, facet, memory và kiểm tra liên quan.
  - Business RAG dùng embedding, Qdrant, rerank và tài liệu nghiệp vụ cửa hàng.
  - Lead/quality gate kiểm tra câu trả lời thô, sai ngữ cảnh, đề xuất lệch ngành.
- Soạn và chạy đủ 100 câu hỏi thực tế, chạy chậm để không làm sập LLM server.
- Mỗi vòng sửa phải chạy lại bộ 100 câu từ đầu, lưu evidence.
- Sau cùng typecheck/test, scan secret, commit và push GitHub.

## Checklist triển khai

1. Đọc skill và rà trạng thái worktree.
2. Tái hiện lỗi thật: quạt điều hòa 24m2, tìm theo tên/mã, chính sách bảo hành, follow-up giỏ hàng.
3. Rà pipeline hiện tại: user analysis, search agent, product manager, recommendation, business RAG, quality gate, memory/history.
4. Bổ sung hoặc sửa tool/prompt/logic theo nguyên nhân gốc, không hardcode riêng từng câu.
5. Soạn hoặc cập nhật bộ 100 câu hỏi user thực tế có scoring rõ ràng.
6. Chạy benchmark 100 câu chậm, có checkpoint/report.
7. Nếu fail do pipeline, sửa nguyên nhân gốc rồi chạy lại từ câu 1 tới 100.
8. Cập nhật docs/logs/test report.
9. Chạy validation cuối: unit/service test, typecheck, request thật quan trọng.
10. Scan secret, stage đúng file, commit và push.

## Tiêu chí đạt

- Product request không đề xuất sản phẩm lệch ngành như nồi/chảo khi hỏi máy lạnh, máy lọc, nồi cơm.
- Khi không có đúng sản phẩm, bot nói rõ không có và gợi ý nhóm gần nhất hợp lý trong catalog.
- Business/policy request trả lời đúng nguồn nội bộ, không nói thừa lan man.
- Follow-up không quên ngữ cảnh gần nhất.
- Report 100 câu có pass/fail và evidence lưu trong `tests/benchmark-100/reports`.
