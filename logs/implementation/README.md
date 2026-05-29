# Implementation Log Index

- Cập nhật: 2026-05-29
- Phạm vi: log triển khai code/UI/runtime của dự án.

## Log Hiện Tại

| Log | Nội dung |
| --- | --- |
| [setup-port-range-3100-3150-20260529.md](setup-port-range-3100-3150-20260529.md) | Chuyển setup/runtime sang port 3100-3150 và fix 502 |
| [setup-port-process-cleanup-20260529.md](setup-port-process-cleanup-20260529.md) | Sửa setup/stop clear process cũ và port dự án |
| [source-clean-skill-alignment-20260529.md](source-clean-skill-alignment-20260529.md) | Clean source theo skill, tests/benchmark và validation |
| [readme-banner-ci-polish-20260528.md](readme-banner-ci-polish-20260528.md) | Làm lại banner GIF, polish README và sửa CI |
| [docs-readme-sync-and-release-push-20260528.md](docs-readme-sync-and-release-push-20260528.md) | Đồng bộ README/docs/logs/plans và push GitHub |
| [docker-hub-multiarch-compose-20260528.md](docker-hub-multiarch-compose-20260528.md) | Đóng gói Docker Hub multi-arch và Compose một file |
| [setup-linux-tmux-port-cleanup-20260527.md](setup-linux-tmux-port-cleanup-20260527.md) | Setup Linux/tmux, port 6800-6850 và cleanup source |
| [benchmark-100-pipeline-audit-20260527.md](benchmark-100-pipeline-audit-20260527.md) | Benchmark 100 câu, pipeline/cart/history |
| [frontend-branding-dashboard-prompt-20260526.md](frontend-branding-dashboard-prompt-20260526.md) | Branding, dashboard, prompt settings |

## Log Lịch Sử

Các log phase cũ trong folder này ghi lại mốc triển khai trước đó. Dùng `docs/`, `plans/CURRENT.md` và README gốc làm hướng dẫn vận hành hiện tại.

## Format

Mỗi log mới nên có ngày, phạm vi, file đã sửa, command verify, kết quả và rủi ro còn lại. Không ghi secret hoặc nội dung `.env`.
