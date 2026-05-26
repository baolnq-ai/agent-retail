# Index Tài Liệu

- Cập nhật: 2026-05-26
- Phạm vi: tài liệu kỹ thuật của dự án RetailHome AI Agent.

## Nên Đọc Trước

| Tài liệu | Nội dung |
| --- | --- |
| [../README.md](../README.md) | Tổng quan dự án, cách chạy, port, nginx tunnel, API, test |
| [CURRENT.md](CURRENT.md) | Map tài liệu hiện tại và evidence mới nhất |
| [../plans/CURRENT.md](../plans/CURRENT.md) | Plan đang chạy hoặc vừa đóng |
| [../logs/CURRENT.md](../logs/CURRENT.md) | Log task mới nhất |

## Kiến Trúc Và Vận Hành

| Tài liệu | Nội dung |
| --- | --- |
| [core/architecture.md](core/architecture.md) | Kiến trúc hệ thống, service, persistence, auth, model runtime |
| [core/operations.md](core/operations.md) | Setup/stop/clean, port, Docker Compose, log vận hành |
| [core/development.md](core/development.md) | Workflow local, script, test, checklist phát triển |
| [core/ci-cd.md](core/ci-cd.md) | CI/CD và checklist trước khi push |

## Agent Pipeline

| Tài liệu | Nội dung |
| --- | --- |
| [agent-pipeline/README.md](agent-pipeline/README.md) | Index tài liệu agent pipeline |
| [agent-pipeline/architecture/system-definition.md](agent-pipeline/architecture/system-definition.md) | Định nghĩa kiến trúc agent mới |
| [agent-pipeline/legacy/current-sales-pipeline.md](agent-pipeline/legacy/current-sales-pipeline.md) | Pipeline chatbot hiện tại |
| [reports/chatbot-pipeline-audit-report.md](reports/chatbot-pipeline-audit-report.md) | Audit gap pipeline và hướng nâng cấp |

## Task Quan Trọng

| Tài liệu | Nội dung |
| --- | --- |
| [task/agent-dashboard-cluster-flow-20260526-v1.md](task/agent-dashboard-cluster-flow-20260526-v1.md) | Logic dashboard agent, node/edge/flow |
| [task/setup-terminal-tmux-run-guide-20260526-v1.md](task/setup-terminal-tmux-run-guide-20260526-v1.md) | Cách setup hiển thị service, terminal và log |
| [task/nginx-tunnel-compose-20260526-v1.md](task/nginx-tunnel-compose-20260526-v1.md) | Thêm nginx Docker Compose để tunnel một cổng |
| [task/skill-format-audit-20260526-v1.md](task/skill-format-audit-20260526-v1.md) | Audit format plan/doc/log/test |

## Báo Cáo Và Evidence

| Tài liệu | Nội dung |
| --- | --- |
| [reports/production-architecture-audit-20260526.md](reports/production-architecture-audit-20260526.md) | Audit Docker, DB, vector search, ảnh và readiness production |
| [reports/provider-source-hub-readiness-checklist.md](reports/provider-source-hub-readiness-checklist.md) | Checklist provider source readiness |
| [../test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/README.md](../test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/README.md) | Benchmark 20 câu khó và audit flow |
| [../test/agent-dashboard-icon-legend-density-evidence-2026-05-26/README.md](../test/agent-dashboard-icon-legend-density-evidence-2026-05-26/README.md) | Evidence dashboard icon/legend/flow |

## Quy Tắc

- Viết tiếng Việt có dấu, ngắn và đúng source hiện tại.
- Không copy secret, token, cookie hoặc nội dung `.env`.
- Mỗi task quan trọng cần có plan, log, doc và evidence liên kết chéo.
- Khi thay đổi port, setup, Docker Compose hoặc API contract, cập nhật README gốc cùng task.
