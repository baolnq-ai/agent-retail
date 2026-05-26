# Phase 0 Runtime Verification Log

- Thời gian: 2026-05-14
- Task: cập nhật plan theo `plan-skill` và bắt đầu triển khai skeleton Nest + Next

## Hoạt động chính

- Đọc các skill bắt buộc: `project-workflow`, `backend-skill`, `frontend-skill`, `documentation-skill`, `logging-skill`, `push-code-skill`.
- Cập nhật `plans/archive/initial-roadmap/master-implementation-roadmap.md` để bắt buộc runtime test thật, request HTTP thật, không tính smoke/fallback là pass.
- Xác nhận source ban đầu gần như chỉ có docs/plans/logs, chưa có app code/package.json.
- User chọn stack `Nest + Next`.
- Tạo monorepo pnpm với `apps/api`, `apps/web`, `packages/shared`.
- Tạo API health endpoint và web landing page tối thiểu.
- Tạo runtime tests spawn service thật và gửi HTTP request thật.

## Vấn đề gặp phải và cách xử lý

- `pnpm` không có trong PATH: dùng `corepack pnpm` trong scripts.
- API không resolve shared package lúc typecheck: build shared trước và dùng workspace package output.
- Web runtime test ban đầu spawn `npx` lỗi `EINVAL` trên Windows: đổi sang spawn Node trực tiếp với Next CLI resolved bằng `createRequire`.
- Web runtime test ban đầu nhận HTML app cũ trên port 3100: đổi sang port ngẫu nhiên cao để tránh va chạm process cũ.

## Kết quả kiểm tra

Đã chạy pass:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime tests pass:

- API: `GET /health` qua HTTP request thật, response status/body đúng.
- Web: `/` qua HTTP request thật tới `next start`, HTML chứa nội dung frontend mới.

## Trạng thái

Phase 0 pass. Chưa push vì thư mục hiện chưa là git repository và cần user xác nhận repo/git workflow trước khi push theo `push-code-skill`.
