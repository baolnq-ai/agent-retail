# Index Log

- Cập nhật: 2026-05-26
- Phạm vi: log human-written và log runtime của dự án RetailHome AI Agent.

## Nên Đọc Trước

| Tài liệu | Nội dung |
| --- | --- |
| [CURRENT.md](CURRENT.md) | Log mới nhất và liên kết plan/evidence |
| [../plans/CURRENT.md](../plans/CURRENT.md) | Trạng thái plan |
| [../README.md](../README.md) | Cách chạy, port, nginx tunnel, test |

## Nhóm Log

| Path | Nội dung | Quy tắc |
| --- | --- | --- |
| `logs/implementation/*.md` | Log triển khai code/UI/runtime | Ghi file đổi, quyết định, verify |
| `logs/documentation/*.md` | Log tài liệu, format, README | Link về doc/plan liên quan |
| `logs/security/*.md` | Log audit security/production readiness | Ghi finding, risk và khuyến nghị |
| `logs/planning/agent-pipeline/` | Log planning agent pipeline | Giữ theo từng agent/phase |
| `logs/planning/archive/` | Log lịch sử | Không dùng cho task active mới |
| `logs/setup/*.log` | Log generated từ setup/stop/clean | Không sửa tay, không coi là source of truth |
| `logs/runtime/backend/*.log` | Log process API | Runtime artifact, không commit nếu có dữ liệu nhạy cảm |
| `logs/runtime/frontend/*.log` | Log process web | Runtime artifact, không commit nếu có dữ liệu nhạy cảm |

## Quy Tắc Ghi Log

- Viết tiếng Việt có dấu.
- Ghi thời gian, mục tiêu, file đã sửa, command verify, kết quả và rủi ro còn lại.
- Không paste output dài nếu không cần thiết.
- Không ghi password, cookie, token, private API key hoặc nội dung `.env`.
- Task lớn phải có log riêng trong đúng thư mục.
