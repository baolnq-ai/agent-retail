# Video-led home refinement - 2026-05-29

## Phạm vi kiểm tra
- Trang home chuyển sang scene sản phẩm trung tâm theo video reference `1af8b263-7a1c-4223-9162-0db19c6f3a30.mp4`.
- Màu chủ đạo giữ xanh đen, chỉ học cách phối, nhịp chuyển cảnh và hierarchy từ reference.
- Trang products vẫn giữ cấu trúc banner/list cho web bán hàng, chỉ chỉnh copy buyer-facing hơn.

## Evidence mới nhất
| File | Nội dung |
| --- | --- |
| `home-final-frame-1.png` | Home desktop frame đầu: navbar trong, sản phẩm là điểm nhìn chính, không dùng title lớn. |
| `home-final-frame-2-fixed.png` | Home desktop frame sau: animation đổi sản phẩm, chip strip không bị cắt chữ. |
| `home-final-mobile-fixed.png` | Home mobile: layout dọc, hero không lệch ngang, search và CTA không overlap. |
| `products-kept-banner-list-copy-fixed.png` | Products page vẫn là banner/list, copy không còn nói API/Redis với người mua. |
| `home-fullbleed-frame-1-fixed.png` | Home full-bleed: bỏ cảm giác container, nền xanh đen liền mạch, text có scrim nhẹ để không chìm ảnh. |
| `home-fullbleed-mobile-fixed.png` | Mobile full-bleed: ảnh full width, text/search tách lớp, không còn co ảnh thành cột. |
| `home-fullbleed-mobile-final-v2.png` | Mobile final: first viewport chỉ còn hero/search/chat, deal strip xuống dưới fold để không bị floating chat che. |
| `home-navbar-dark-theme-fixed.png` | Home dark: navbar thống nhất với products, hero giữ xanh đen, text không chìm ảnh. |
| `home-navbar-light-theme-fixed.png` | Home light: light mode hoạt động rõ, text/brand/meta đổi sang màu đọc được. |
| `products-navbar-title-small-fixed.png` | Products: navbar cùng style với home, catalog title đã giảm size. |

## Validation
- `corepack pnpm --filter @retail-agent/web test`: pass 4/4.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- Local route `http://127.0.0.1:3120/`: HTTP 200.
- Local route `http://127.0.0.1:3120/products`: HTTP 200.
