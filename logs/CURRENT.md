# Current Log Index

- Cập nhật: 2026-05-28 10:30 +07:00
- Mục đích: map nhanh log human-written mới nhất và log runtime/generated.

## Latest Human Logs

| Thời gian | Status | Log | Plan | Evidence |
| --- | --- | --- | --- | --- |
| 2026-05-28 | completed | [implementation/readme-banner-ci-polish-20260528.md](implementation/readme-banner-ci-polish-20260528.md) | - | [../apps/web/public/banner.gif](../apps/web/public/banner.gif) |
| 2026-05-28 | closed | [implementation/docs-readme-sync-and-release-push-20260528.md](implementation/docs-readme-sync-and-release-push-20260528.md) | [../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md](../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md) | README/docs/logs/plans index |
| 2026-05-28 | completed | [implementation/docker-hub-multiarch-compose-20260528.md](implementation/docker-hub-multiarch-compose-20260528.md) | [../plans/CURRENT.md](../plans/CURRENT.md) | [../test/docker-full-compose-evidence-2026-05-28](../test/docker-full-compose-evidence-2026-05-28/README.md) |
| 2026-05-27 | in_progress | [implementation/benmark-100-pipeline-audit-20260527.md](implementation/benmark-100-pipeline-audit-20260527.md) | [../plans/running/plan-benmark-100-pipeline-audit-20260527-v1.md](../plans/running/plan-benmark-100-pipeline-audit-20260527-v1.md) | [../test/benmark-100](../test/benmark-100/) |
| 2026-05-26 | completed | [implementation/frontend-branding-dashboard-prompt-20260526.md](implementation/frontend-branding-dashboard-prompt-20260526.md) | [../plans/plan-frontend-branding-dashboard-prompt-20260526-v1.md](../plans/plan-frontend-branding-dashboard-prompt-20260526-v1.md) | [../test/frontend-branding-dashboard-prompt-evidence-2026-05-26](../test/frontend-branding-dashboard-prompt-evidence-2026-05-26/) |

## Generated Logs

| Folder | Ý nghĩa | Khi đọc |
| --- | --- | --- |
| `runtime/backend/` | Output process API | Debug API đang chạy |
| `runtime/frontend/` | Output process web | Debug frontend đang chạy |
| `setup/` | Log setup/stop script sinh ra | Debug môi trường local |

## Quy Tắc Bảo Trì

- Quyết định của người làm đi vào `logs/planning/*.md` hoặc `logs/implementation/*.md`.
- Runtime `.log` chỉ là artifact debug, không phải source of truth của dự án.
- Cập nhật file này sau mỗi task đáng kể.
