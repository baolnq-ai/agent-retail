# Log setup port/process cleanup

- Ngày: 2026-05-29
- Phạm vi: `setup.ps1`, `stop.ps1`
- Doc: `docs/task/setup-port-process-cleanup-20260529.md`
- Evidence: `tests/backend tests/setup-port-process-cleanup/validation.md`

## Việc Đã Làm

- Reproduce setup fail: stop script down sai compose project, rồi port cleanup kill Docker backend/proxy.
- Sửa `setup.ps1` để load env trước khi stop runtime cũ.
- Sửa `stop.ps1` để dừng process tree, down cả `retail_agent_provider`, `retail_agent_dev`, `retail_agent_full`.
- Thêm skip Docker-owned process ở bước clear port.
- Bắt exit code native command để không báo OK giả.
- Sửa hidden mode dùng đúng executable path của `corepack`.

## Kết Quả

- `stop.ps1` chạy được khi Docker daemon chưa ready và chỉ WARN compose.
- `setup.ps1` fail sớm đúng lỗi Docker Compose khi daemon chưa ready, không còn kill Docker backend.
- Validation source vẫn pass.

dev by ambrouse
