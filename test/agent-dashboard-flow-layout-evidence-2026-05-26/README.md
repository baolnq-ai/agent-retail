# Agent Dashboard Flow Layout Evidence - 2026-05-26

- Scope: xác minh layout dashboard agent sau khi chuyển sang node cluster không dùng khung vùng lớn, chỉ hiện agent có tương tác, có node Context/Task/Lịch sử/Tool/DB/LLM/Response và popup thông tin khi bấm node.
- Result: pass.

## Kết Quả Kiểm Tra

- Desktop full-width: canvas rộng khoảng 1518px trong viewport 1600px.
- Mobile: canvas cao 920px, không node overlap hoặc clipping.
- Desktop realtime cuối: `18-realtime-node-clusters-vietnamese-clean.png` có node overlap = 0, clipped nodes = 0, text overflow = 0.
- Popup Task cuối: `20-task-node-popup-vietnamese-clean.png` mở đúng, không bị cắt, không overflow và các nhãn flow chính đã Việt hóa.
- Canvas vẫn giữ route line mỏng, particle canvas và số thứ tự nằm trong node agent/support.
- Icon canvas cuối: `21-icon-node-canvas-clean.png` trên desktop và `25-icon-node-mobile-clean.png` trên mobile đều có node overlap = 0, clipped nodes = 0, step overflow = 0.
- Hover tooltip: `27-icon-node-hover-tooltip-clean.png` có tooltip trên node Lead, không clipped canvas/viewport và không overflow.
- Role tooltip: `28-icon-node-role-tooltip-clean.png` có thêm mô tả vai trò agent và tương tác nhận/gửi trong phiên, không clipped canvas/viewport và không overflow.

## Evidence

- [App screenshots](app/README.md)

## Commands

- `corepack pnpm --filter @retail-agent/web test`
- `corepack pnpm --filter @retail-agent/web typecheck`
- Chrome DevTools Protocol screenshots and DOM assertions: node overlap = 0, clipped nodes = 0, hidden step text = 0.
