# Phase 14 Chat Unlock Fix Log

- Thời gian: 2026-05-15
- Task: sửa khung chat frontend không tương tác được, quick replies không bấm được và nút gửi bị mờ.

## Hoạt động chính

- Tạo task tracking `#29 Fix locked chat widget interactions`.
- Kiểm tra `retail-client.tsx` xác nhận trạng thái bận đã được tách `isChatBusy` / `isActionBusy`.
- Bỏ điều kiện disable nút `Gửi` khi input rỗng; nếu gửi lúc rỗng thì dùng gợi ý mặc định đầu tiên.
- Quick replies vẫn chỉ bị khóa khi chat đang stream.
- Restart process cũ trên port `7000` để tránh browser/web server chạy bundle cũ.
- Build lại Next.js và start web với `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:7010`.
- Xác nhận `http://127.0.0.1:7000/` trả HTTP 200 sau restart.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web test:runtime
```

## Ghi chú

- Triệu chứng user thấy nhiều khả năng đến từ bundle cũ trên port 7000 cộng với nút gửi bị disable khi input trống.
- Bản mới đã restart live trên port `7000`.
