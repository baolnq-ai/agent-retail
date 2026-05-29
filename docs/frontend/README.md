# Frontend Docs

## Cập Nhật Mới

| Ngày | Nội dung |
| --- | --- |
| 2026-05-29 | Video-led home refinement full-bleed, carousel bấm được và giữ products banner/list: [video-led-home-refinement-20260529.md](video-led-home-refinement-20260529.md). |
| 2026-05-29 | Storefront motion redesign theo reference Sui/Carrot: [storefront-motion-redesign-20260529.md](storefront-motion-redesign-20260529.md). |

- Cập nhật: 2026-05-29
- Phạm vi: tài liệu frontend đang chạy trong `apps/web`.

## Module Hiện Có

| Module | Vai trò | Source |
| --- | --- | --- |
| Storefront | Trang chủ, danh mục, chi tiết sản phẩm | `apps/web/src/app/` |
| Chat retail | Chat widget, streaming token, product rail và quick replies | `apps/web/src/app/retail-client.tsx` |
| Account/cart | Đăng nhập, session cookie, cart theo user | `apps/web/src/app/account/`, `apps/web/src/app/cart/` |
| Agent dashboard | Graph trace, prompt/settings view và demo traces | `apps/web/src/app/agent-dashboard/` |
| Runtime config | Resolve API base URL cho browser/server | `apps/web/src/app/browser-api-base-url.ts` |

## Tài Liệu Service

| Tài liệu | Nội dung |
| --- | --- |
| [source-clean.md](source-clean.md) | Clean source frontend theo skill và validation liên quan |

## Validation Mới Nhất

| Ngày | Kết quả |
| --- | --- |
| 2026-05-29 | `corepack pnpm --filter @retail-agent/web test` pass: 4 frontend tests. |
| 2026-05-29 | `corepack pnpm build` pass: Next.js build thành công, route static/dynamic được generate. |

## Quy Tắc Bảo Trì

- UI source giữ tiếng Việt UTF-8 đúng, không dùng chuỗi mojibake trong test hoặc label.
- Evidence frontend mới đặt dưới `tests/frontend/` hoặc thư mục evidence chuyên biệt trong `tests/`.
- Khi thay đổi layout, route hoặc runtime config, cập nhật README và evidence tương ứng.

dev by ambrouse
