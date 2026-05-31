# Backend Docs

- Cập nhật: 31-05-2026
- Phạm vi: tài liệu backend đang chạy trong `apps/api`.

## Cập Nhật Mới

| Ngày | Nội dung |
| --- | --- |
| 2026-05-31 | Benchmark1000 chatbot retail đặt đúng chuẩn backend-skill tại [tests/backend tests/benchmark1000](<../../tests/backend tests/benchmark1000/README.md>). |
| 2026-05-31 | Ghi rõ giới hạn hiện tại: pipeline có evidence tốt trên Benchmark1000 nhưng vẫn cần harden dài phiên/history/entity trước production. |
| 2026-05-31 | Dev infra compose bỏ bind mount nginx template để setup chạy ổn trên Windows path có dấu cách. |
| 2026-05-31 | Agent pipeline docs được cập nhật theo kiến trúc hiện tại: product search cứng, Business RAG dùng embedding/rerank. |

## Service Hiện Có

| Service | Vai trò | Source |
| --- | --- | --- |
| Auth | Đăng ký, đăng nhập, session cookie HttpOnly | `apps/api/src/services/auth.service.ts` |
| Commerce | Catalog, cart, order-facing API cho storefront và agent | `apps/api/src/services/commerce.service.ts` |
| Agent pipeline | Điều phối lead, blackboard, history, search, recommendation, RAG, cart, evaluator, response | `apps/api/src/services/agent.service.ts` |
| Model gateway | Gọi chat, embedding và rerank qua cấu hình env | `apps/api/src/services/model-gateway.service.ts` |
| Storage memory | Lưu và đọc memory đã redact theo user/session | `apps/api/src/services/agents/storage-memory-agent.service.ts` |

## Tài Liệu Service

| Tài liệu | Nội dung |
| --- | --- |
| [benchmark1000-chatbot-retail.md](benchmark1000-chatbot-retail.md) | Benchmark1000 backend cho chatbot retail, tiêu chí pass và evidence hiện tại |
| [business-rag-agent.md](business-rag-agent.md) | Business RAG dùng embedding, Qdrant và rerank cho tài liệu nghiệp vụ |
| [agent-pipeline-rag-100q.md](agent-pipeline-rag-100q.md) | Hardening pipeline chatbot/RAG/search bằng benchmark thực tế |
| [redis-catalog-cache-20260529.md](redis-catalog-cache-20260529.md) | Redis catalog cache cho storefront/search |
| [source-clean.md](source-clean.md) | Clean source backend theo skill và validation liên quan |

## Validation Mới Nhất

| Ngày | Kết quả |
| --- | --- |
| 2026-05-31 | `.\setup.ps1` pass ở chế độ hidden: Docker provider, Prisma, API, Web và nginx proxy đều lên. |
| 2026-05-31 | `docker compose -f infra/docker/docker-compose.yml config --quiet` pass. |
| 2026-05-31 | Benchmark1000 generator/runner `node --check` pass; generator tạo 1000 case seed `20260531`. |

## Giới Hạn Hiện Tại

Benchmark1000 là bộ hồi quy chính, nhưng chưa đủ để kết luận chatbot đã mượt như nhân viên thật trong mọi phiên dài. Rủi ro còn lại tập trung ở:

- Follow-up dài phiên: “cái đó”, “mẫu trên”, “món rẻ hơn” sau nhiều lượt vẫn có thể lệch entity nếu history evidence không được nạp đúng lúc.
- Câu nhiều ý trong một lần chat: so sánh sản phẩm, hỏi bảo hành và yêu cầu thêm giỏ cùng lúc cần evaluator siết hơn.
- Recommendation ngoài bộ test: catalog search cứng giảm lỗi embedding/rerank, nhưng vẫn cần loop kiểm tra liên quan gần nhất tốt hơn khi không có đúng loại hàng.
- Trải nghiệm hội thoại: benchmark pass không đồng nghĩa tương tác thực tế đã tự nhiên; cần tiếp tục test bằng phiên người dùng thật và dashboard trace.

## Quy Tắc Bảo Trì

- Config nhạy cảm đọc từ `.env` hoặc `.env.example`, không hardcode trong service.
- Runtime test thật nằm trong `apps/api/tests/runtime-*.mjs`; benchmark tổng hợp đặt dưới `tests/backend tests/benchmark1000/`.
- Product search không dùng embedding/rerank; Business RAG mới dùng embedding/rerank.
- Khi thêm service backend mới, cập nhật bảng service, docs và log triển khai tương ứng.
