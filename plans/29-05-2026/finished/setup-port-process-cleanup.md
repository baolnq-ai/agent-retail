# Plan sửa setup và clear port dự án

Ngày: 29-05-2026

## Mục tiêu

Kiểm tra lỗi khi chạy setup, sửa để setup tự clear port/process cũ thuộc dự án AI-Agent-retail trước khi start API/Web, không giết nhầm process ngoài dự án.

## Skill áp dụng

- `plan-skill`: tạo plan trong `plans/29-05-2026/running/`, xong chuyển sang `finished/`.
- `backend-skill`: setup chạm API/backend runtime, phải kiểm tra request/runtime nếu môi trường cho phép.
- `frontend-skill`: setup chạm web runtime, cần kiểm tra web start nếu môi trường cho phép.
- `security-skill`: clear process phải giới hạn theo port/project path, không dùng lệnh phá rộng.
- `readme-style`: nếu thay đổi cách setup/port thì cập nhật docs/README liên quan.

## Các bước

1. Đọc `setup.ps1`, `setup.sh`, `stop.ps1`, `stop.sh`, `clean.ps1`, `clean.sh` và package scripts.
2. Audit logic clear port/process cũ trong dải port dự án `6800-6850`.
3. Chạy kiểm tra setup ở mức an toàn hoặc reproduce lỗi bằng command không phá dữ liệu.
4. Sửa script để tự clear process cũ của dự án trước khi start.
5. Chạy validation script phù hợp và ghi blocker nếu Docker/DB chưa mở.
6. Cập nhật logs/evidence rồi chuyển plan sang `finished`.

## Tiêu chí pass

- Setup có bước clear port/process cũ trước khi start API/Web.
- Clear process giới hạn theo port dự án và/hoặc command line nằm trong repo, tránh kill nhầm.
- Script Windows được sửa vì môi trường hiện tại là PowerShell.
- Validation không fail do thay đổi script.

## Kết quả triển khai

- `setup.ps1` load `.env` trước khi gọi `stop.ps1`, nên dùng đúng port/project hiện tại.
- `stop.ps1` stop process tree từ PID file và repo-scoped runtime process, tránh sót node/next con giữ port.
- `stop.ps1` down cả `retail_agent_provider`, `retail_agent_dev`, `retail_agent_full`.
- Port cleanup skip Docker-owned process để không kill Docker Desktop backend/proxy.
- Native command fail trong setup/stop được detect bằng exit code; không còn OK giả.
- `setup.ps1` hidden mode dùng path thật của `corepack.cmd`.
- Validation pass: PowerShell parse, `.\stop.ps1`, `corepack pnpm validate`, `corepack pnpm --filter @retail-agent/web test`.
- Full setup còn blocked vì Docker Desktop daemon chưa ready; setup hiện fail sớm đúng tại Docker Compose.
