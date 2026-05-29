# Plan: Frontend storefront motion redesign

## Muc tieu
- Bỏ cảm giác title/page header thô, không còn giống dashboard.
- Làm lại tổng thể storefront/catalog theo hướng thương mại end-user: banner scene, carousel, nav gọn, nút đẹp, text sắc nét, chuyển động mượt.
- Tham khảo tư duy thiết kế từ Sui và Carrot: scene hero, motion theo lớp, section có nhịp, card/CTA mềm nhưng không rối.
- Kiểm tra bằng ảnh desktop/mobile và test thật qua web đang chạy.

## Pham vi
1. Nghiên cứu reference qua source web và screenshot local bằng Playwright.
2. Audit `apps/web/src/app/page.tsx`, `products/products-client.tsx`, `app-shell.tsx`, `styles.css` và các test liên quan.
3. Sửa hero, catalog banner, carousel, filter/search, product card, nav/header, button, popup details và animation.
4. Loại bỏ/override các CSS cũ làm giao diện giống dashboard hoặc chữ to/thô/mờ.
5. Chạy `corepack pnpm --filter @retail-agent/web test`, `corepack pnpm validate`, kiểm tra runtime bằng browser ảnh desktop/mobile.
6. Ghi docs/log/test evidence và đóng plan vào finished.

## Tieu chi pass
- Trang chủ và `/products` không còn layout dạng title đầu trang/card dashboard.
- Có banner/carousel/animated product scene rõ ràng, motion mượt và có reduced-motion fallback.
- Search/filter trên `/products` vẫn xử lý tức thì trong client, không reload trang.
- Text không overlap trên desktop/mobile; nút/nav không thô.
- Screenshot evidence lưu trong `tests/frontend tests/`.

## Ket qua 2026-05-29
- Đã nghiên cứu Sui, Carrot và Godly bằng web source + Playwright screenshot.
- Đã sửa tổng thể frontend: header/nav, home hero, catalog banner, product rail, carousel, filter/search, product card, popup xem nhanh, responsive mobile và motion CSS.
- Đã bỏ kiểu page title đầu trang thô; thay bằng scene commerce có sản phẩm thật và dot grid.
- Đã chạy `.\setup.ps1`, `corepack pnpm --filter @retail-agent/web test`, `corepack pnpm validate`.
- Đã chụp evidence desktop/mobile tại `tests/frontend tests/storefront-motion-redesign-20260529/`.
- Tunnel home và products trả 200 tại thời điểm test.
