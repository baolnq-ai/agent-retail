# App Screenshots

## Latest reviewed screenshots
- `09-chat-product-card-css-fixed.png`: mobile chat evidence for the product card CSS fix; image, copy and add-to-cart button have separate bounds.
- `10-dashboard-flow-order-timeline.png`: dashboard evidence with pinned flow order chips showing the sales return path.
- `11-dashboard-flow-animation-frame-a.png` and `12-dashboard-flow-animation-frame-b.png`: consecutive frames used to verify that particle animation is not static.

Ảnh được chụp bằng Chrome headless từ:

`http://127.0.0.1:7000/agent-dashboard?demoTrace=recommendation`

Các ảnh dùng để kiểm tra trực quan:
- Legend chỉ còn `Gửi đi` và `Trả về`.
- Không còn nút `Pause` / `Replay` trong graph.
- Đường gửi đi dùng xanh lá, đường trả về dùng xanh dương.
- Các node chính không chồng lên nhau trong viewport 16:9 rộng.
- `dashboard-flow-animation.gif` là artifact động từ 18 frame Chrome CDP; kiểm tra particle-only animation đang chạy, không còn đường SVG/mũi tên, và không bị đóng băng khi browser báo `prefers-reduced-motion`.
