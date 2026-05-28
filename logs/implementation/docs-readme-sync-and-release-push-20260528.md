# Log đồng bộ README/docs/logs/plans và push release

- Ngày: 2026-05-28
- Trạng thái: verifying trước khi commit/push
- Plan: [../../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md](../../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md)
- Doc: [../../docs/task/docs-readme-sync-and-release-push-20260528.md](../../docs/task/docs-readme-sync-and-release-push-20260528.md)

## Mục tiêu

Làm sạch README và các index docs/logs/plans theo skill trong `.codex`, bảo đảm nội dung tiếng Việt có dấu, đúng trạng thái Docker Hub multi-arch và root Compose hiện tại, rồi commit/push lên GitHub.

## Đã làm

- Viết lại README gốc theo dạng docs hub: Docker quick start, source setup, port, Docker Hub, API, test, production readiness.
- Đồng bộ index trong `docs/`, `logs/`, `plans/`.
- Thêm doc/log/plan cho lượt đồng bộ tài liệu và push này.
- Giữ phân biệt rõ root `docker-compose.yml` full Docker và `infra/docker/docker-compose.yml` dev infra.
- Giữ note không commit `.env` thật, token hoặc secret.

## Verify đã chạy

- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet`: pass.
- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- `C:\Program Files\Git\bin\bash.exe -lc "bash -n setup.sh stop.sh scripts/docker-build-local.sh scripts/docker-buildx-push.sh"`: pass.
- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `git diff --check`: pass, chỉ có warning line ending do Windows checkout.
- Kiểm tra chuỗi mojibake trong README/docs/logs/plans vừa sửa: pass.
- `git ls-files .env`: không trả file, `.env` thật không bị track.
- Secret scan cơ bản: không thấy credential pattern; có false positive quanh chuỗi `task-context`.

## Rủi ro còn lại

- Một số file lịch sử cũ trong archive vẫn có thể giữ format cũ. README và các index hiện tại mới là source of truth để đọc tiếp.
