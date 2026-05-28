# Log frontend branding dashboard prompt 2026-05-26

- Bắt đầu: 2026-05-26 14:16
- Trạng thái: completed
- Plan: `plans/running/plan-frontend-branding-dashboard-prompt-20260526-v1.md`
- Doc: `docs/task/frontend-branding-dashboard-prompt-20260526.md`

## Mục tiêu

- Dùng `logo.png` làm nhận diện chính cho frontend, favicon và metadata chia sẻ link.
- Bỏ phần giải thích flow dạng bảng dưới dashboard canvas vì làm web rối.
- Sửa phần Prompt dashboard để người dùng nhìn thấy và load được prompt từ DB/API rõ ràng.
- Rà và thay các câu mô tả rỗng, không có giá trị product.

## Tiến độ

- 2026-05-26 14:16: Tạo plan/log/doc theo yêu cầu, bắt đầu rà `apps/web`.
- 2026-05-26 14:26: Đã copy `logo.png` vào public/app icon, cập nhật metadata, navbar, copy trang chủ, bỏ các câu mô tả rỗng và giữ Prompt ở tab riêng dưới canvas.
- 2026-05-26 14:30: Prompt API build mới kiểm tra tạm trên port `7110` trả `200`, prompt `sales-system`. Dashboard port `7000` đang trỏ API cũ nên UI hiển thị hướng dẫn restart backend.
- 2026-05-26 14:34: Typecheck/test frontend pass, rà copy không còn các câu rỗng đã nêu.

## Verify

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `corepack pnpm --filter @retail-agent/api build`: pass.
- `GET http://127.0.0.1:7110/api/v1/prompt-settings`: pass với `sales-system`.
- Chrome screenshot: `test/frontend-branding-dashboard-prompt-evidence-2026-05-26/app/`.

## Cập nhật 2026-05-26 15:55

- Sửa layout dashboard cho trace nặng: node có hậu tố `__for__` giữ đúng agent chủ, tool được chia lane theo từng agent, DB/LLM được giữ như hạ tầng dùng chung thay vì bị kéo vào cụm agent.
- Thêm bước resolve node overlap sau khi né line để tránh node bị chèn lại bởi thuật toán routing.
- Đồng bộ hạt playback canvas theo cùng control point của SVG line, tránh hạt chạy lệch hoặc biến mất ở các đoạn line cong.
- Kiểm tra Prompt tab qua Chrome CDP: dashboard tải được 6 prompt từ API/DB, textarea có nội dung và trạng thái báo “Đã tải 6 prompt từ cơ sở dữ liệu.”
- Evidence mới: `test/dashboard-line-node-overlap-evidence-2026-05-26/app/dashboard-node-overlap-fixed-dense-v14.png`.

## Verify bổ sung

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `node .tmp/check-node-overlap-dense.mjs`: `nodeCount = 30`, `overlapCount = 0`.
- Animation multi-frame: `lineMoves = true`, `canvasMoves = true`, `canvasHasParticles = true`.

## Cập nhật 2026-05-27

- Tách `GraphLegend` ra khỏi `.agent-node-canvas`; canvas flow giờ chỉ chứa line, hạt playback, node, hover và popup.
- CSS legend chuyển sang panel riêng cùng bề rộng `90vw`, nằm trước canvas nên không thể đè node khi trace dày.
- Evidence mới: `test/dashboard-line-node-overlap-evidence-2026-05-26/app/dashboard-legend-separated-canvas.png`.

## Verify bổ sung 2026-05-27

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- Chrome CDP audit: `canvasContainsLegend = false`, `separated = true`, `legendNodeHits = []`, `horizontalOverflow = -15`.
