# Index Tài Liệu

- Cập nhật: 2026-05-31
- Phạm vi: tài liệu kỹ thuật của dự án RetailHome AI Agent.

## Nên Đọc Trước

| Tài liệu | Nội dung |
| --- | --- |
| [../README.md](../README.md) | Tổng quan dự án, cách chạy, Docker, port, API và test |
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
| [backend/README.md](backend/README.md) | Index service backend và validation mới nhất |
| [frontend/README.md](frontend/README.md) | Index module frontend và validation mới nhất |

## Agent Pipeline

| Tài liệu | Nội dung |
| --- | --- |
| [agent-pipeline/README.md](agent-pipeline/README.md) | Index tài liệu agent pipeline |
| [agent-pipeline/architecture/system-definition.md](agent-pipeline/architecture/system-definition.md) | Định nghĩa kiến trúc agent |
| [agent-pipeline/legacy/current-sales-pipeline.md](agent-pipeline/legacy/current-sales-pipeline.md) | Pipeline chatbot hiện tại |
| [reports/chatbot-pipeline-audit-report.md](reports/chatbot-pipeline-audit-report.md) | Audit gap pipeline và hướng nâng cấp |

## Task Quan Trọng

| Tài liệu | Nội dung |
| --- | --- |
| [task/readme-banner-ci-polish-20260528.md](task/readme-banner-ci-polish-20260528.md) | Làm lại banner GIF, polish README và sửa CI |
| [task/docker-hub-multiarch-compose-20260528.md](task/docker-hub-multiarch-compose-20260528.md) | Đóng gói Docker Hub multi-arch và Compose một file |
| [task/docs-readme-sync-and-release-push-20260528.md](task/docs-readme-sync-and-release-push-20260528.md) | Đồng bộ README/docs/logs/plans trước khi push |
| [task/source-clean-skill-alignment-20260529.md](task/source-clean-skill-alignment-20260529.md) | Clean source theo skill, chuẩn hóa test backend và config |
| [backend/benchmark1000-chatbot-retail.md](backend/benchmark1000-chatbot-retail.md) | Benchmark1000 backend chatbot retail và tiêu chí pass hiện tại |
| [task/setup-port-range-3100-3150-20260529.md](task/setup-port-range-3100-3150-20260529.md) | Chuyển setup/runtime sang port 3100-3150 và fix 502 |
| [task/setup-port-process-cleanup-20260529.md](task/setup-port-process-cleanup-20260529.md) | Sửa setup tự dọn process/port cũ của dự án |
| [task/setup-linux-tmux-port-cleanup-20260527.md](task/setup-linux-tmux-port-cleanup-20260527.md) | Setup Linux/tmux, port 6800-6850 và cleanup source |
| [task/benchmark-100-pipeline-audit-20260527.md](task/benchmark-100-pipeline-audit-20260527.md) | Benchmark 100 câu và audit pipeline |
| [task/frontend-branding-dashboard-prompt-20260526.md](task/frontend-branding-dashboard-prompt-20260526.md) | Branding, dashboard và prompt settings |
| [task/agent-dashboard-cluster-flow-20260526-v1.md](task/agent-dashboard-cluster-flow-20260526-v1.md) | Logic dashboard agent, node/edge/flow |
| [task/nginx-tunnel-compose-20260526-v1.md](task/nginx-tunnel-compose-20260526-v1.md) | Nginx Docker Compose để tunnel một cổng |

## Báo Cáo Và Evidence

| Tài liệu | Nội dung |
| --- | --- |
| [reports/production-architecture-audit-20260526.md](reports/production-architecture-audit-20260526.md) | Audit Docker, DB, Business RAG/vector và readiness production |
| [../tests/backend tests/benchmark1000/README.md](<../tests/backend tests/benchmark1000/README.md>) | Benchmark1000 backend chatbot retail theo chuẩn backend-skill |

## Quy Tắc

- Viết tiếng Việt có dấu, ngắn và đúng source hiện tại.
- Không copy secret, token, cookie hoặc nội dung `.env`.
- Khi thay đổi port, setup, Docker Compose, API contract hoặc Docker Hub tag, cập nhật README gốc cùng task.
