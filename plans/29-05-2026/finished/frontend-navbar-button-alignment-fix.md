# Frontend navbar and button alignment fix - 29-05-2026

## Mục tiêu
- Sửa nút carousel home còn lệch tâm.
- Sửa nút trong product/catalog bị cắt chữ hoặc cắt viền.
- Đồng bộ navbar home/products/detail về cùng component style và cùng số đo hiển thị.
- Test bằng browser thật, có ảnh evidence và số đo layout.

## Checklist
- [x] Đo layout hiện tại bằng Playwright cho home, products và product detail.
- [x] Chốt CSS cuối file cho navbar, arrow, catalog/detail buttons.
- [x] Chụp lại desktop/mobile sau sửa.
- [x] Kiểm tra `scrollWidth = clientWidth`, navbar rect khớp, button không bị clip.
- [x] Chạy typecheck và test web.
- [x] Chuyển plan sang `finished` khi xong.

## Kết quả
- Desktop home/products/detail có cùng navbar box ở viewport 1572px: `left=196`, `top=14`, `width=1180`, `height=58`.
- Mobile home/products có cùng navbar box ở viewport 390px: `left=10`, `top=8`, `width=370`, `height=120`.
- Home arrow desktop đã canh tâm bằng hai stroke; mobile ẩn arrow để không đè ảnh.
- Product/catalog buttons không còn bị clip theo kiểm tra `scrollWidth/clientWidth`.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass 5/5.
