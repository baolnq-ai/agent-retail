# Setup Port Và Process Cleanup

- Ngày: 2026-05-29
- Phạm vi: sửa `setup.ps1` và `stop.ps1` để setup tự dọn process/port cũ của dự án trước khi chạy lại.

## Lỗi Gặp Phải

- Setup fail khi chạy lại vì process/container cũ còn giữ port.
- `stop.ps1` chỉ down `retail_agent_provider`, trong khi compose cũ có thể là `retail_agent_dev`.
- Port cleanup cũ có thể kill Docker backend/proxy nếu Docker đang publish port, làm Docker daemon mất kết nối.
- Native command fail trong PowerShell chưa được bắt đúng, dẫn đến log báo OK giả.

## Cách Sửa

- `setup.ps1` load `.env` trước rồi mới gọi `stop.ps1`, để stop dùng đúng port/project hiện tại.
- `stop.ps1` dừng cả process tree từ PID file, tránh sót node/next con giữ port.
- `stop.ps1` down các compose project hợp lệ của repo: `retail_agent_provider`, `retail_agent_dev`, `retail_agent_full`.
- Port cleanup bỏ qua Docker-owned process, không kill Docker Desktop backend/proxy.
- Native command fail giờ được detect bằng exit code; setup fail sớm nếu Docker Compose không chạy được.
- Hidden mode dùng path thực của `corepack.cmd` thay vì gọi trần `corepack`.

## Validation

| Lệnh | Kết quả |
| --- | --- |
| Parse `setup.ps1` | Pass |
| Parse `stop.ps1` | Pass |
| `.\stop.ps1` khi Docker daemon chưa ready | Pass, chỉ WARN Docker compose |
| `.\setup.ps1` hidden khi Docker daemon chưa ready | Fail sớm đúng nguyên nhân Docker Compose |
| `corepack pnpm validate` | Pass |
| `corepack pnpm --filter @retail-agent/web test` | Pass |

## Blocker Môi Trường

Docker Desktop process đã được gọi lại nhưng Docker daemon chưa sẵn sàng trong thời gian chờ, nên chưa thể chạy full setup đến bước API/Web ready trong lượt này.

dev by ambrouse
