# Phase 12 Chat Popup UX Polish

- Thời gian cập nhật: 2026-05-15
- Task: chỉnh UX chat popup để không scroll loạn, text không tràn ngang, product suggestions kéo ngang đẹp hơn.

## Nội dung đã sửa

- Chat messages chỉ scroll dọc, chặn scroll ngang toàn khung chat.
- Text trong chat bubble wrap/word-break để không kéo dài vượt khung.
- Scrollbar dọc của chat được làm mảnh và đồng bộ màu theme.
- Product suggestion strip trong chat là vùng duy nhất scroll ngang.
- Ẩn scrollbar ngang của product strip bằng `scrollbar-width: none` và `::-webkit-scrollbar { display: none; }`.
- Thêm fade mask, arrow `›`, cursor grab/grabbing và animation nhẹ để user biết có thể kéo ngang.
- Quick replies nhỏ gọn hơn, ellipsis khi dài để không chiếm diện tích chat.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web test:runtime
```

## Runtime live

Đã restart frontend port `7000` và xác nhận:

```txt
chat-popup-live-ok
```
