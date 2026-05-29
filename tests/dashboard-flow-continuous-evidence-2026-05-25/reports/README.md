# Dashboard Reports

## Latest report
`dashboard-flow-order-chat-css-report.json` was generated through Chrome CDP against the real web app and latest API trace. It checks chat product card geometry, dashboard route chips, DOM edge count, absence of arrow markers, canvas animation changes, and backend `graphEdges` consistency.

Latest pass highlights:
- `overlapCount: 0` for the chat product card.
- `allDomEdgesInBackend: true`.
- `hasVisibleSalesReturnChain: true`.
- `animationChanged: true`.

`dashboard-edge-dom-backend-report.json` được tạo từ Chrome CDP sau khi dashboard render live trace.
`dashboard-animation-motion-report.json` lấy 2 frame canvas cách nhau 520ms để xác nhận animation thật sự thay đổi.

Các check chính:
- Tất cả edge SVG trên DOM đều tồn tại trong `api/v1/agent/traces/latest.graphEdges`.
- Không còn SVG marker/mũi tên.
- Visual tone chỉ còn 2 loại: `call` cho gửi đi và `return` cho trả về.
- Legend dùng xanh lá cho gửi đi, xanh dương cho trả về.
- Canvas playback tồn tại để chạy pulse động.
- Canvas frame thay đổi theo thời gian, kể cả khi môi trường báo `prefers-reduced-motion: reduce`.
- SVG path nền bị ẩn (`visibleStrokeCount: 0`) để dashboard chỉ hiển thị hạt đang chạy.
