# Backend Source Clean

- Cập nhật: 2026-05-29
- Service: source-clean
- Source liên quan: `apps/api/src/config/environment.ts`, `apps/api/src/app.module.ts`, `scripts/prepare-generated.mjs`

## Thay Đổi Chính

- Backend config đọc `.env` trước, sau đó dùng `.env.example` làm cấu hình mẫu, không hardcode URL model trong logic runtime.
- `AppModule` được format lại để danh sách controller/provider dễ review.
- Script generated tránh cảnh báo spawn args với shell trên Windows.
- Active backend source/test đã được sửa mojibake tiếng Việt.

## Validation

| Evidence | Nội dung |
| --- | --- |
| [tests/backend tests/source-clean/validation.md](<../../tests/backend tests/source-clean/validation.md>) | Validation backend source clean và blocker runtime DB nếu Docker chưa mở. |

dev by ambrouse
