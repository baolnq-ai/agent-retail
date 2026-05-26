# Plan: nginx-tunnel-compose-readme-sync

- Created: 2026-05-26
- Status: completed
- Related doc: `docs/task/nginx-tunnel-compose-20260526-v1.md`
- Related log: `logs/implementation/nginx-tunnel-compose-20260526-v1.md`

## Mục Tiêu

Đồng bộ README/tài liệu vận hành sang tiếng Việt có dấu, thêm nginx Docker Compose để tunnel dự án qua một cổng, và ghi rõ backend/frontend/model gateway/test/evidence.

## Phạm Vi

- In:
  - Docker Compose service nginx.
  - Setup scripts cho Linux/macOS/Git Bash và Windows PowerShell.
  - Web client API base URL khi mở qua tunnel.
  - README gốc theo `readme-style`.
  - Doc/log liên quan.
- Out:
  - Không đổi business logic chatbot.
  - Không chạy full setup nếu có nguy cơ tắt runtime đang dùng.

## Kết Quả

- `NGINX_PORT=7080`.
- nginx proxy `/` sang web, `/api/v1/*`, `/health`, `/model-gateway/*` sang API.
- README gốc viết lại bằng tiếng Việt có dấu, có port, cách chạy, kiến trúc, API format, test và evidence.
- Banner GIF mới: `apps/web/public/banner.gif`.

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass
- `corepack pnpm --filter @retail-agent/web typecheck`: pass
- `corepack pnpm --filter @retail-agent/web test`: pass
- `corepack pnpm --filter @retail-agent/api build`: pass
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`: pass
- PowerShell syntax parse cho `setup.ps1`, `stop.ps1`, `clean.ps1`: pass
- `bash -n setup.sh stop.sh clean.sh`: chưa chạy được vì môi trường hiện tại không có `/bin/bash`.
