# README banner và CI polish

Ngày: 2026-05-28

## Mục tiêu

Sửa CI đang fail sau lần push Docker release, làm lại banner README dạng GIF wide không bị cắt trên GitHub, và polish phần đầu README để trình bày đẹp hơn nhưng vẫn giữ nội dung kỹ thuật đúng.

## Thay đổi chính

- Sửa intent detection để câu hỏi "sản phẩm này bảo hành thế nào" không bị route nhầm sang policy.
- Sửa user analysis để câu "cho nhiều sản phẩm hơn" được hiểu là `recommend` với `retrievalMode=alternatives`.
- Tạo lại `apps/web/public/banner.gif` kích thước `1280x520`, 28 frame, crop vào canvas agent đang chạy.
- Cập nhật README hero, badge, navigation, metadata table và quick-start cards.

## Verify

- `corepack pnpm --filter @retail-agent/api test`: pass 95/95.
- `corepack pnpm prepare:generated`: pass.
- `corepack pnpm typecheck`: pass.
- `corepack pnpm build`: pass.
- Docker Compose config full/dev: pass.

## Ghi chú

- Không đổi port, Docker image tag hoặc compose contract.
- Banner là GIF thật từ dashboard evidence, không phải ảnh minh họa tĩnh.
