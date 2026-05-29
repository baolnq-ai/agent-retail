# Storefront Motion Redesign Evidence - 2026-05-29

## Mục tiêu

Xác nhận trang chủ và catalog đã chuyển sang trải nghiệm thương mại end-user, không còn title đầu trang thô hoặc bố cục giống dashboard.

## Ảnh chụp

| View | File |
| --- | --- |
| Home desktop | `home-desktop.png` |
| Products desktop | `products-desktop.png` |
| Home mobile | `home-mobile.png` |
| Products mobile | `products-mobile.png` |

## Kết quả

- Header gọn, có icon cho giỏ hàng/tài khoản/sáng tối.
- Home hero là scene lớn với product visual thật, dot grid, CTA và category chips.
- Products page có banner, product rail, search/filter client tức thì và không reload khi lọc.
- Product cards có ảnh lớn, hover mượt, popup xem nhanh mở bằng animation.
- Mobile không thấy text chồng lên nhau trong vùng chính; search và CTA vẫn thao tác được.

## Validation

- `corepack pnpm --filter @retail-agent/web test`: pass 4/4.
- `corepack pnpm validate`: pass.
- `https://screensaver-constructed-entered-tales.trycloudflare.com/`: 200 tại thời điểm test.
- `https://screensaver-constructed-entered-tales.trycloudflare.com/products`: 200 tại thời điểm test.
