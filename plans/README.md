# Index Plan

- Cập nhật: 2026-05-26
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
| [running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md](running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md) | nginx Docker Compose, README tiếng Việt, tunnel một cổng |
| [running/plan-agent-dashboard-icon-legend-density-20260526-v1.md](running/plan-agent-dashboard-icon-legend-density-20260526-v1.md) | Dashboard icon/legend/density và benchmark flow |
| [plan-agent-dashboard-cluster-flow-20260526-v1.md](plan-agent-dashboard-cluster-flow-20260526-v1.md) | Dashboard graph cluster flow |
| [plan-setup-terminal-tmux-run-guide-20260526-v1.md](plan-setup-terminal-tmux-run-guide-20260526-v1.md) | Setup/run workflow có terminal/tmux/log summary |
| [agent-pipeline/retail-chatbot-100q-agent-benchmark.md](agent-pipeline/retail-chatbot-100q-agent-benchmark.md) | Benchmark chatbot lớn |

## Quy Tắc

- Task mới tạo plan trong `plans/running/`.
- Plan quan trọng phải có doc/log/evidence liên kết chéo.
- Khi hoàn thành, cập nhật trạng thái và index liên quan.
- Không mô tả chức năng chưa có trong source.
