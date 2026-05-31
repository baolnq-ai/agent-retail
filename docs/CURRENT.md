# Current Documentation Index

- Cập nhật: 2026-05-31 13:45 +07:00
- Mục đích: map nhanh tài liệu hiện tại và evidence mới nhất.

## Đọc Trước

| Nhu cầu | File | Ghi chú |
| --- | --- | --- |
| Trạng thái việc hiện tại | [../plans/CURRENT.md](../plans/CURRENT.md) | Xem plan vừa đóng, việc còn mở và evidence |
| Hướng dẫn chạy dự án | [../README.md](../README.md) | Docker/source, port, API, test |
| Kiến trúc hệ thống | [core/architecture.md](core/architecture.md) | Tổng quan service, persistence, agent runtime |
| Vận hành local | [core/operations.md](core/operations.md) | Setup, stop, clean, runtime log |
| Agent pipeline | [agent-pipeline/README.md](agent-pipeline/README.md) | Tài liệu pipeline agent |

## Evidence Mới Nhất

| Thời gian | Evidence | Nội dung chứng minh |
| --- | --- | --- |
| 2026-05-31 | [benchmark1000](<../tests/backend tests/benchmark1000/README.md>) | Benchmark1000 backend chatbot retail; test cũ đã dọn khỏi thư mục `tests/` |
| 2026-05-31 | [backend/benchmark1000-chatbot-retail.md](backend/benchmark1000-chatbot-retail.md) | Ghi rõ pipeline hiện tại và known gaps: Benchmark1000 tốt cho hồi quy nhưng chưa đủ chứng nhận hội thoại thật |

## Tài Liệu Lịch Sử

| Folder | Ý nghĩa |
| --- | --- |
| `implementation/` | Ghi chú triển khai theo phase, một phần là lịch sử |
| `reports/` | Báo cáo audit, readiness, summary |
| `agent-pipeline/legacy/` | Ghi chú sales pipeline cũ để đối chiếu |

## Quy Tắc Bảo Trì

- Cập nhật file này khi có doc/evidence mới trở thành nguồn tham chiếu chính.
- Không copy raw runtime log vào docs; chỉ link tới log/evidence cần đọc.
