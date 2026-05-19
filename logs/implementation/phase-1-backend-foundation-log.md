# Phase 1 Backend Foundation Log

- Thời gian: 2026-05-14
- Task: backend foundation theo `plan-skill`

## Hoạt động chính

- Đọc lại `backend-skill`, `documentation-skill`, `logging-skill` trước khi triển khai phase.
- Tạo cấu trúc backend theo skill: `config`, `controllers`, `services`, `utils`.
- Thêm env validation cho `API_PORT`.
- Thêm JSON logger cho Nest runtime.
- Thêm correlation id utility dùng header `x-correlation-id`.
- Chuyển health endpoint sang `HealthController` + `HealthService`.
- Health response hiện có dependency status và correlation id.
- Xóa controller cũ không còn dùng.

## Test đã chạy

Pass toàn bộ:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime request thật đã verify:

- API `GET /health` trả HTTP 200.
- Response header `x-correlation-id` giữ đúng giá trị request gửi vào.
- Body có `status=ok`, `service=api`, `dependencies.api=ok`, `correlationId=runtime-request-1`.
- Web `/` vẫn pass runtime HTTP test.

## Khó khăn / xử lý

- Không gặp lỗi runtime mới trong phase này.
- Giữ scope tối thiểu, chưa thêm DB/Redis vì chưa có connection/runtime service thật để test 100%; dependency status hiện chỉ xác nhận API process.

## Trạng thái

Phase 1 pass theo tiêu chí runtime thật. Chưa push vì thư mục hiện chưa là git repository.
