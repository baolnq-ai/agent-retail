# Log: Nginx Tunnel Compose - 2026-05-26

- Bắt đầu: 2026-05-26
- Trạng thái: completed
- Doc: `docs/task/nginx-tunnel-compose-20260526-v1.md`

## Mục Tiêu

Dựng nginx bằng Docker Compose để tunnel dự án qua một cổng duy nhất, đồng thời cập nhật README và setup/stop/clean để người dùng vận hành dễ hơn.

## File Đã Sửa

- `infra/docker/docker-compose.yml`
- `infra/docker/nginx/default.conf.template`
- `.env.example`
- `setup.sh`
- `setup.ps1`
- `apps/web/src/app/browser-api-base-url.ts`
- `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`
- `README.md`
- `docs/README.md`
- `logs/README.md`

## Kết Quả

- nginx chạy trong Compose, mặc định map `7080:80`.
- `/` proxy sang web `WEB_PORT`.
- `/api/v1/*`, `/health`, `/model-gateway/*` proxy sang API `API_PORT`.
- Web client tự dùng same-origin khi mở qua tunnel domain.
- README đã viết lại bằng tiếng Việt có dấu, có port, setup, Docker/nginx, kiến trúc, API format và test/evidence.

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass
- `corepack pnpm --filter @retail-agent/web typecheck`: pass
- `corepack pnpm --filter @retail-agent/web test`: pass
- `corepack pnpm --filter @retail-agent/api build`: pass
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`: pass
- PowerShell syntax parse cho `setup.ps1`, `stop.ps1`, `clean.ps1`: pass
- `bash -n setup.sh stop.sh clean.sh`: chưa chạy được vì môi trường hiện tại không có `/bin/bash`.

## Rủi Ro Còn Lại

- Chưa chạy full `setup.ps1` end-to-end trong turn này vì có thể ảnh hưởng runtime đang mở của user.
- Nginx proxy dùng `host.docker.internal`; Compose đã thêm `host-gateway` để hỗ trợ Linux Docker Engine mới.
