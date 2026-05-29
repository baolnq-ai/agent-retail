# Frontend Coding Log Setup Port Cleanup

- Ngày: 2026-05-29
- Service: setup-port-process-cleanup

## Nội Dung

- Sửa stop process tree để không sót Next dev process giữ `WEB_PORT`.
- Clear stale Next dev lock vẫn chạy sau khi stop runtime cũ.
- Hidden mode dùng đúng `corepack.cmd` khi start web.

## Validation

- `corepack pnpm --filter @retail-agent/web test`: pass.
- Full frontend runtime chưa start lại được vì Docker daemon chưa ready ở bước setup hạ tầng.

dev by ambrouse
