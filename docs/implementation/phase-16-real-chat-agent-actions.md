# Phase 16 Real Chat Agent Actions

- Thời gian cập nhật: 2026-05-15
- Task: sửa chat từ LLM trả lời đơn thuần thành agent có action thật, đồng thời sửa product suggestion UI và budget recommendation.

## Nội dung đã sửa

### Backend recommendation/search

- `CatalogService.searchProducts()` giờ parse ngân sách tổng quát và hard-filter trước scoring/rerank.
- Hỗ trợ các dạng ngân sách như:
  - `dưới 2tr`
  - `dưới 2 triệu`
  - `không quá 2 triệu`
  - `tầm/khoảng 1.9 triệu`
  - số tiền dạng `1.900.000`
- Query `Tư vấn 1 sản phẩm dưới 2tr` giờ bắt buộc product block chỉ có 1 item và price `<= 2_000_000`.

### Backend agent action

- `AgentService.prepareChat()` thêm bước parse action trước khi gọi LLM.
- Hỗ trợ action thật `add_to_cart` cho các câu như:
  - `Thêm <tên sản phẩm> vào giỏ`
  - `Thêm sản phẩm đầu tiên vào giỏ`
  - `Thêm 2 <tên sản phẩm> vào giỏ`
- Khi resolve được sản phẩm, backend gọi thật `commerceService.addItem()` và response `cart_summary` trả cart đã cập nhật.
- Text final có prefix xác nhận: `Đã thêm ... vào giỏ hàng.`

### Backend product blocks / quick replies

- Không còn mặc định spam 3 sản phẩm.
- Nếu user yêu cầu `1 sản phẩm`, product_list chỉ trả 1 sản phẩm.
- So sánh mặc định trả 2 sản phẩm.
- Policy block chỉ hiện khi query liên quan policy, tránh spam `chính sách đổi trả` sau mọi câu trả lời.
- Quick replies không hiện `Thêm X vào giỏ` sau khi action add-to-cart vừa hoàn tất.

### Frontend suggestion UI

- Bỏ `ProductRecommendationCarousel` slide nút trái/phải vì layout thô và dễ trượt sai.
- Thay bằng `ProductRecommendationRail` kiểu chat app:
  - container compact trong bubble,
  - horizontal rail với scroll-snap,
  - ẩn scrollbar,
  - card nhỏ, ổn định width,
  - header `Gợi ý phù hợp`.
- Test nguồn frontend cập nhật để assert rail mới.

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

Đã restart:

- API: `http://127.0.0.1:7010/health` trả `ok`.
- Web: `http://127.0.0.1:7000/` trả HTTP `200`.
