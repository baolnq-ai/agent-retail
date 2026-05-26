# Nginx Tunnel Compose - 2026-05-26

- Trạng thái: completed
- Log: `logs/implementation/nginx-tunnel-compose-20260526-v1.md`
- README: `README.md`

## Mục Tiêu

Thêm một entry nginx chạy bằng Docker Compose để người dùng tunnel dự án qua một cổng duy nhất. Cổng mặc định là `7080`.

## Thay Đổi

- Thêm service `nginx` vào `infra/docker/docker-compose.yml`.
- Thêm file cấu hình `infra/docker/nginx/default.conf.template`.
- Thêm biến `NGINX_PORT=7080` vào `.env.example`.
- Cập nhật `setup.sh` và `setup.ps1` để:
  - chạy PostgreSQL, Redis và nginx bằng Docker Compose;
  - kiểm tra `http://127.0.0.1:${NGINX_PORT}/nginx-health`;
  - cấu hình browser API base URL đi qua nginx khi Docker không bị skip;
  - in tunnel URL trong summary.
- Cập nhật web helper để khi mở qua domain tunnel, API dùng cùng origin thay vì quay về localhost.

## Route Nginx

| Path | Proxy |
| --- | --- |
| `/` | Next.js web |
| `/api/v1/*` | NestJS API |
| `/health` | NestJS health |
| `/model-gateway/*` | NestJS model gateway |
| `/nginx-health` | Health check nội bộ nginx |

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`
- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/api build`
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`

## Ghi Chú

- Tunnel nên trỏ vào `http://127.0.0.1:7080`.
- Nếu chạy `SKIP_DOCKER=1`, browser sẽ gọi API trực tiếp qua `API_PORT` vì nginx không chạy.
- `stop` và `clean` dùng cùng Docker Compose project nên nginx được tắt/xóa cùng PostgreSQL và Redis.
