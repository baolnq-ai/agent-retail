# Plan: Video-led storefront refinement

## Mục tiêu
- Bám theo video reference `1af8b263-7a1c-4223-9162-0db19c6f3a30.mp4` thay vì hero headline khổng lồ.
- Không dùng title lớn phô web; chuyển sang product-first, text nhỏ gọn, copy/description chuyên nghiệp.
- Sửa tổng thể frontend liên quan: home hero, catalog hero, cards, CTA, motion, spacing và responsive.

## Phạm vi
1. Trích frame video reference để hiểu layout, motion, hierarchy.
2. Audit các đoạn text hiện tại còn quá casual hoặc quá lớn.
3. Sửa `page.tsx`, `products-client.tsx`, CSS cuối file để giảm headline, tăng sản phẩm/visual/motion.
4. Chạy test/typecheck/setup, chụp evidence desktop/mobile.
5. Cập nhật docs/log/test evidence và chuyển plan sang finished.

## Tiêu chí pass
- Không còn headline hero/catalog cỡ khổng lồ chiếm màn hình.
- Product visual/animation là điểm nhìn chính; title chỉ đóng vai trò nhãn/copy ngắn.
- Description chuyên nghiệp, không dùng câu chữ thô/casual.
- Layout không overlap ở desktop/mobile.
- Test web và validate pass, có screenshot evidence.

## Kết quả 2026-05-29
- Home đã chuyển sang full-bleed xanh đen, không còn cảm giác bị đóng trong container.
- Carousel home tách thành `HomeProductShowcase` client component; nút trước/sau đổi slide bằng state thật.
- Metadata sản phẩm giảm cỡ chữ, dùng scrim nhẹ để không mất chữ khi ảnh cùng tông.
- Products page vẫn giữ banner/list, chỉ chỉnh copy theo hướng buyer-facing.
- Evidence đã lưu tại `tests/frontend tests/video-led-home-refinement-20260529/`.
- Evidence final ưu tiên: `home-fullbleed-frame-1-fixed.png`, `home-fullbleed-mobile-final-v2.png`, `products-kept-banner-list-copy-fixed.png`.
- Pass bổ sung sau feedback:
  - Navbar home/products đã thống nhất style.
  - Light/dark mode home hoạt động rõ, text không bị chìm.
  - Deal strip không còn nút giả, các chip đều là link thật.
  - Products title giảm tiếp để không còn quá to.
  - Scrollbar và page-enter animation đã được chỉnh theo theme.
- Validation:
  - `corepack pnpm --filter @retail-agent/web test`: pass 4/4.
  - `corepack pnpm --filter @retail-agent/web typecheck`: pass.
  - `http://127.0.0.1:3120/`: HTTP 200.
  - `http://127.0.0.1:3120/products`: HTTP 200.
