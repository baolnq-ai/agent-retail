# Plan: sửa tunnel Cloudflare bị đơ web

Ngày: 29-05-2026

## Mục tiêu
- Kiểm tra link tunnel `https://screensaver-constructed-entered-tales.trycloudflare.com/`.
- So sánh tunnel public với local nginx `http://127.0.0.1:3120`.
- Tìm nguyên nhân web đơ/load không được khi đi qua tunnel.
- Sửa config/script/code cần thiết, không hardcode secret hoặc domain cố định nếu có thể tránh.
- Đưa toàn bộ URL runtime/tunnel/API public vào `.env` và `.env.example`; `.env.example` không để lộ endpoint vLLM/embed thật.
- Quét current source và git history để bảo đảm endpoint model/API thật không còn tra được trên GitHub sau khi push history đã lọc.
- Cập nhật README/docs/log/evidence theo skill.

## Các bước
1. Đo HTTP local và HTTP tunnel cho `/`, `/health`, `/api/v1/products`, asset `_next`.
2. Kiểm tra process tunnel/cloudflared và target port đang forward.
3. Kiểm tra env public URL/API URL hiện tại, CORS, nginx proxy header và Next runtime log.
4. Sửa nguyên nhân gốc: tunnel target sai port, public API URL sai, host/origin/CORS, hoặc nginx timeout/proxy header.
5. Chuẩn hóa `.env` và `.env.example` để người dùng đổi tunnel/domain/model URL tại một chỗ.
6. Quét working tree bằng pattern endpoint nhạy cảm, thay bằng placeholder ở file tracked/docs.
7. Quét git history bằng pattern endpoint nhạy cảm; nếu có, lọc history bằng công cụ phù hợp và verify lại.
8. Chạy lại setup/tunnel validation, chụp screenshot frontend nếu tunnel load được.
9. Cập nhật docs/log/test evidence và chuyển plan sang `finished`.

## Tiêu chí hoàn thành
- Tunnel public trả HTTP `200` cho web entry.
- API qua tunnel trả HTTP `200`.
- Browser không còn treo do gọi `127.0.0.1` từ domain public.
- README có ghi cách chạy tunnel đúng với port `3120`.
- `.env.example`, README, docs/log/test tracked không chứa endpoint model/API thật.
- Git history local sau lọc không còn match endpoint nhạy cảm đã quét.

## Completion Notes - Secret Endpoint History Cleanup
- Current tracked source scan: no matches for the private endpoint pattern set.
- Git reachable history blob scan: no matches for the private endpoint pattern set.
- Local `main` history was rewritten and GitHub `origin/main` was force-updated with `--force-with-lease`.
- Remote `origin/main` now points to sanitized commit `42dfc15eba917e05825eec590c7758c376794fd1`.
- Validation passed: `corepack pnpm validate` and `setup.ps1` parser check.
- `bash -n setup.sh` could not run because WSL has no `/bin/bash` in this environment.
