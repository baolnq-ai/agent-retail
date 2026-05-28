# Frontend branding, dashboard prompt và copy 2026-05-26

Tài liệu này ghi lại quyết định để các phiên sau không sửa lệch.

## Quyết định

- `logo.png` là logo dự án và phải được dùng thống nhất trên frontend: navbar, favicon/app icon, ảnh chia sẻ link và metadata.
- Dashboard agent chỉ giữ canvas trực quan và khu vực Prompt. Không hiển thị bảng giải thích từng dòng flow dưới canvas vì làm rối giao diện vận hành.
- Khu vực dưới canvas vẫn dùng tab: `Dashboard` giữ trạng thái bình thường, `Prompt` mở editor riêng. Không dồn prompt vào canvas.
- Prompt dashboard phải đọc từ API `/api/v1/prompt-settings`, dữ liệu lưu PostgreSQL bảng `PromptSetting`.
- Nếu prompt không load, UI phải báo lỗi rõ: API chưa restart, endpoint 404, DB chưa push hoặc chưa đăng nhập khi lưu/reset.
- Copy frontend phải mô tả giá trị thật của sản phẩm/hệ thống, không dùng câu chung chung như "Giao diện dễ xem ngày và đêm".

## Khu vực cần kiểm

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/app-shell.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/agent-dashboard/agent-dashboard-client.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/public/`

## Verify mong muốn

- Typecheck và test frontend pass.
- Mở trang chủ thấy logo thật thay cho chữ `RH`.
- Metadata/favicons trỏ tới logo hoặc ảnh social preview thống nhất.
- Dashboard không còn bảng flow explanation dưới canvas.
- Prompt panel load danh sách prompt hoặc hiện lỗi có hướng xử lý rõ.

## Kết quả triển khai

- Logo được copy vào `apps/web/public/logo.png`, `apps/web/public/og-image.png`, `apps/web/public/apple-touch-icon.png` và `apps/web/src/app/icon.png`.
- Metadata, Open Graph, Twitter card và manifest dùng tên `NTC AI Retail Agent`.
- Navbar dùng ảnh logo thay cho ký hiệu chữ `RH`.
- Trang chủ bỏ câu mô tả chung chung, thay bằng mô tả catalog, giỏ hàng và dashboard trace.
- Dashboard bỏ render `TraceFlowBoard` trong tab mặc định; tab `Prompt` vẫn tách riêng.
- Prompt UI báo rõ khi API cũ chưa có `/api/v1/prompt-settings`.
