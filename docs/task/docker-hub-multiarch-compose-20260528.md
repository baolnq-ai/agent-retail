# Docker Hub multi-arch và Compose một file

Ngày: 2026-05-28

## Mục tiêu

Đóng gói dự án để chạy bằng một `docker-compose.yml` ở root và một `.env`, đồng thời build/push image API và Web lên Docker Hub repository `baonguyen3568/ai-agent-retail` theo multi-arch `linux/amd64,linux/arm64`.

## Thay đổi chính

- Thêm `Dockerfile` multi-target với hai target runtime: `api` và `web`.
- Thêm `docker-compose.yml` ở root để chạy PostgreSQL/pgvector, Redis, Qdrant, API, Web và nginx trong một project Compose.
- Thêm `docker/api-entrypoint.sh` để API chờ PostgreSQL/Redis/Qdrant, chạy `prisma db push`, seed dữ liệu rồi start NestJS.
- Thêm `scripts/docker-build-local.sh` cho build local và `scripts/docker-buildx-push.sh` cho push Docker Hub multi-arch.
- Cập nhật `.env.example` với `DOCKER_IMAGE_REPO`, `IMAGE_TAG`, `PLATFORMS` và endpoint model mặc định `replace-with-your-vllm-gateway.example.invalid`, `replace-with-your-embed-rerank-gateway.example.invalid`.
- Sửa CORS backend và default API URL frontend về dải port `6800-6850`/nginx `6820`.
- Tách `DOCKER_COMPOSE_PROJECT_NAME=retail_agent_full` cho root compose và `COMPOSE_PROJECT_NAME=retail_agent_dev` cho compose dev trong `infra/docker`.
- Cập nhật `setup.sh` để hỏi chọn `source` hoặc `docker`; `source` giữ flow cũ, `docker` chạy root compose full backend/frontend.

## Cách vận hành

Build local:

```bash
DOCKER_IMAGE_REPO=baonguyen3568/ai-agent-retail IMAGE_TAG=v0.1.0-20260528 sh scripts/docker-build-local.sh
docker compose up -d
```

Push Docker Hub:

```bash
docker login
DOCKER_IMAGE_REPO=baonguyen3568/ai-agent-retail IMAGE_TAG=v0.1.0-20260528 sh scripts/docker-buildx-push.sh
```

Chạy từ Docker Hub:

```bash
cp .env.example .env
docker compose pull
docker compose up -d
```

## Thông tin phát hành

- Docker Hub repository: `baonguyen3568/ai-agent-retail`.
- Tag version: `v0.1.0-20260528`.
- Latest tags đi kèm: `api-latest`, `web-latest`.
- Kiến trúc đã inspect: `linux/amd64`, `linux/arm64`.

## Ghi chú production

- `.env.example` không chứa secret. Không commit `.env` hoặc Docker Hub token.
- `db push`/seed đang bật mặc định để demo chạy một lệnh. Khi production thật, nên đổi sang migration versioned và seed kiểm soát theo release.
- API/Web dùng một Dockerfile/source. Postgres, Redis, Qdrant, nginx vẫn tách service để đúng nguyên tắc một container một process chính.

## Verify 2026-05-28

- `docker compose config --quiet`: pass.
- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- `corepack pnpm --filter @retail-agent/api typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `docker build --target api --tag ai-agent-retail:api-verify .`: pass.
- `docker build --target web --tag ai-agent-retail:web-verify .`: pass.
- `docker buildx imagetools inspect baonguyen3568/ai-agent-retail:api-v0.1.0-20260528`: có `linux/amd64`, `linux/arm64`.
- `docker buildx imagetools inspect baonguyen3568/ai-agent-retail:web-v0.1.0-20260528`: có `linux/amd64`, `linux/arm64`.
- Pull và chạy root compose từ Docker Hub: pass.
- `SETUP_RUN_MODE=docker ./setup.sh` bằng Git Bash trên Windows: pass, script tự stop full compose cũ, pull/up root compose và verify nginx/API/products/dashboard.
- HTTP qua nginx `6820`: `/health`, `/api/v1/products`, `/agent-dashboard` đều trả `200`.
- Auth/cart API thật: tạo user test, thêm `prod_smart_10`, cart có 1 dòng, `grandTotal=790000`.

Evidence: [../../tests/docker-full-compose-evidence-2026-05-28/README.md](../../tests/docker-full-compose-evidence-2026-05-28/README.md).
