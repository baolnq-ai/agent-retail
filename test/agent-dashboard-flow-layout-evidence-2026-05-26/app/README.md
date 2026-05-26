# App Screenshots

## Ảnh Chính

- `08-dense-fullwidth-canvas.png`: dense trace desktop, canvas full-width, có Context/Task/History, agents có tương tác, Tool, DB/State và Response.
- `09-cart-fullwidth-canvas.png`: cart trace desktop, có Cart agent, cart tool, Postgres, LLM và response path.
- `10-recommendation-mobile-canvas.png`: recommendation trace mobile, canvas cao hơn để tránh chèn node.
- `12-realtime-fullwidth-db-fixed.png`: trace realtime `/agent-dashboard` không dùng demo, đã bỏ node text/result phụ khỏi canvas và giãn DB/LLM lane.
- `13-realtime-simplified-lines.png`: trace realtime sau khi bỏ các line read/write Task gây rối.
- `14-realtime-agent-grid.png`: trace realtime sau khi ép agent vào grid 2 cột theo id agent.
- `18-realtime-node-clusters-vietnamese-clean.png`: trace realtime dạng node cluster, bỏ khung vùng lớn, Lead ở giữa agent, phiên/task/history bên trái, tool + DB/LLM bên phải; metrics không overlap, không clipping, không text overflow.
- `20-task-node-popup-vietnamese-clean.png`: popup Task sau khi bấm node, thông tin flow đã Việt hóa và không bị cắt.
- `21-icon-node-canvas-clean.png`: desktop canvas sau khi đổi node sang icon/shape, chữ ẩn khỏi node, số bước vẫn nằm trong node; metrics không overlap, không clipping, không step overflow.
- `25-icon-node-mobile-clean.png`: mobile canvas icon/shape, 3 cột node rõ hơn; metrics không overlap, không clipping, không step overflow.
- `27-icon-node-hover-tooltip-clean.png`: hover tooltip trên node Lead, hiện tên/loại/trạng thái/bước chạy; metrics có tooltip, không clipping, không overflow.
- `28-icon-node-role-tooltip-clean.png`: hover tooltip trên node Lead có thêm vai trò agent và tương tác nhận/gửi trong phiên; metrics có tooltip, không clipping, không overflow.

## Ảnh Trung Gian Đã Dùng Để Tinh Chỉnh

- `01-dense-desktop-v2.png`, `02-cart-desktop-v2.png`, `03-recommendation-mobile-v2.png`: vòng đo đầu, còn overlap nên chưa dùng làm pass cuối.
- `05-dense-fullwidth-desktop.png`, `06-cart-fullwidth-desktop.png`, `07-recommendation-mobile-tall.png`: vòng nới full-width, sau đó chụp lại bằng `captureBeyondViewport`.
- `04-tool-detail-popup-v3.png`: popup tool sau khi gom tool và dịch thêm nhãn phổ biến.
