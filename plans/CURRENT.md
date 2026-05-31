# Current Project Work Index

- Cập nhật: 2026-05-31 00:00 +07:00
- Mục đích: trả lời nhanh việc mới nhất là gì, việc nào còn mở và evidence nằm ở đâu.

## Active Work

| Status | Item | Khu vực | Plan | Log | Evidence |
| --- | --- | --- | --- | --- | --- |
| in_progress | Benchmark1000 backend chatbot retail | Agent pipeline | [running/plan-benchmark-100-pipeline-audit-20260527-v1.md](running/plan-benchmark-100-pipeline-audit-20260527-v1.md) | [../logs/implementation/benchmark-100-pipeline-audit-20260527.md](../logs/implementation/benchmark-100-pipeline-audit-20260527.md) | [../tests/backend tests/benchmark1000](<../tests/backend tests/benchmark1000/README.md>) |
| in_progress | Dashboard icon/legend/density follow-up | Frontend dashboard | [running/plan-agent-dashboard-icon-legend-density-20260526-v1.md](running/plan-agent-dashboard-icon-legend-density-20260526-v1.md) | [../logs/implementation/agent-dashboard-icon-legend-density-20260526-v1.md](../logs/implementation/agent-dashboard-icon-legend-density-20260526-v1.md) | [../docs/task/agent-dashboard-cluster-flow-20260526-v1.md](../docs/task/agent-dashboard-cluster-flow-20260526-v1.md) |
| in_progress | nginx/dev compose follow-up | Platform | [running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md](running/plan-nginx-tunnel-compose-readme-sync-20260526-v1.md) | [../logs/implementation/nginx-tunnel-compose-20260526-v1.md](../logs/implementation/nginx-tunnel-compose-20260526-v1.md) | [../docs/task/nginx-tunnel-compose-20260526-v1.md](../docs/task/nginx-tunnel-compose-20260526-v1.md) |

## Latest Closed Work

| Thời gian | Status | Item | Khu vực | Plan | Log | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-29 | completed | Chuyển setup/runtime sang port 3100-3150 và fix 502 | Setup/Platform | [29-05-2026/finished/setup-port-range-3100-3150.md](29-05-2026/finished/setup-port-range-3100-3150.md) | [../logs/implementation/setup-port-range-3100-3150-20260529.md](../logs/implementation/setup-port-range-3100-3150-20260529.md) | [../docs/task/setup-port-range-3100-3150-20260529.md](../docs/task/setup-port-range-3100-3150-20260529.md) |
| 2026-05-29 | completed | Sửa setup clear process/port cũ | Setup/Platform | [29-05-2026/finished/setup-port-process-cleanup.md](29-05-2026/finished/setup-port-process-cleanup.md) | [../logs/implementation/setup-port-process-cleanup-20260529.md](../logs/implementation/setup-port-process-cleanup-20260529.md) | [../docs/task/setup-port-process-cleanup-20260529.md](../docs/task/setup-port-process-cleanup-20260529.md) |
| 2026-05-29 | completed | Reload skill và sửa lại path theo skill mới | Backend/Frontend/Docs | [29-05-2026/finished/skill-reload-follow-up.md](29-05-2026/finished/skill-reload-follow-up.md) | [../logs/implementation/source-clean-skill-alignment-20260529.md](../logs/implementation/source-clean-skill-alignment-20260529.md) | [../docs/task/source-clean-skill-alignment-20260529.md](../docs/task/source-clean-skill-alignment-20260529.md) |
| 2026-05-29 | completed | Clean source theo skill | Backend/Frontend/Docs | [29-05-2026/finished/source-clean-skill-alignment.md](29-05-2026/finished/source-clean-skill-alignment.md) | [../logs/implementation/source-clean-skill-alignment-20260529.md](../logs/implementation/source-clean-skill-alignment-20260529.md) | [../docs/task/source-clean-skill-alignment-20260529.md](../docs/task/source-clean-skill-alignment-20260529.md) |
| 2026-05-28 | closed | Đồng bộ README/docs/logs/plans và push release | Docs/Release | [plan-docs-readme-sync-and-release-push-20260528-v1.md](plan-docs-readme-sync-and-release-push-20260528-v1.md) | [../logs/implementation/docs-readme-sync-and-release-push-20260528.md](../logs/implementation/docs-readme-sync-and-release-push-20260528.md) | README/docs/logs/plans index |
| 2026-05-28 | completed | Docker Hub multi-arch và root Compose full stack | Platform/Docker | [plan-docs-readme-sync-and-release-push-20260528-v1.md](plan-docs-readme-sync-and-release-push-20260528-v1.md) | [../logs/implementation/docker-hub-multiarch-compose-20260528.md](../logs/implementation/docker-hub-multiarch-compose-20260528.md) | [../docs/task/docker-hub-multiarch-compose-20260528.md](../docs/task/docker-hub-multiarch-compose-20260528.md) |
| 2026-05-27 | completed | Setup Linux/tmux, port 6800-6850 và cleanup source | Platform | [../docs/task/setup-linux-tmux-port-cleanup-20260527.md](../docs/task/setup-linux-tmux-port-cleanup-20260527.md) | [../logs/implementation/setup-linux-tmux-port-cleanup-20260527.md](../logs/implementation/setup-linux-tmux-port-cleanup-20260527.md) | README/setup scripts |
| 2026-05-26 | completed | Branding, logo, dashboard prompt DB | Frontend/API | [plan-frontend-branding-dashboard-prompt-20260526-v1.md](plan-frontend-branding-dashboard-prompt-20260526-v1.md) | [../logs/implementation/frontend-branding-dashboard-prompt-20260526.md](../logs/implementation/frontend-branding-dashboard-prompt-20260526.md) | [../docs/task/frontend-branding-dashboard-prompt-20260526.md](../docs/task/frontend-branding-dashboard-prompt-20260526.md) |

## Cách Đọc Repo

1. Bắt đầu từ `README.md` để chạy Docker/source và xem port.
2. Mở `plans/CURRENT.md` để biết việc mới nhất.
3. Mở `docs/CURRENT.md` để tìm tài liệu canonical và evidence mới.
4. Mở `logs/CURRENT.md` để xem log human-written mới nhất.
5. Test backend hiện tại nằm dưới `tests/backend tests/benchmark1000/`.

## Quy Tắc Đi Tiếp

- Việc đang làm đặt trong `plans/running/`.
- Việc xong phải có doc/log/evidence liên kết.
- Sau task lớn, cập nhật `README.md`, `docs/CURRENT.md`, `logs/CURRENT.md`, `plans/CURRENT.md`.
