# Log README banner và CI polish

- Ngày: 2026-05-28
- Trạng thái: completed
- Doc: [../../docs/task/readme-banner-ci-polish-20260528.md](../../docs/task/readme-banner-ci-polish-20260528.md)

## Đã làm

- Tái hiện CI fail local bằng `corepack pnpm --filter @retail-agent/api test`.
- Sửa 2 case fail trong intent/user-analysis:
  - Product warranty follow-up giữ `smalltalk` thay vì policy khi câu hỏi chỉ nói "sản phẩm này".
  - More-products follow-up giữ `recommend/alternatives`.
- Tạo lại `apps/web/public/banner.gif` từ dashboard animation evidence:
  - Kích thước: `1280x520`.
  - Frame: 28.
  - Dung lượng: khoảng 2.6 MB.
- Polish README phần hero/badge/navigation/quick-start table.

## Verify đã chạy

- `corepack pnpm --filter @retail-agent/api test`: pass 95/95.
- `corepack pnpm prepare:generated`: pass.
- `corepack pnpm typecheck`: pass.
- `corepack pnpm build`: pass.
- `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet`: pass.
- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- Kiểm tra mojibake trong README/doc/log vừa sửa: pass.
