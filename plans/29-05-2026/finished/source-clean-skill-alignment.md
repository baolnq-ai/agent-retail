# Plan clean source theo skill

Ngày: 29-05-2026

## Mục tiêu

Clean source để repo khớp với các skill đang có trong `.codex`, cộng với hướng dẫn trong `.github` và `CLAUDE.md`.

## Skill đã nạp

- `plan-skill`: tạo plan trong `plans/29-05-2026/running/`, triển khai xong chuyển sang `finished/`.
- `backend-skill`: backend rõ cấu trúc, tên rõ nghĩa, không hardcode config, có docs/log/test evidence.
- `frontend-skill`: frontend rõ cấu trúc, không code dư, test qua web khi chạm UI, có docs/log/test evidence.
- `security-skill`: rà auth, CORS, secret, logging, dependency, public error và config production.
- `readme-style`: README tiếng Việt, có ngày cập nhật, link đúng, port rõ, kết thúc bằng `dev by ambrouse`.
- `push-code-skill`: chỉ áp dụng nếu có commit/tag/push, hiện chưa commit hoặc push.
- `.github/workflows/ci.yml`: validate bằng install, generated clients, typecheck, API test, build và compose config.
- `CLAUDE.md`: thay đổi gọn, không refactor lan rộng, verify bằng tiêu chí rõ.

## Checklist triển khai

1. Audit cấu trúc repo, package scripts, CI, docs/logs/test evidence và các path có nguy cơ lệch skill.
2. Chạy validation nền để lấy lỗi thật: `prepare:generated`, typecheck, API tests/build khi có thể.
3. Sửa naming/format/logic có rủi ro thấp và tác động trực tiếp tới yêu cầu clean source.
4. Cập nhật docs/logs/evidence theo đúng thư mục skill, không spam nhiều file test report.
5. Rà security cơ bản: `.env.example`, hardcoded secrets, CORS, cookie/session flags, public errors.
6. Chạy lại validation sau sửa.
7. Chuyển plan sang `plans/29-05-2026/finished/source-clean-skill-alignment.md` và báo cáo kết quả.

## Tiêu chí pass

- Không đụng ngược thay đổi user đang có trong `.codex/skills`.
- Validation phù hợp của repo chạy được hoặc có lý do rõ nếu bị chặn bởi môi trường.
- README/docs/logs mới không có link chết hiển nhiên và dùng tiếng Việt có dấu.
- Không thêm secret, mock/fallback test mới hoặc hardcode config nhạy cảm.

## Kết quả triển khai

- Đã chuẩn hóa root evidence folder sang `tests/` và tên benchmark 100 thành `benchmark-100`.
- Đã bỏ fallback model URL hardcode trong backend runtime config, chuyển sang đọc `.env` hoặc `.env.example`.
- Đã sửa mojibake trong active source/test của `apps/api`, `apps/web` và format lại backend module.
- Đã thêm docs/log/evidence cho backend/frontend theo skill.
- Validation pass: `corepack pnpm validate`, web test, workspace build, Docker Compose config và syntax check runner benchmark.
