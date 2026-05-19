# Phase 16 Real Chat Agent Actions Log

- Thời gian: 2026-05-15
- Task: biến chat thành agent action thật, sửa budget recommendation và product suggestion UI.

## Hoạt động chính

- Chỉnh `CatalogService.searchProducts()` parse budget và hard-filter sản phẩm trước scoring.
- Thêm parser budget cho `dưới/không quá/tối đa/tầm/khoảng` + `tr/triệu/VND`.
- Chỉnh `AgentService.prepareChat()` parse action add-to-cart trước LLM.
- Thêm `parseChatAction()`, `resolveProductReference()`, `parseQuantity()`.
- Khi user nói thêm sản phẩm vào giỏ, backend gọi thật `commerceService.addItem()` và trả cart đã cập nhật.
- Chỉnh product recommendation không mặc định spam 3 sản phẩm; tôn trọng yêu cầu 1/2/3 sản phẩm.
- Chỉ trả policy block khi query có intent policy.
- Chỉnh quick replies bớt spam add/policy không đúng ngữ cảnh.
- Đổi frontend `ProductRecommendationCarousel` sang `ProductRecommendationRail` compact.
- Xóa logic slide nút trái/phải dễ vỡ layout; dùng rail horizontal scroll-snap ẩn scrollbar.
- Thêm runtime assertions cho case dưới 2tr và chat add-to-cart thật.
- Restart API 7010 và web 7000.

## Test đã chạy

Pass:

```txt
corepack pnpm --filter @retail-agent/api typecheck
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
$env:DATABASE_URL='postgresql://retail:retail_password@localhost:55432/retail_agent?schema=public'; corepack pnpm --filter @retail-agent/api test:runtime
corepack pnpm --filter @retail-agent/web test:runtime
```

## Runtime live

Pass:

```txt
GET http://127.0.0.1:7010/health -> ok
GET http://127.0.0.1:7000/ -> 200
```
