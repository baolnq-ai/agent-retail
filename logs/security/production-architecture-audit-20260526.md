# Log audit kiến trúc production 2026-05-26

- Bắt đầu: 2026-05-26
- Trạng thái: completed
- Mục tiêu: kiểm tra Docker Compose, DB/vector, dashboard spacing và readiness production.

## Việc đã làm

- Kiểm tra `infra/docker/docker-compose.yml`, `.env.example`, `setup.ps1`, `setup.sh`.
- Kiểm tra Prisma schema và các service liên quan search/memory/RAG.
- Xác nhận runtime search hiện còn semantic fallback heuristic, chưa query Qdrant thật.
- Thêm Qdrant vào Docker Compose để quản lý cùng PostgreSQL, Redis và nginx.
- Cập nhật setup script để đọc `QDRANT_URL`, chờ Qdrant health và truyền env cho API.
- Chỉnh spacing dashboard để tool/history/DB không dính sát agent, line dễ đọc hơn.
- Viết audit production tại `docs/reports/production-architecture-audit-20260526.md`.
- Viết lại root `README.md` bằng tiếng Việt có dấu, cập nhật Qdrant và production readiness.

## File đã sửa

- `infra/docker/docker-compose.yml`
- `.env.example`
- `setup.ps1`
- `setup.sh`
- `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`
- `README.md`
- `docs/reports/production-architecture-audit-20260526.md`

## Rủi ro còn lại

- Qdrant đã có hạ tầng nhưng chưa được runtime search/RAG gọi thật.
- Cần thêm ingest/query vector, collection versioning và benchmark trước khi gọi semantic search là production-ready.
- Cần chụp lại dashboard sau khi chạy dev server để xác nhận spacing trực quan trên desktop/mobile.

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `corepack pnpm --filter @retail-agent/web test:runtime`: pass sau khi cập nhật assert tiếng Việt đúng với UI hiện tại.
- `corepack pnpm --filter @retail-agent/api build`: pass.
- `node --test apps/api/tests/agent-trace-contract.test.mjs apps/api/tests/pipeline-trace-bridge.test.mjs`: pass.
- Parse `setup.ps1`, `stop.ps1`, `clean.ps1` bằng PowerShell scriptblock: pass.
- `git diff --check`: pass, chỉ có cảnh báo CRLF của Git trên Windows.
