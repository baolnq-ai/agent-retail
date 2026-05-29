# Chat reasoning loader - 2026-05-29

## Mục tiêu
Kiểm tra trạng thái chatbot khi backend/model đang reasoning lâu, chưa trả token hoặc final response.

## Thay đổi đã kiểm tra
- `chat-widget` nhận class `busy` khi `isChatBusy = true`.
- Progress line có shimmer chạy độc lập.
- `assistant-pulse` và typing dots dùng keyframe riêng, không phụ thuộc token stream.
- Cursor streaming có blink khi có token.

## Evidence
| File | Nội dung |
| --- | --- |
| `chat-reasoning-loader-busy.png` | Playwright giữ stream chat mở bằng mocked stream để widget đứng ở trạng thái reasoning lâu; loader vẫn hiện ở header, status panel và typing bubble. |
| `home-size-fixed-mobile-v2.png` | Home mobile sau fix: hero, ảnh và search không còn nở rộng quá viewport. |
| `home-size-fixed-desktop-v2.png` | Home desktop sau fix: hero giữ sizing ổn, không bị grid shell kéo vỡ. |

## Validation
- `corepack pnpm --filter @retail-agent/web test`: pass 5/5.
- `corepack pnpm --filter @retail-agent/web typecheck`: pass.
- Mobile đo bằng Playwright: viewport 390px, `product-led-home` 370px, ảnh 342px, search 342px, `scrollWidth` 390px.
 
## Final viewport pass
- `home-desktop-final-v3.png`: home desktop 1918px full-bleed, no container side bars, no horizontal page overflow.
- `products-desktop-final-v2.png`: products desktop keeps banner/list and does not overflow.
- `products-mobile-final-v2.png`: products mobile uses the shared navbar and does not overflow.
- `product-detail-desktop-final.png`: product detail desktop grid does not overflow.
- `product-detail-mobile-final.png`: product detail mobile media/card layout does not overflow.
- Playwright layout check: `/`, `/products`, and `/products/prod_smart_10` on desktop/mobile all have `scrollWidth = clientWidth`; home next arrow changes the active slide.

## Navbar/button alignment pass
- `home-nav-button-final-v2.png` and `products-nav-button-final-v2.png`: desktop navbar home/products now share the same measured box: `left=196`, `top=14`, `width=1180`, `height=58`.
- `home-mobile-nav-button-final-v4.png` and `products-mobile-nav-button-final-v4.png`: mobile navbar home/products now share `left=10`, `top=8`, `width=370`, `height=120`, with centered nav row.
- Home carousel arrows use centered stroke controls on desktop and are hidden on mobile to avoid overlapping the product image.
- Product/catalog buttons were measured with no clipped controls: clipped button list is empty, and page horizontal overflow remains false.
