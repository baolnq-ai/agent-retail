# Evidence dashboard line animation 2026-05-26

Thư mục này lưu ảnh kiểm tra cho chỉnh sửa animation đường line trên dashboard agent.

## Phạm vi

- Chỉ chỉnh animation của đường line SVG để loop mượt hơn và chậm hơn.
- Không đổi tốc độ, kích thước hoặc màu của hạt chạy trên canvas.
- Tăng số edge được vẽ hạt để trace dài không bị mất hạt ở nhiều đoạn.

## Ảnh

| File | Nội dung |
| --- | --- |
| `app/dashboard-line-particle-check.png` | Dashboard sau khi chỉnh line dash cycle và số edge có hạt. |
| `app/dashboard-prompt-loaded-visible.png` | Dashboard sau khi restart API 7010, tab Prompt load được `sales-system` từ DB. |
| `dashboard-animation-fixed.gif` | Đoạn animation ghép từ 28 frame CDP để kiểm line/hạt theo thời gian. |
| `video-frames-fixed/frame-*.png` | 28 frame liên tiếp dùng để kiểm chuyển động, không chỉ dựa vào ảnh tĩnh. |

## Verify

- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass.
- `git diff --check`: pass, chỉ có cảnh báo CRLF Windows.
- CDP computed style sau 1,2 giây: `strokeDashoffset` đổi từ khoảng `-18.3992px` sang `-26.8561px`, `animationDuration=14s`.
- So sánh frame 1 và frame 14: vùng His/Task đổi 2,97%, vùng line giữa đổi 1,91%, vùng line phải đổi 2,13%, chứng minh animation có chuyển động.
