# Plan: sửa lỗi setup chạy lên bị 502 Bad Gateway

Ngày: 29-05-2026

## Mục tiêu
- Chạy dự án bằng `setup.ps1` đúng theo luồng chuẩn.
- Xác định nguyên nhân nginx trả `502 Bad Gateway`.
- Chuyển toàn bộ port runtime sang dải `3100-3150` theo yêu cầu mới.
- Sửa script/config/code để setup tự dọn port và process cũ của đúng dự án, sau đó dựng API/Web/nginx chạy được.
- Ghi lại kiểm thử thật và log triển khai theo skill.

## Các bước
1. Kiểm tra nhanh config runtime, port, container và log hiện tại.
2. Chạy `setup.ps1` bằng PowerShell để tái hiện lỗi.
3. Kiểm tra nginx upstream, API/Web process, PID file và health endpoint.
4. Đổi port mặc định/local env sang Web `3100`, API `3110`, nginx `3120`, PostgreSQL `3132`, Qdrant `3133/3134`, Redis `3139`.
5. Sửa nguyên nhân gốc, ưu tiên script setup/stop hoặc config proxy nếu sai.
6. Chạy lại setup, test URL qua nginx và service trực tiếp.
7. Cập nhật README/docs/log/test evidence, rồi chuyển plan sang `finished`.

## Tiêu chí hoàn thành
- `setup.ps1` chạy được hoặc fail với lỗi hạ tầng thật không che giấu.
- Không còn 502 do upstream API/Web chưa sẵn sàng hoặc port/process cũ.
- Có evidence test request thật và ghi chú nếu còn blocker ngoài code.

## Kết Quả
- Đã đổi runtime sang dải `3100-3150`: Web `3100`, API `3110`, nginx `3120`, PostgreSQL `3132`, Qdrant `3133/3134`, Redis `3139`.
- `setup.ps1` hidden mode chạy xong exit `0`.
- `GET http://127.0.0.1:3120`, `/health`, `/agent-dashboard`, `/api/v1/products` đều trả HTTP `200`.
- `corepack pnpm validate` pass với 95 API tests.
- `corepack pnpm --filter @retail-agent/web test` pass với 4 frontend tests.
- Screenshot dashboard qua nginx đã lưu tại `tests/frontend tests/setup-port-3100-3150/screenshots/nginx-agent-dashboard-3120.png`.
