# Source Clean Theo Skill

- Ngày: 2026-05-29
- Phạm vi: clean source theo `.codex/skills`, `.github/workflows/ci.yml` và `CLAUDE.md`.

## Nội Dung Đã Làm

- Chuẩn hoá root evidence folder sang `tests/` để khớp yêu cầu lưu test/evidence ngoài source app.
- Chuẩn hoá tên benchmark 100 thành `benchmark-100`, gồm folder, runner, plan/doc/log và references.
- Bỏ fallback model URL hardcode trong backend config; runtime đọc `.env` trước, rồi `.env.example`.
- Sửa mojibake trong active backend/frontend runtime tests và source liên quan.
- Format lại `AppModule` để controller/provider list dễ review.
- Sửa `scripts/prepare-generated.mjs` để Windows không còn cảnh báo spawn args với shell.

## Validation

| Lệnh | Kết quả |
| --- | --- |
| `corepack pnpm validate` | Pass |
| `corepack pnpm --filter @retail-agent/web test` | Pass |
| `corepack pnpm build` | Pass |
| `docker compose -f infra/docker/docker-compose.yml config --quiet` | Pass |
| `docker compose --env-file .env.example -p retail_agent_full -f docker-compose.yml config --quiet` | Pass |
| `node --check tests/benchmark-100/scripts/run-benchmark-100.mjs` | Pass |

## Ghi Chú

- Không chỉnh hoặc khôi phục thay đổi user đang có trong `.codex/skills`.
- Runner benchmark dùng chuẩn env `BENCHMARK_*`.

dev by ambrouse
