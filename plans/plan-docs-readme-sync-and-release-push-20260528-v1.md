# Plan: docs-readme-sync-and-release-push

- Created: 2026-05-28 10:00
- Updated: 2026-05-28 10:55
- Status: closed
- Related log: logs/implementation/docs-readme-sync-and-release-push-20260528.md
- Related doc: docs/task/docs-readme-sync-and-release-push-20260528.md

## Goal

Đồng bộ README, docs, logs và plans theo skill trong `.codex`, bảo đảm tiếng Việt có dấu, không lỗi mã hóa, đúng trạng thái Docker Hub/root Compose hiện tại, rồi commit/push lên GitHub.

## Scope

- In: README gốc, docs/logs/plans index, doc/log/plan task đồng bộ, validation trước push.
- Out: sửa sâu các file archive lịch sử, đổi logic runtime, đổi Docker image đã publish.

## Skills

- documentation-skill
- readme-style
- logging-skill
- plan-skill
- push-code-skill

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Rà README/docs/logs/plans và git status | done | `git status --short --branch`, đọc các index |
| 2 | Viết lại README và index hiện tại bằng tiếng Việt sạch | done | README/docs/logs/plans đã cập nhật |
| 3 | Thêm doc/log/plan cho lượt đồng bộ | done | File task/log/plan mới |
| 4 | Chạy validation và kiểm tra secret cơ bản | done | Compose config, typecheck, bash syntax, mojibake/secret scan |
| 5 | Commit và push | done | `cfb62f8` đã push lên `origin/main` |

## Verification

- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet`
- `docker compose -f infra/docker/docker-compose.yml config --quiet`
- `bash -n setup.sh stop.sh scripts/docker-build-local.sh scripts/docker-buildx-push.sh`
- `corepack pnpm --filter @retail-agent/api typecheck`
- `corepack pnpm --filter @retail-agent/web typecheck`
- Kiểm tra README/docs/logs/plans không còn chuỗi mojibake thường gặp.

## Close Criteria

- README là docs hub đúng trạng thái Docker/source hiện tại.
- Docs/logs/plans index có liên kết tới task Docker, benchmark, evidence mới.
- `.env` thật không bị stage.
- Commit/push lên `origin/main` thành công: `cfb62f8`.
