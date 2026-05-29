# Video-led home refinement - 2026-05-29

## Mục tiêu
Tinh chỉnh storefront theo góp ý mới: home không dùng title lớn, chuyển thành trải nghiệm product-first giống video reference, giữ màu xanh đen làm chủ đạo và chỉ học cách phối/motion từ các trang tham khảo.

## Thay đổi chính
- Home dùng scene sản phẩm trung tâm, metadata nhỏ ở cạnh dưới/phải, search dạng pill và arrow tối giản.
- Navbar trên home được làm trong, nhỏ, không tạo cảm giác dashboard.
- Animation đổi sản phẩm dùng fade/slide/scale mượt hơn, tránh rung lên xuống.
- Hero home đổi sang full-bleed để nền ngoài và nền scene liền nhau, không còn cảm giác bị đóng trong container.
- Carousel home chuyển sang client component `HomeProductShowcase`, nút trước/sau bấm được thật và đổi active slide bằng state.
- Metadata sản phẩm dùng text nhỏ cùng scrim nhẹ, tránh trùng màu với ảnh nhưng không biến thành title/card lớn.
- Mobile home chỉ render slide chính theo layout dọc để không bị cắt nội dung.
- Products page vẫn giữ banner/list, nhưng copy trong banner chuyển sang ngôn ngữ mua sắm, không nhắc API/Redis.
- Navbar home/products dùng cùng một style floating/pill; không còn mỗi trang một kiểu.
- Light/dark mode trên home có palette riêng, text/brand/meta đọc được ở cả hai theme.
- Deal strip trên home chuyển toàn bộ chip thành link thật; không còn nút giả.
- Thêm page-enter/section-enter animation cho các trang/section còn lại.
- Scrollbar được phối lại theo theme để không lệch màu với nền.
- Chatbot reasoning loader có trạng thái `.busy` và animation độc lập để không đứng hình khi model suy luận lâu.
- Home size lock chặn grid shell kéo hero quá viewport; mobile đo lại không còn overflow ngang.

## File liên quan
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/home-product-showcase.tsx`
- `apps/web/src/app/products/products-client.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/tests/home-content.test.mjs`

## Evidence
- `tests/frontend tests/video-led-home-refinement-20260529/home-final-frame-1.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-final-frame-2-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-final-mobile-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-fullbleed-frame-1-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-fullbleed-mobile-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-fullbleed-mobile-final-v2.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-navbar-dark-theme-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/home-navbar-light-theme-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/products-navbar-title-small-fixed.png`
- `tests/frontend tests/video-led-home-refinement-20260529/products-kept-banner-list-copy-fixed.png`
- `tests/frontend tests/chat-reasoning-loader-20260529/chat-reasoning-loader-busy.png`
- `tests/frontend tests/chat-reasoning-loader-20260529/home-size-fixed-mobile-v2.png`
- `tests/frontend tests/chat-reasoning-loader-20260529/home-size-fixed-desktop-v2.png`

## Validation
- `corepack pnpm --filter @retail-agent/web test`: pass 4/4.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
 
## Final viewport/nav pass
- Home desktop is now forced to a true 100vw full-bleed stage, while slide content stays inside the 1180px content lane.
- Body/html/app shell use a final `overflow-x: clip` guard; `/`, `/products`, and `/products/prod_smart_10` were measured with `scrollWidth = clientWidth` on desktop and mobile.
- The shared commerce header is locked by one final rule for home, products and detail pages; mobile keeps the same component and layout order.
- Home slide arrows are centered, use CSS-drawn chevrons, avoid the default focus outline artifact, and the next arrow was verified to change the active slide.
- Catalog and product detail grids now use `minmax(0, ...)`, smaller catalog headlines, and overflow guards so product content does not spill out.
- New evidence: `tests/frontend tests/chat-reasoning-loader-20260529/home-desktop-final-v3.png`, `products-desktop-final-v2.png`, `products-mobile-final-v2.png`, `product-detail-desktop-final.png`, `product-detail-mobile-final.png`.

## Navbar/button alignment pass
- Home, products and detail use the same measured navbar box on desktop: `left=196`, `top=14`, `width=1180`, `height=58` at 1572px viewport.
- Home and products use the same measured navbar box on mobile: `left=10`, `top=8`, `width=370`, `height=120` at 390px viewport.
- Desktop carousel arrows are centered two-stroke controls; mobile arrows are hidden to avoid covering product media.
- Catalog/product buttons use explicit min-height, line-height and visible overflow; Playwright clipped-control scan is empty.
