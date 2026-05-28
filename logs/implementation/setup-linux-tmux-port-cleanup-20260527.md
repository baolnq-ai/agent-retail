# Log setup Linux tmux port cleanup 2026-05-27

- Trạng thái: hoàn tất cập nhật source.
- Doc: `docs/task/setup-linux-tmux-port-cleanup-20260527.md`

## Việc đã làm

- Đổi port mặc định sang dải `6800-6850` trong `.env.example`, Docker Compose, setup/stop scripts và README.
- Đổi tmux session mặc định sang `egnt-retail`; Bash setup ép session luôn chứa chuỗi này.
- Thêm kiểm tra port range trong `setup.sh`.
- Thêm auto-install helper Linux/macOS cho `tmux`, `curl`, `nc`, `lsof`; có fallback thử cài Node/Corepack nếu thiếu.
- Mở rộng `stop.sh` để dọn process Linux theo repo, dọn session tmux cũ và dọn port dự án.
- Mở rộng `clean.sh` và `clean.ps1` để dọn rác root-level `.tmp*`, `test-results`; không xóa `.codex/skills`.
- Thay `apps/web/public/banner.gif` bằng GIF dashboard agent đang chạy trace nặng từ evidence.
- Thêm `.gitattributes` để `*.sh` luôn dùng LF và ảnh được đánh dấu binary.

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- PowerShell parser: `setup.ps1`, `stop.ps1`, `clean.ps1` pass.
- `docker run --rm -v "${PWD}:/work" -w /work bash:5.2 bash -n setup.sh stop.sh clean.sh`: pass.
- Đã chuyển `setup.sh`, `stop.sh`, `clean.sh` sang LF để chạy đúng trên Linux.

## Ghi chú

- Chưa chạy `setup.sh` end-to-end trong Linux thật ở lượt này vì môi trường hiện tại là Windows PowerShell.
- README đã ghi rõ port, tmux session, lệnh attach và entry tunnel.
