# Plan: frontend-branding-dashboard-prompt

- Created: 2026-05-26 14:16
- Updated: 2026-05-26 14:34
- Status: completed
- Related log: logs/implementation/frontend-branding-dashboard-prompt-20260526.md
- Related doc: docs/task/frontend-branding-dashboard-prompt-20260526.md

## Goal

Chuẩn hóa branding frontend bằng `logo.png`, bỏ phần giải thích flow gây rối dưới dashboard canvas, sửa prompt dashboard để load rõ ràng từ API/DB, và thay copy mô tả rỗng bằng nội dung product rõ nghĩa.

## Scope

- In: Next metadata, favicon/icon, navbar brand, social preview, trang chủ, dashboard Prompt panel, log/doc/plan.
- Out: đổi business logic backend agent, đổi catalog seed, đổi Docker/nginx trừ khi phát hiện blocker trực tiếp cho prompt API.

## Skills

- `plan-skill`
- `frontend-skill`
- `logging-skill`
- `testing-skill` khi verify

## Phases

| Phase | Goal | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Rà metadata/logo/copy/dashboard prompt | done | `rg` frontend |
| 2 | Sửa frontend branding và dashboard | done | diff code |
| 3 | Kiểm prompt API/UI và copy | done | API 7110, screenshot |
| 4 | Test/typecheck và chụp evidence | done | command output, screenshot |
| 5 | Cập nhật log/doc/plan đóng task | done | log/doc updated |

## Verification

- `corepack pnpm --filter @retail-agent/web typecheck`
- `corepack pnpm --filter @retail-agent/web test`
- Kiểm tra ảnh chụp dashboard/trang chủ nếu server chạy được.
- Kiểm tra `GET /api/v1/prompt-settings` trên API build mới hoặc ghi rõ cần restart API nếu server cũ.

## Close Criteria

- Frontend dùng logo thống nhất ở navbar/favicon/social metadata.
- Dashboard không còn bảng giải thích flow dưới canvas.
- Prompt panel hiển thị rõ, có lỗi dễ hiểu khi API chưa restart.
- Copy marketing rỗng đã bỏ hoặc thay bằng nội dung vận hành/sản phẩm cụ thể.
- Log/doc/plan cập nhật đủ để phiên sau tiếp tục không bị trôi.
