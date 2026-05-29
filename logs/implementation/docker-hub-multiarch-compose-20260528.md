# Log triển khai Docker Hub multi-arch

Ngày: 2026-05-28

## Đã làm

- Thêm Dockerfile multi-target cho API và Web.
- Thêm root `docker-compose.yml` để chạy toàn bộ stack bằng một compose file.
- Thêm helper `docker/wait-for-tcp.mjs` và entrypoint API.
- Thêm script build local và push multi-arch:
  - `scripts/docker-build-local.sh`
  - `scripts/docker-buildx-push.sh`
- Cập nhật `.env.example`, README và các default endpoint runtime.
- Sửa CORS hardcode port cũ `7000` sang cấu hình env/default `6800/6820`.
- Sửa default API URL frontend từ port cũ `7010/7080` về `6810/6820`.
- Cập nhật Docker Hub repo/tag mặc định thành `baonguyen3568/ai-agent-retail:v0.1.0-20260528`.
- Tách root compose full Docker (`retail_agent_full`) khỏi compose dev infra (`retail_agent_dev`).
- Cập nhật `setup.sh` để hỏi chọn `source` hoặc `docker`.

## Push Docker Hub

Lệnh phát hành:

```bash
DOCKER_IMAGE_REPO=baonguyen3568/ai-agent-retail IMAGE_TAG=v0.1.0-20260528 sh scripts/docker-buildx-push.sh
```

## Verify

- `docker compose config --quiet`: pass.
- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `docker buildx version`: pass, buildx `v0.33.0-desktop.1`.
- `docker build --target api --tag ai-agent-retail:api-verify .`: pass.
- `docker build --target web --tag ai-agent-retail:web-verify .`: pass.
- `docker buildx build --platform linux/amd64,linux/arm64 --target api --tag baonguyen3568/ai-agent-retail:api-v0.1.0-20260528 --tag baonguyen3568/ai-agent-retail:api-latest --push .`: pass.
- `docker buildx build --platform linux/amd64,linux/arm64 --target web --tag baonguyen3568/ai-agent-retail:web-v0.1.0-20260528 --tag baonguyen3568/ai-agent-retail:web-latest --push .`: pass sau khi sửa Dockerfile CMD của web.
- `docker buildx imagetools inspect` cho API/Web: đều có `linux/amd64` và `linux/arm64`.
- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml pull`: pass.
- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml up -d --remove-orphans`: pass sau khi recreate web image.
- `SETUP_RUN_MODE=docker ./setup.sh` bằng Git Bash trên Windows: pass; setup log `logs/setup/setup-20260528-091745.log`.
- HTTP qua nginx `6820`: `/health`, `/api/v1/products`, `/agent-dashboard` đều trả `200`.
- Auth/cart API: tạo user test, thêm sản phẩm vào giỏ, `cartItems=1`, `grandTotal=790000`.

Evidence ảnh: `tests/docker-full-compose-evidence-2026-05-28/`.
