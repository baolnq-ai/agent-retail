<div align="center">

![RetailHome Agent Dashboard](apps/web/public/banner.gif)

# RetailHome AI Agent

Trợ lý bán hàng retail chạy bằng Next.js, NestJS, PostgreSQL, Redis, Qdrant, pipeline nhiều agent, dashboard trace và nginx tunnel entry.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.20.0-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--arch%20compose-2496ED?logo=docker&logoColor=white)

[Chạy nhanh](#chạy-nhanh-bằng-docker) · [Docker Hub](#docker-hub--multi-arch) · [Port](#port-mặc-định) · [Kiến trúc](#kiến-trúc) · [API](#api-chính) · [Test](#test-và-benchmark) · [Tài liệu](#tài-liệu-liên-quan)

</div>

- Cập nhật: 2026-05-28
- Phiên bản image: `v0.1.0-20260528`
- Docker Hub: `baonguyen3568/ai-agent-retail`
- Port runtime: `6800-6850`

## Tổng Quan

Repo này là hệ thống retail chatbot có web storefront, chat widget, giỏ hàng theo tài khoản, backend API, bộ nhớ hội thoại, pipeline agent và dashboard quan sát flow. Trạng thái hiện tại ưu tiên ba cách vận hành rõ ràng: chạy full Docker bằng một compose file ở root, chạy source local bằng script, và tunnel toàn bộ qua một cổng nginx.

| Phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | Next.js 16, React 19 | Trang mua sắm, chat widget, tài khoản, giỏ hàng, dashboard agent |
| Backend | NestJS 11, Fastify, Prisma | API sản phẩm, auth, cart/order/payment mock, model gateway, agent pipeline |
| Database chính | PostgreSQL 16 + pgvector | Catalog, user, cart, memory, audit, dữ liệu test |
| Vector DB | Qdrant | Vector search/RAG cho product/doc chunks |
| Cache | Redis 7 | Runtime cache/session phụ trợ |
| Proxy | nginx | Một cổng vào cho web và API cùng origin |
| Model | API ngoài | vLLM/chat model, embedding, rerank qua HTTP |

Search Agent dùng embedding API và Qdrant cho nhánh semantic khi exact/lexical search không đủ recall. PostgreSQL vẫn là nguồn fact chính cho giá, tồn kho, catalog, user, cart và memory.

## Chạy Nhanh Bằng Docker

Đây là đường chạy gọn nhất sau khi pull repo. Cần Docker, `.env` tạo từ `.env.example`, và root `docker-compose.yml`.

```bash
cp .env.example .env
docker compose pull
docker compose up -d
```

Mở nhanh:

| Mục | URL |
| --- | --- |
| Web/API qua nginx | `http://127.0.0.1:6820` |
| Dashboard agent | `http://127.0.0.1:6820/agent-dashboard` |
| API health | `http://127.0.0.1:6820/health` |

Root `docker-compose.yml` là bản full Docker 100%, có đủ backend, frontend, PostgreSQL, Redis, Qdrant và nginx. File `infra/docker/docker-compose.yml` chỉ dùng cho chế độ dev source, nơi API/Web chạy từ source còn Docker chỉ chạy hạ tầng phụ trợ.

## Port Mặc Định

| Service | URL |
| --- | --- |
| Web trực tiếp | `http://127.0.0.1:6800` |
| API trực tiếp | `http://127.0.0.1:6810` |
| nginx/tunnel entry | `http://127.0.0.1:6820` |
| Dashboard agent | `http://127.0.0.1:6820/agent-dashboard` |
| API health | `http://127.0.0.1:6820/health` |
| PostgreSQL | `127.0.0.1:6832` |
| Redis | `127.0.0.1:6839` |
| Qdrant HTTP | `http://127.0.0.1:6833` |
| Qdrant gRPC | `127.0.0.1:6834` |

Toàn bộ port mặc định nằm trong dải `6800-6850`. Khi cần tunnel, trỏ tunnel vào `http://127.0.0.1:6820`.

## Chạy Bằng Setup Script

Windows PowerShell:

```powershell
Copy-Item .env.example .env
.\setup.ps1
```

Linux/macOS/Git Bash:

```bash
cp .env.example .env
./setup.sh
```

`setup.sh` có hai chế độ:

| Chế độ | Ý nghĩa |
| --- | --- |
| `source` | API/Web chạy từ source; `infra/docker/docker-compose.yml` chỉ chạy PostgreSQL, Redis, Qdrant, nginx dev |
| `docker` | Chạy 100% bằng root `docker-compose.yml`, gồm backend, frontend và hạ tầng |

Bỏ qua câu hỏi bằng env:

```bash
SETUP_RUN_MODE=docker ./setup.sh
SETUP_RUN_MODE=source ./setup.sh
```

Với `source`, script đọc `.env`, cài workspace bằng `pnpm`, chạy hạ tầng dev, generate/push/seed Prisma, build API, dọn process cũ trong dải port dự án, rồi chạy API và Web. Linux/macOS mặc định dùng tmux session `egnt-retail`:

| Window | Nội dung |
| --- | --- |
| `egnt-retail:api` | NestJS API trên `6810` |
| `egnt-retail:web` | Next.js web trên `6800` |

## Docker Hub / Multi-Arch

Dự án dùng Docker Hub repository `baonguyen3568/ai-agent-retail`. `Dockerfile` ở root có hai target runtime `api` và `web`; cả hai image được publish cùng repository, tách bằng tag.

| Image tag | Vai trò | Kiến trúc |
| --- | --- | --- |
| `baonguyen3568/ai-agent-retail:api-v0.1.0-20260528` | Backend NestJS, Prisma, agent pipeline | `linux/amd64`, `linux/arm64` |
| `baonguyen3568/ai-agent-retail:web-v0.1.0-20260528` | Frontend Next.js | `linux/amd64`, `linux/arm64` |
| `baonguyen3568/ai-agent-retail:api-latest` | Latest backend | `linux/amd64`, `linux/arm64` |
| `baonguyen3568/ai-agent-retail:web-latest` | Latest frontend | `linux/amd64`, `linux/arm64` |

Build local trên kiến trúc hiện tại:

```bash
DOCKER_IMAGE_REPO=baonguyen3568/ai-agent-retail IMAGE_TAG=v0.1.0-20260528 sh scripts/docker-build-local.sh
docker compose up -d
```

Build và push multi-arch:

```bash
docker login
DOCKER_IMAGE_REPO=baonguyen3568/ai-agent-retail IMAGE_TAG=v0.1.0-20260528 sh scripts/docker-buildx-push.sh
```

Khi chạy qua tunnel/domain:

```env
NEXT_PUBLIC_SITE_URL=https://domain-cua-ban
NEXT_PUBLIC_API_BASE_URL=https://domain-cua-ban
CORS_ORIGINS=https://domain-cua-ban
```

Không commit `.env`, token hoặc credential Docker Hub.

## Dừng Và Xóa

```powershell
.\stop.ps1
.\clean.ps1
```

```bash
./stop.sh
./clean.sh
```

`stop` tắt API/Web và Compose project liên quan. `clean` xóa container, network, volume và image thuộc Compose project của repo. Script không chạy global Docker prune.

## Cấu Hình Chính

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `DOCKER_IMAGE_REPO` | `baonguyen3568/ai-agent-retail` | Repo image dùng bởi root compose |
| `IMAGE_TAG` | `v0.1.0-20260528` | Tag phát hành cho image API/Web |
| `PLATFORMS` | `linux/amd64,linux/arm64` | Kiến trúc buildx khi push multi-arch |
| `DOCKER_COMPOSE_PROJECT_NAME` | `retail_agent_full` | Project Compose full Docker |
| `COMPOSE_PROJECT_NAME` | `retail_agent_dev` | Project Compose dev infra |
| `CHAT_MODEL_BASE_URL` | `https://replace-with-your-vllm-gateway.example.invalid` | API vLLM/chat model |
| `CHAT_MODEL_ID` | `google/gemma-4-E4B-it` | Model chat mặc định |
| `EMBED_RERANK_BASE_URL` | `https://replace-with-your-embed-rerank-gateway.example.invalid` | API embedding/rerank |
| `CORS_ORIGINS` | localhost ports | Origin browser được phép gọi API |
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:6820` | API public cho browser |
| `NEXT_PUBLIC_SITE_URL` | `http://127.0.0.1:6820` | URL site cho metadata/share link |
| `TMUX_SESSION` | `egnt-retail` | Session tmux runtime source |
| `RUN_DB_PUSH` | `1` | Container API tự chạy `prisma db push` khi start |
| `RUN_DB_SEED` | `1` | Container API tự seed dữ liệu khi start |

## Kiến Trúc

```mermaid
flowchart LR
  User[Người dùng] --> Nginx[nginx 6820]
  Nginx --> Web[Next.js web 6800]
  Nginx --> API[NestJS API 6810]
  Web --> API
  API --> Agent[Agent pipeline]
  Agent --> Lead[Lead agent]
  Lead --> Memory[History/Memory]
  Lead --> Search[Search agent]
  Lead --> Recommend[Recommendation agent]
  Lead --> RAG[RAG agent]
  Lead --> Cart[Cart agent]
  Lead --> Security[Security agent]
  Lead --> Sales[Sales agent]
  Search --> Postgres[(PostgreSQL)]
  Search --> Qdrant[(Qdrant)]
  RAG --> Qdrant
  Sales --> ChatModel[vLLM/chat API]
  RAG --> Embed[Embedding/Rerank API]
  API --> Redis[(Redis)]
  API --> Dashboard[Trace dashboard]
```

Flow chat: Web gửi `POST /api/v1/chat`, backend tạo trace, Lead agent điều phối agent cần thiết, agent gọi tool/DB/model, Sales agent viết câu trả lời cuối từ dữ liệu đã khóa, sau đó dashboard đọc trace để vẽ node/edge/playback.

## API Chính

Chat:

```http
POST /api/v1/chat
Content-Type: application/json

{ "message": "Tư vấn máy lọc không khí dưới 4 triệu" }
```

Response rút gọn:

```json
{
  "messageId": "uuid",
  "model": "google/gemma-4-E4B-it",
  "blocks": [{ "type": "text", "content": "..." }],
  "trace": {
    "traceId": "uuid",
    "intent": "recommend",
    "agents": ["lead-agent", "search-agent", "sales-agent"]
  }
}
```

Model gateway:

| Endpoint | Vai trò |
| --- | --- |
| `POST /model-gateway/chat` | Gọi chat/vLLM |
| `POST /model-gateway/embed` | Tạo embedding |
| `POST /model-gateway/rerank` | Rerank danh sách document |
| `GET /model-gateway/health` | Kiểm tra gateway |

Prompt settings:

| Endpoint | Vai trò |
| --- | --- |
| `GET /api/v1/prompt-settings` | Đọc prompt đang lưu trong PostgreSQL |
| `PUT /api/v1/prompt-settings` | Cập nhật prompt |
| `POST /api/v1/prompt-settings/reset` | Reset prompt về mặc định |

## Test Và Benchmark

Lệnh kiểm tra thường dùng:

```bash
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/api build
corepack pnpm --filter @retail-agent/web build
docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet
docker compose -f infra/docker/docker-compose.yml config --quiet
```

Evidence chính:

| Bộ test | Evidence |
| --- | --- |
| Docker full compose | [`test/docker-full-compose-evidence-2026-05-28/README.md`](test/docker-full-compose-evidence-2026-05-28/README.md) |
| Benchmark 100 câu | [`test/benmark-100/`](test/benmark-100/) |
| Hard flow 20 câu | [`test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/README.md`](test/retail-chatbot-hard-flow-benchmark-evidence-2026-05-26/README.md) |
| Dashboard flow | [`test/agent-dashboard-icon-legend-density-evidence-2026-05-26/README.md`](test/agent-dashboard-icon-legend-density-evidence-2026-05-26/README.md) |

## Production Readiness

| Mảng | Hiện trạng | Cần làm trước production thật |
| --- | --- | --- |
| Docker runtime | Root compose chạy API, Web, PostgreSQL, Redis, Qdrant và nginx | Dùng registry/tag release cố định theo môi trường |
| Vector search | Search Agent query Qdrant bằng embedding thật khi cần semantic recall | Tách job ingest/index riêng, version collection, benchmark tải lớn |
| PostgreSQL | Prisma schema rõ, có bảng memory/cart/search/prompt | Dùng migration versioned thay cho `db push` khi deploy production |
| Security | HttpOnly cookie, CORS allowlist env, không đưa secret vào `.env.example` | Audit authz, rate limit, secret manager, TLS production |
| Observability | Có logs và dashboard trace | Thêm metrics, alerting, trace id xuyên suốt request |

## Repository Map

| Path | Nội dung |
| --- | --- |
| `apps/api/` | Backend NestJS, Prisma, services, controller, test API |
| `apps/web/` | Frontend Next.js, chat UI, cart/account, dashboard |
| `Dockerfile`, `docker-compose.yml` | Đóng gói API/Web và chạy toàn bộ project bằng một Compose file |
| `docker/` | Entrypoint container API và helper chờ service |
| `scripts/docker-build*.sh` | Build local và push multi-arch lên Docker Hub |
| `infra/docker/` | Compose/nginx phục vụ setup local dev source |
| `docs/` | Tài liệu kiến trúc, task, báo cáo |
| `plans/` | Plan theo phase và theo agent |
| `logs/` | Log triển khai, planning, testing |
| `test/` | Test case, benchmark, evidence ảnh/report |
| `setup.*`, `stop.*`, `clean.*` | Script vận hành local |

## Tài Liệu Liên Quan

| Tài liệu | Nội dung |
| --- | --- |
| [`docs/README.md`](docs/README.md) | Index tài liệu |
| [`plans/CURRENT.md`](plans/CURRENT.md) | Plan đang chạy/vừa đóng |
| [`logs/CURRENT.md`](logs/CURRENT.md) | Log mới nhất |
| [`docs/task/docker-hub-multiarch-compose-20260528.md`](docs/task/docker-hub-multiarch-compose-20260528.md) | Task Docker Hub multi-arch |
| [`logs/implementation/docker-hub-multiarch-compose-20260528.md`](logs/implementation/docker-hub-multiarch-compose-20260528.md) | Log triển khai Docker |
| [`docs/reports/production-architecture-audit-20260526.md`](docs/reports/production-architecture-audit-20260526.md) | Audit kiến trúc production |

dev by ambrouse
