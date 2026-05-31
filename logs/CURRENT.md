# Current Log Index

- Cập nhật: 2026-05-31 13:45 +07:00
- Mục đích: map nhanh log human-written mới nhất và log runtime/generated.

## Latest Human Logs

| Thời gian | Status | Log | Plan | Evidence |
| --- | --- | --- | --- | --- |
| 2026-05-31 | completed | [backend/logs-coding/benchmark1000-docs-setup-20260531.md](backend/logs-coding/benchmark1000-docs-setup-20260531.md) | [../plans/CURRENT.md](../plans/CURRENT.md) | [../tests/backend tests/benchmark1000](<../tests/backend tests/benchmark1000/README.md>); Docker tag `v0.1.0-20260531`; known gaps về history/evaluator |
| 2026-05-29 | completed | [implementation/setup-port-range-3100-3150-20260529.md](implementation/setup-port-range-3100-3150-20260529.md) | [../plans/29-05-2026/finished/setup-port-range-3100-3150.md](../plans/29-05-2026/finished/setup-port-range-3100-3150.md) | [../docs/task/setup-port-range-3100-3150-20260529.md](../docs/task/setup-port-range-3100-3150-20260529.md) |
| 2026-05-29 | completed | [implementation/setup-port-process-cleanup-20260529.md](implementation/setup-port-process-cleanup-20260529.md) | [../plans/29-05-2026/finished/setup-port-process-cleanup.md](../plans/29-05-2026/finished/setup-port-process-cleanup.md) | [../docs/task/setup-port-process-cleanup-20260529.md](../docs/task/setup-port-process-cleanup-20260529.md) |
| 2026-05-29 | completed | [implementation/source-clean-skill-alignment-20260529.md](implementation/source-clean-skill-alignment-20260529.md) | [../plans/29-05-2026/finished/source-clean-skill-alignment.md](../plans/29-05-2026/finished/source-clean-skill-alignment.md) | [../docs/task/source-clean-skill-alignment-20260529.md](../docs/task/source-clean-skill-alignment-20260529.md) |
| 2026-05-28 | completed | [implementation/readme-banner-ci-polish-20260528.md](implementation/readme-banner-ci-polish-20260528.md) | - | [../apps/web/public/banner.gif](../apps/web/public/banner.gif) |
| 2026-05-28 | closed | [implementation/docs-readme-sync-and-release-push-20260528.md](implementation/docs-readme-sync-and-release-push-20260528.md) | [../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md](../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md) | README/docs/logs/plans index |
| 2026-05-28 | completed | [implementation/docker-hub-multiarch-compose-20260528.md](implementation/docker-hub-multiarch-compose-20260528.md) | [../plans/CURRENT.md](../plans/CURRENT.md) | [../docs/task/docker-hub-multiarch-compose-20260528.md](../docs/task/docker-hub-multiarch-compose-20260528.md) |
| 2026-05-27 | in_progress | [implementation/benchmark-100-pipeline-audit-20260527.md](implementation/benchmark-100-pipeline-audit-20260527.md) | [../plans/running/plan-benchmark-100-pipeline-audit-20260527-v1.md](../plans/running/plan-benchmark-100-pipeline-audit-20260527-v1.md) | [../tests/backend tests/benchmark1000](<../tests/backend tests/benchmark1000/README.md>) |
| 2026-05-26 | completed | [implementation/frontend-branding-dashboard-prompt-20260526.md](implementation/frontend-branding-dashboard-prompt-20260526.md) | [../plans/plan-frontend-branding-dashboard-prompt-20260526-v1.md](../plans/plan-frontend-branding-dashboard-prompt-20260526-v1.md) | [../docs/task/frontend-branding-dashboard-prompt-20260526.md](../docs/task/frontend-branding-dashboard-prompt-20260526.md) |

## Generated Logs

| Folder | Ý nghĩa | Khi đọc |
| --- | --- | --- |
| `runtime/backend/` | Output process API | Debug API đang chạy |
| `runtime/frontend/` | Output process web | Debug frontend đang chạy |
| `backend/` | Log thông tin backend theo skill | Đọc việc backend đã làm |
| `frontend/` | Log thông tin frontend theo skill | Đọc việc frontend đã làm |
| `setup/` | Log setup/stop script sinh ra | Debug môi trường local |

## Quy Tắc Bảo Trì

- Quyết định của người làm đi vào `logs/planning/*.md` hoặc `logs/implementation/*.md`.
- Runtime `.log` chỉ là artifact debug, không phải source of truth của dự án.
- Cập nhật file này sau mỗi task đáng kể.
