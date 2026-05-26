# Log dashboard prompt và Qdrant search 2026-05-26

- Bắt đầu: 2026-05-26
- Kết thúc: 2026-05-26
- Trạng thái: completed
- Mục tiêu: sửa dashboard legend, thêm tab sửa prompt lưu DB, chuyển semantic search sang Qdrant thật.

## Việc đã làm

- Thêm bảng `PromptSetting` trong Prisma và API `GET/PUT/POST /api/v1/prompt-settings`.
- Dashboard agent có tab `Prompt` dưới canvas để xem, sửa, reset prompt.
- Sales agent đọc prompt `sales-system` từ DB cho request mới.
- Search Agent bỏ semantic heuristic trên text, gọi embedding API rồi upsert/query Qdrant collection `products`.
- Chuyển legend dashboard sang góc phải, giảm bề rộng để không che cụm node đầu flow.
- Cập nhật README và audit production để phản ánh đúng Qdrant runtime.

## File chính

- `apps/api/prisma/schema.prisma`
- `apps/api/src/controllers/prompt-settings.controller.ts`
- `apps/api/src/services/prompt-settings.service.ts`
- `apps/api/src/services/qdrant.service.ts`
- `apps/api/src/services/agents/search-agent.service.ts`
- `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`
- `apps/web/src/app/styles.css`
- `README.md`
- `docs/reports/production-architecture-audit-20260526.md`
- `test/agent-dashboard-prompt-qdrant-evidence-2026-05-26/README.md`

## Verify

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `corepack pnpm --filter @retail-agent/api db:generate`: pass.
- `corepack pnpm --filter @retail-agent/api db:push`: pass trên DB local.
- `corepack pnpm --filter @retail-agent/api test`: pass 94/94.
- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- `git diff --check`: pass, chỉ có cảnh báo CRLF Windows.
- Chrome headless screenshot: `test/agent-dashboard-prompt-qdrant-evidence-2026-05-26/app/dashboard-legend-right-fixed.png`.

## Rủi ro còn lại

- Search Agent hiện upsert product vectors theo request; production nên tách job ingest/index riêng.
- Runtime server cũ cần restart để nhận controller prompt mới.
