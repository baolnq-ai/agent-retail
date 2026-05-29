# Storefront Motion Redesign - 2026-05-29

## Mục tiêu

Làm lại cảm giác frontend theo hướng web thương mại end-user, bỏ kiểu page title/card dashboard thô ở đầu trang. Thiết kế mới tham khảo tư duy scene hero, dot grid, object lớn, CTA rõ và motion nhẹ từ Sui, Carrot và gallery Godly.

## Thay đổi chính

| Khu vực | Kết quả |
| --- | --- |
| Header/nav | Nav gọn hơn, có icon giỏ hàng/tài khoản, nút sáng tối dạng icon |
| Trang chủ | Hero thành motion scene, nền dot grid, sản phẩm thật làm visual chính, category chips và marquee benefit |
| Carousel | Thêm rail sản phẩm nổi bật dạng ngang, snap scroll, hover nâng nhẹ |
| Catalog | Banner mới không còn title page thô, thêm product rail và filter/search tức thì trên client |
| Product cards | Card gọn, ảnh lớn hơn, hover mượt, popup xem nhanh có animation mở |
| Mobile | Layout một cột, CTA/search không overlap, typography giảm theo container |
| Accessibility | Có `prefers-reduced-motion` để giảm animation khi người dùng yêu cầu |

## Reference đã xem

- Sui: hero full scene, nav compact, headline lớn, CTA rõ.
- Carrot: màu nền mạnh, typography dứt khoát, dot grid và object visual lớn.
- Godly Carrot gallery: xác nhận tag phong cách clean, colourful, illustrative, scrolling animation.

## Evidence

Ảnh reference và ảnh sau redesign nằm tại:

- `tests/frontend tests/reference-study-20260529/`
- `tests/frontend tests/storefront-motion-redesign-20260529/`

## Validation

| Kiểm tra | Kết quả |
| --- | --- |
| `corepack pnpm --filter @retail-agent/web test` | Pass 4/4 |
| `corepack pnpm validate` | Pass workspace typecheck + API tests 99/99 |
| `.\setup.ps1` | Ready, API/Web/nginx chạy lại với code mới |
| Local screenshots | Home/products desktop và mobile đã chụp |
| Tunnel | Home và products trả 200 tại thời điểm test |
