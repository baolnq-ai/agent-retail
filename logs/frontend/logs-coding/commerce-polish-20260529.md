# Commerce Polish - 2026-05-29

## Đã Làm
- Cập nhật `AppShell` navbar, theme icon button và copy public-facing.
- Cập nhật `RetailChatWidget` launcher thành icon chatbot, thêm icon actions và animation popup.
- Thêm `ProductsClient` để lọc tìm kiếm ngay trên client.
- Cập nhật home thành banner/carousel commerce thay vì block title thô.
- Cập nhật CSS cuối file cho typography, card, button, navbar, chat pulse và Next dev indicator.
- Đổi catalog fetch sang revalidate ngắn để route sản phẩm/cart/detail nhẹ hơn.

## Validation
- `corepack pnpm validate`: pass.
- `corepack pnpm --filter @retail-agent/web test`: pass, 4 tests.
- Tunnel `/agent-dashboard`: HTTP 200.
- Screenshot evidence đã lưu trong `tests/frontend tests/commerce-polish-20260529/`.
