# Dashboard Flow Continuous Evidence - 2026-05-25

## Scope
- Cập nhật sơ đồ agent theo kiểu network graph gọn: node nổi trên nền lưới tối, không còn playback tuần tự.
- Mọi cạnh đang hiển thị chạy animation liên tục cùng lúc bằng SVG dash + canvas moving pulse.
- Màu graph chính chỉ còn 2 nghĩa:
  - Xanh lá: gửi đi.
  - Xanh dương: trả về.
- Đường 2 chiều được tách offset để không đè lên nhau.

## Evidence
- `app/01-dashboard-continuous-flow.png`: ảnh toàn trang dashboard ở trạng thái demo trace.
- `app/02-dashboard-graph-large.png`: ảnh viewport cao để thấy trọn sơ đồ agent và phần metric dưới.
- `app/03-dashboard-graph-flow-later.png`: ảnh chụp sau virtual time dài hơn để kiểm tra dashboard vẫn render ổn khi animation chạy.
- `app/05-live-dashboard-short-tail.png`: ảnh live trace sau khi giảm tail animation, bỏ mũi tên và sửa màu legend.
- `app/06-live-dashboard-full-graph.png`: ảnh live trace viewport cao để xem trọn graph.
- `app/07-live-dashboard-dot-animation.png`: ảnh live trace sau fix cuối, dùng dot animation thay vì trail/mũi tên.
- `app/08-live-dashboard-particles-only.png`: ảnh live trace sau khi ẩn hẳn đường SVG, chỉ còn hạt chạy.
- `app/dashboard-flow-animation.gif`: bằng chứng động từ 18 frame Chrome CDP, chứng minh particle-only animation đang chạy trên dashboard thật.
- `reports/dashboard-edge-dom-backend-report.json`: report đối chiếu DOM edge với `graphEdges` từ API latest.
- `reports/dashboard-animation-motion-report.json`: report đối chiếu 2 frame canvas, xác nhận animation không bị đứng yên dù `prefers-reduced-motion` bật.

## Verification
```powershell
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/web exec node tests/runtime-agent-dashboard.mjs
```

Result:
- Typecheck: pass.
- Web tests: 3/3 pass.
- Runtime dashboard route: pass.
- DOM/backend report: pass (`allDomEdgesExistInApiGraphEdges`, `noSvgArrowMarkers`, `onlyTwoVisualEdgeTones`, `legendUsesGreenForOutboundAndBlueForReturn`, `canvasPresent`).
- Motion report: pass (`animationFrameChanged: true`, `noSvgMarkers: true`, `svgPathHidden: true`, `legendUsesDots: true`).

## Latest Check - Chat CSS And Flow Order
- `app/09-chat-product-card-css-fixed.png`: real frontend chat after sending `Toi muon xem san pham phu hop`; product card image/copy/button no longer overlap on mobile chat width.
- `app/10-dashboard-flow-order-timeline.png`: real `/agent-dashboard` after the chat run; timeline pins the important backend order: `Lead -> Tu van`, `Tu van -> LLM`, `LLM -> Tu van`, `Tu van -> Text`.
- `app/11-dashboard-flow-animation-frame-a.png` and `app/12-dashboard-flow-animation-frame-b.png`: consecutive real dashboard frames proving particle animation changes over time.
- `reports/dashboard-flow-order-chat-css-report.json`: CDP audit for chat product card bounding boxes plus dashboard DOM edge/backend trace comparison.

Latest result:
- Chat card audit: pass (`productCardCount: 1`, `overlapCount: 0`).
- Dashboard order audit: pass (`domEdgeCount: 13`, `routeChipCount: 6`, no arrow marker).
- Backend consistency: pass (`allDomEdgesInBackend: true`, `hasVisibleSalesReturnChain: true`).
- Animation: pass (`animationChanged: true`).
