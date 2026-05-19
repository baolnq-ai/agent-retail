# Phase 0 Runtime Verification

- Thời gian cập nhật: 2026-05-14
- Task: cập nhật plan theo `plan-skill` và khởi tạo skeleton Nest + Next
- Phạm vi: monorepo skeleton, shared schema, backend health endpoint, frontend home page, runtime tests bằng request thật

## Kết quả triển khai

Đã tạo monorepo tối thiểu:

```txt
apps/
  api/      # NestJS + Fastify adapter
  web/      # Next.js app router
packages/
  shared/   # Shared TypeScript schemas
```

Các file cấu hình chính:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.env.example`
- `.gitignore`

## Runtime endpoints đã có

- API: `GET /health`
  - Response kỳ vọng: `{ "status": "ok", "service": "api", "timestamp": "..." }`
- Web: `/`
  - Render nội dung giới thiệu retail agent và trạng thái frontend runtime.

## Kiểm tra đã chạy

Lệnh đã chạy thành công:

```txt
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:runtime
```

Runtime verification dùng process thật và HTTP request thật:

- API runtime test spawn `node dist/main.js`, gọi `http://127.0.0.1:<port>/health`, assert status/body.
- Web runtime test spawn `next start`, gọi `http://127.0.0.1:<random-port>/`, assert HTML response chứa nội dung đúng.

## Lưu ý kỹ thuật

- Máy có Node `v24.14.1`.
- `pnpm` không có trực tiếp trong PATH, nên scripts dùng `corepack pnpm`.
- Runtime web test dùng port ngẫu nhiên cao để tránh va chạm app cũ đang chạy trên port phổ biến.
- `corepack pnpm install` có cảnh báo ignored build scripts cho `@nestjs/core`, `esbuild`, `sharp`; hiện build/runtime vẫn pass, nhưng cần xử lý chính sách approve-builds trước release nếu CI yêu cầu.

## Trạng thái phase

Phase 0 pass theo yêu cầu runtime thật. Không tính smoke/fallback là pass; API và web đều đã được xác nhận bằng request HTTP thật tới service đang chạy.
