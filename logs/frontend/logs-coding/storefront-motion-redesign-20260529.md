# Storefront Motion Redesign Coding Log - 2026-05-29

## Đã làm

- Nghiên cứu reference Sui, Carrot và Godly bằng web source và screenshot Playwright.
- Làm lại trang chủ thành hero scene có sản phẩm thật, dot grid, CTA, category chips và marquee benefit.
- Làm lại `/products` thành catalog scene có product rail, search/filter client tức thì và banner không còn kiểu title đầu trang.
- Cập nhật header/nav, icon giỏ hàng/tài khoản, button styles, product card, carousel và popup xem nhanh.
- Thêm CSS motion mượt, hover nhẹ, `prefers-reduced-motion` fallback và responsive mobile.
- Chạy setup để clear runtime cũ, start lại stack rồi chụp evidence desktop/mobile.

## Validation

| Lệnh/kiểm tra | Kết quả |
| --- | --- |
| `corepack pnpm --filter @retail-agent/web test` | Pass 4/4 |
| `corepack pnpm validate` | Pass |
| `.\setup.ps1` | API 3110, Web 3100, nginx 3120 ready |
| Playwright screenshots | `home-desktop.png`, `products-desktop.png`, `home-mobile.png`, `products-mobile.png` |
| Tunnel home/products | 200 |

## Ghi chú

- Không thêm dependency frontend mới.
- Không ghi secret hoặc endpoint model private vào docs/log/evidence.
- Chat launcher là icon cố định ở góc dưới phải để giữ entry trợ lý mua sắm.
