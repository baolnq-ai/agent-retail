# Setup Linux, tmux và port 6800-6850

Ngày cập nhật: 2026-05-27.

## Mục tiêu

Cập nhật vận hành local để chạy ổn trên Linux/macOS bằng `setup.sh`, có dọn runtime cũ trước khi chạy, dùng tmux session có chữ `egnt-retail`, và chuyển toàn bộ port mặc định sang dải `6800-6850`.

## Thay đổi

- Port mặc định:
  - Web: `6800`
  - API: `6810`
  - nginx/tunnel: `6820`
  - PostgreSQL: `6832`
  - Qdrant HTTP/gRPC: `6833/6834`
  - Redis: `6839`
- `setup.sh` cố tự cài helper Linux/macOS còn thiếu: `tmux`, `curl`, `nc`, `lsof`; nếu thiếu Node/Corepack thì thử cài `nodejs/npm` và `corepack`.
- `setup.sh` kiểm tra port phải nằm trong dải `6800-6850`.
- Tmux mặc định là `egnt-retail`; nếu biến `TMUX_SESSION` không chứa `egnt-retail`, setup tự thêm tiền tố này.
- `stop.sh` dọn pid file, repo-scoped process, session tmux `egnt-retail`, session cũ `retail-agent`, và các port dự án.
- `clean.sh`/`clean.ps1` xóa rác tạm root-level như `.tmp*` và `test-results`, không đụng `.codex/skills` hoặc evidence/report.
- Banner README dùng GIF dashboard trace từ task nặng, thay cho GIF cũ bị lỗi decode.
- Thêm `.gitattributes` để shell script luôn giữ LF trên Linux.

## Verify

- `docker compose -f infra/docker/docker-compose.yml config --quiet`: pass.
- PowerShell parser cho `setup.ps1`, `stop.ps1`, `clean.ps1`: pass.
- Đã dọn các thư mục `.tmp*` và `test-results` còn sót ở root repo.
