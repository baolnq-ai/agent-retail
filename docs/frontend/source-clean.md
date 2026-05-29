# Frontend Source Clean

- Cập nhật: 2026-05-29
- Service: source-clean
- Source liên quan: `apps/web/tests/runtime-commerce-routes.mjs`, `apps/web/src/app/`

## Thay Đổi Chính

- Sửa mojibake trong runtime route assertions để khớp tiếng Việt UTF-8 của UI.
- Giữ nguyên cấu trúc Next.js hiện có, không refactor layout hoặc route ngoài phạm vi clean source.
- Bổ sung evidence frontend theo cấu trúc skill mới.

## Validation

| Evidence | Nội dung |
| --- | --- |
| [tests/frontend tests/source-clean/validation.md](<../../tests/frontend tests/source-clean/validation.md>) | Validation frontend source clean và blocker screenshot nếu thiếu browser tool. |

dev by ambrouse
