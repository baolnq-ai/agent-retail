# Setup Terminal/Tmux Run Guide - 2026-05-26

- Created: 2026-05-26 08:35
- Updated: 2026-05-26 08:35
- Plan: `plans/plan-setup-terminal-tmux-run-guide-20260526-v1.md`
- Log: `logs/implementation/setup-terminal-tmux-run-guide-20260526-v1.md`
- Status: closed

## Mục Tiêu

Làm cho workflow `setup` rõ ràng hơn: sau khi chạy phải biết web/API đang mở port nào, service nằm trong tmux hay terminal nào, log file ở đâu và dùng command nào để xem/stop.

## Phạm Vi

- Bash: ưu tiên tmux khi có `tmux`, fallback background process nếu không có.
- Windows PowerShell: mở terminal PowerShell visible để xem live output; vẫn hỗ trợ hidden mode qua biến môi trường.
- Docs: README và operations phải có command chạy, xem log, attach tmux và stop.

## Verify Dự Kiến

- Kiểm tra syntax shell/PowerShell.
- Kiểm tra README/docs có đủ port, tmux/window, log và stop command.

## Kết Quả Cuối

- Bash setup mặc định dùng `SETUP_TERMINAL_MODE=auto`: có `tmux` thì mở session `retail-agent` với window `api` và `web`, không có thì fallback background.
- Windows setup mặc định dùng `SETUP_TERMINAL_MODE=window`: mở terminal `Retail API - @retail-agent/api` và `Retail Web - apps/web`, đồng thời vẫn ghi log file.
- Hidden/background mode vẫn có sẵn cho môi trường không muốn mở cửa sổ terminal.
- Final summary sau setup in API/Web/agent dashboard/health URL, setup log, API log, Web log, terminal/tmux/PID detail và command stop.
- Stop scripts được cập nhật để cleanup tmux hoặc repo-scoped runtime windows/processes.
- Verification pass bằng syntax/parse check và kiểm tra docs references; chưa chạy full setup vì thao tác đó sẽ bật service thật.
