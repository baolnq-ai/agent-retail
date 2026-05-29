# Plan rà lại source theo skill mới

Ngày: 29-05-2026

## Mục tiêu

Nạp lại skill mới trong `.codex`, so sánh các chỉnh sửa vừa làm với yêu cầu mới, rồi sửa các điểm lệch còn lại.

## Skill đã nạp lại

- `plan-skill`: plan đặt trong `plans/29-05-2026/running/`, xong chuyển sang `finished/tên plan.md`.
- `backend-skill`: docs backend trong `docs/backend`, logs backend trong `logs/backend`, test evidence trong `tests/backend tests`.
- `frontend-skill`: docs frontend trong `docs/frontend`, logs frontend trong `logs/frontend`, test evidence trong `tests/frontend tests`, screenshot nếu có frontend runtime.
- `security-skill`: không hardcode secret, không log dữ liệu nhạy cảm, CORS allowlist.
- `readme-style`: README/docs hub có ngày cập nhật, link đúng, tiếng Việt có dấu, cuối trang có `dev by ambrouse`.
- `.github/workflows/ci.yml`: generated clients, typecheck, API tests, build, compose config.
- `CLAUDE.md`: sửa gọn, đúng phạm vi, không refactor lan rộng.

## Việc cần sửa sau khi reload skill

1. Đổi plan đã hoàn thành từ `plan1.md` sang tên plan rõ nghĩa.
2. Chuyển evidence mới từ `tests/backend tests/source-clean` và `tests/frontend tests/source-clean` sang đúng cấu trúc `tests/backend tests/source-clean` và `tests/frontend tests/source-clean`.
3. Bổ sung docs service cụ thể trong `docs/backend/*.md` và `docs/frontend/*.md`.
4. Bổ sung logs riêng trong `logs/backend/logs-coding` và `logs/frontend/logs-coding`.
5. Cập nhật các index/link bị ảnh hưởng.
6. Chạy lại validation phù hợp; ghi rõ blocker nếu Docker/DB hoặc screenshot frontend không chạy được trong môi trường hiện tại.

## Tiêu chí pass

- Không còn link trỏ tới evidence path cũ do lượt vừa sửa tạo ra.
- Tên plan trong `finished/` là tên mô tả, không phải `plan1.md`.
- Docs/log/evidence mới khớp path skill mới.
- Validation không fail do các chỉnh sửa này.

## Kết quả triển khai

- Đã đổi plan đã hoàn thành sang `plans/29-05-2026/finished/source-clean-skill-alignment.md`.
- Đã chuyển evidence sang `tests/backend tests/source-clean` và `tests/frontend tests/source-clean`.
- Đã thêm docs service: `docs/backend/source-clean.md`, `docs/frontend/source-clean.md`.
- Đã thêm logs riêng: `logs/backend/logs-coding/source-clean-20260529.md`, `logs/frontend/logs-coding/source-clean-20260529.md`.
- Đã thêm README logs backend/frontend và cập nhật index link có khoảng trắng bằng cú pháp `<...>`.
- Validation pass: `corepack pnpm validate`, `corepack pnpm --filter @retail-agent/web test`, `node --check tests/benchmark-100/scripts/run-benchmark-100.mjs`, hai lệnh Docker Compose config.
- Blocker còn lại: Docker daemon chưa mở nên chưa chạy được runtime request DB; repo hiện không có Playwright/browser screenshot tool nên chưa tạo screenshot frontend thật.
