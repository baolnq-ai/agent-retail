# Evidence kiểm tra dashboard line/node

Ngày kiểm tra: 2026-05-26.

## Nội dung

- `app/dashboard-no-horizontal-overflow.png`: ảnh chụp dashboard sau khi sửa width theo container cha, không còn thanh kéo ngang ở viewport 1600x900.
- `app/dashboard-90vw-memoized-lines.png`: ảnh chụp canvas sau khi giảm về `min(100%, 90vw)` và memo hóa path line để giảm render lại khi hover/click.
- `app/dashboard-node-overlap-fixed-dense-v14.png`: ảnh chụp trace nặng sau khi chỉnh lane theo agent, giữ cụm gần agent chủ và không còn node chèn nhau.
- `app/dashboard-legend-separated-canvas.png`: ảnh chụp sau khi tách chú thích ra khỏi canvas flow để legend không đè lên node.
- API `prompt-settings` trả về 6 prompt trong DB: `quality-gate-system`, `recommendation-system`, `sales-evaluator-system`, `sales-revision-system`, `sales-system`, `user-analysis-system`.
- Tab Prompt trên dashboard đã tải được 6 prompt, textarea có nội dung DB và trạng thái “Đã tải 6 prompt từ cơ sở dữ liệu.”
- DOM audit trace nặng: `nodeCount = 30`, `overlapCount = 0`, `horizontalOverflow = -15`.
- Legend audit: `canvasContainsLegend = false`, `separated = true`, `legendNodeHits = []`.
- Animation audit nhiều frame: `lineMoves = true`, `canvasMoves = true`, `canvasHasParticles = true`; line vẫn chạy `graphPathFlow` trong `14s`.

## Lệnh đã chạy

- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- `node .tmp/check-node-overlap-dense.mjs`
- `node .tmp/check-node-overlap.mjs`
- Chrome CDP audit trên `http://127.0.0.1:7000/agent-dashboard?demoTrace=dense`.
