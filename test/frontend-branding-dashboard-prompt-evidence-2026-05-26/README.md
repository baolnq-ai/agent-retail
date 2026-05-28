# Evidence frontend branding dashboard prompt 2026-05-26

Thư mục này lưu ảnh kiểm tra cho task chuẩn hóa logo/copy và dashboard prompt.

## Ảnh

| File | Nội dung |
| --- | --- |
| `app/home-logo-copy.png` | Trang chủ dùng logo `logo.png`, navbar và copy mới. |
| `app/dashboard-tabs-no-flow-table.png` | Dashboard giữ canvas, không còn bảng giải thích flow dài dưới canvas trong tab mặc định. |
| `app/dashboard-prompt-tab-api-old-message.png` | Tab Prompt riêng; UI báo rõ khi API đang chạy bản cũ chưa có `/api/v1/prompt-settings`. |

## Kiểm tra prompt

- API build mới được chạy tạm trên port `7110`.
- `GET /api/v1/prompt-settings` trả `200`, có prompt `sales-system`, source `default`.
- Nếu dashboard ở port `7000` vẫn trỏ API cũ `7010`, cần restart backend để nhận controller mới.
