# Đồng bộ README/docs/logs/plans và push release

Ngày: 2026-05-28

## Mục tiêu

Tinh chỉnh README gốc và các index trong `docs/`, `logs/`, `plans/` để nội dung sạch tiếng Việt, đúng trạng thái Docker/source hiện tại, không còn lỗi mã hóa và có liên kết rõ tới plan/log/evidence mới nhất trước khi push lên GitHub.

## Phạm vi

- README gốc: cách chạy Docker một lệnh, setup source/docker, port, Docker Hub multi-arch, API, test, production readiness.
- Docs index: `docs/README.md`, `docs/CURRENT.md`, `docs/task/README.md`.
- Logs index: `logs/README.md`, `logs/CURRENT.md`, `logs/implementation/README.md`.
- Plans index: `plans/README.md`, `plans/CURRENT.md`, `plans/running/README.md`.
- Task record: plan/log/doc cho lần đồng bộ và push này.

## Kết quả cần đọc

| File | Vai trò |
| --- | --- |
| [../../README.md](../../README.md) | Hub chính của repo |
| [../../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md](../../plans/plan-docs-readme-sync-and-release-push-20260528-v1.md) | Plan đã đóng |
| [../../logs/implementation/docs-readme-sync-and-release-push-20260528.md](../../logs/implementation/docs-readme-sync-and-release-push-20260528.md) | Log triển khai |
| [../../tests/docker-full-compose-evidence-2026-05-28/README.md](../../tests/docker-full-compose-evidence-2026-05-28/README.md) | Evidence Docker full compose |

## Ghi chú

- `.env` thật không được commit.
- Root `docker-compose.yml` là compose full Docker.
- `infra/docker/docker-compose.yml` chỉ dùng cho dev source.
- Docker Hub tag hiện tại: `v0.1.0-20260528`.
