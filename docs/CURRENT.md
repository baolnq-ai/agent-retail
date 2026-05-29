# Current Documentation Index

- Cập nhật: 2026-05-29 00:00 +07:00
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
| 2026-05-29 | [backend/setup-port-3100-3150](<../tests/backend tests/setup-port-3100-3150/README.md>), [frontend/setup-port-3100-3150](<../tests/frontend tests/setup-port-3100-3150/README.md>) | Setup chạy bằng port 3100-3150, nginx không còn 502 |
| 2026-05-29 | [setup-port-process-cleanup](<../tests/backend tests/setup-port-process-cleanup/README.md>) | Setup/stop PowerShell tự dọn process/port cũ, skip Docker-owned process |
| 2026-05-29 | [backend/source-clean](<../tests/backend tests/source-clean/README.md>), [frontend/source-clean](<../tests/frontend tests/source-clean/README.md>) | Clean source theo skill, validation backend/frontend/build/compose pass |
| 2026-05-28 | [docker-full-compose-evidence-2026-05-28](../tests/docker-full-compose-evidence-2026-05-28/README.md) | Root Docker Compose chạy full stack từ Docker Hub, API/Web/dashboard/cart hoạt động |
| 2026-05-27 | [benchmark-100](../tests/benchmark-100/) | Benchmark chatbot 100 câu, kiểm tra pipeline/cart/history |
| 2026-05-26 | [dashboard-line-animation-evidence-2026-05-26](../tests/dashboard-line-animation-evidence-2026-05-26/README.md) | Dashboard animation line/hạt và kiểm tra video/screenshot |
| 2026-05-26 | [agent-dashboard-icon-legend-density-evidence-2026-05-26](../tests/agent-dashboard-icon-legend-density-evidence-2026-05-26/README.md) | Dashboard icon, legend, mật độ node và flow |

## Tài Liệu Lịch Sử

| Folder | Ý nghĩa |
| --- | --- |
| `implementation/` | Ghi chú triển khai theo phase, một phần là lịch sử |
| `reports/` | Báo cáo audit, readiness, summary |
| `agent-pipeline/legacy/` | Ghi chú sales pipeline cũ để đối chiếu |

## Quy Tắc Bảo Trì

- Cập nhật file này khi có doc/evidence mới trở thành nguồn tham chiếu chính.
- Không copy raw runtime log vào docs; chỉ link tới log/evidence cần đọc.
