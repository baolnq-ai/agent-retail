# Backend Coding Log Setup Port Cleanup

- Ngày: 2026-05-29
- Service: setup-port-process-cleanup

## Nội Dung

- Sửa setup/stop PowerShell cho backend runtime API.
- Stop theo process tree để không sót process con giữ `API_PORT`.
- Setup fail sớm khi Docker Compose không chạy được thay vì đợi DB timeout.

## Validation

- `corepack pnpm validate`: pass.
- `.\setup.ps1` hidden: blocked bởi Docker daemon chưa ready, đã fail đúng nguyên nhân.

dev by ambrouse
