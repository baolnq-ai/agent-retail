# Index Plan

- Cập nhật: 2026-05-29
- Phạm vi: kế hoạch theo phase của dự án RetailHome AI Agent.

## Nên Đọc Trước

| Tài liệu | Nội dung |
| --- | --- |
| [CURRENT.md](CURRENT.md) | Việc đang chạy, việc vừa đóng, log và evidence liên quan |
| [running/README.md](running/README.md) | Plan đang chạy hoặc vừa ghi nhận gần đây |
| [../README.md](../README.md) | Tổng quan kỹ thuật và cách chạy dự án |

## Cấu Trúc

| Path | Nội dung |
| --- | --- |
| `running/` | Plan đang chạy hoặc task mới cần theo dõi gần |
| `agent-pipeline/` | Plan rebuild chatbot pipeline |
| `backend/` | Plan backend/data |
| `frontend/` | Plan frontend/UI |
| `platform/` | Plan model integration, Docker, runtime, hardening |
| `archive/initial-roadmap/` | Roadmap lịch sử |

## Việc Gần Đây

| Plan | Nội dung |
| --- | --- |
| [29-05-2026/finished/setup-port-range-3100-3150.md](29-05-2026/finished/setup-port-range-3100-3150.md) | Chuyển setup/runtime sang port 3100-3150 và fix 502 |
| [29-05-2026/finished/setup-port-process-cleanup.md](29-05-2026/finished/setup-port-process-cleanup.md) | Sửa setup/stop tự clear process và port cũ của dự án |
| [29-05-2026/finished/skill-reload-follow-up.md](29-05-2026/finished/skill-reload-follow-up.md) | Reload skill mới và sửa lại path docs/log/evidence |
| [29-05-2026/finished/source-clean-skill-alignment.md](29-05-2026/finished/source-clean-skill-alignment.md) | Clean source theo skill và validation lại repo |
| [plan-docs-readme-sync-and-release-push-20260528-v1.md](plan-docs-readme-sync-and-release-push-20260528-v1.md) | Đồng bộ README/docs/logs/plans và push GitHub |
| [running/plan-benchmark-100-pipeline-audit-20260527-v1.md](running/plan-benchmark-100-pipeline-audit-20260527-v1.md) | Benchmark 100 câu và audit pipeline/cart/history |
| [plan-frontend-branding-dashboard-prompt-20260526-v1.md](plan-frontend-branding-dashboard-prompt-20260526-v1.md) | Branding, logo, dashboard, prompt settings |
| [running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md](running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md) | nginx Docker Compose và tunnel một cổng |
| [running/plan-agent-dashboard-icon-legend-density-20260526-v1.md](running/plan-agent-dashboard-icon-legend-density-20260526-v1.md) | Dashboard icon/legend/density và benchmark flow |
| [plan-agent-dashboard-cluster-flow-20260526-v1.md](plan-agent-dashboard-cluster-flow-20260526-v1.md) | Dashboard graph cluster flow |

## Quy Tắc

- Task mới tạo plan trong `plans/running/`.
- Khi task hoàn thành, chuyển plan ra thư mục phù hợp hoặc root `plans/` theo convention hiện tại.
- Plan quan trọng phải có doc/log/evidence liên kết chéo.
- Khi hoàn thành, cập nhật trạng thái và index liên quan.
- Không mô tả chức năng chưa có trong source.
