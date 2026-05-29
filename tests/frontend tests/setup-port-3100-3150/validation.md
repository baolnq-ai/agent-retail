# Frontend Validation: Setup Port 3100-3150

- Ngày: 29-05-2026
- Runtime: `setup.ps1` hidden mode

## Kết Quả

| Kiểm tra | Kết quả |
| --- | --- |
| Web trực tiếp | `GET http://127.0.0.1:3100/agent-dashboard` trả HTTP `200` |
| Web qua nginx | `GET http://127.0.0.1:3120/agent-dashboard` trả HTTP `200` |
| Root qua nginx | `GET http://127.0.0.1:3120` trả HTTP `200` |
| Screenshot | `screenshots/nginx-agent-dashboard-3120.png` |
| Frontend tests | `corepack pnpm --filter @retail-agent/web test` pass, 4 tests |

## Đánh Giá

Frontend chạy đúng port `3100`, nginx entry `3120` proxy được vào Web, không còn trang `502 Bad Gateway`.

dev by ambrouse
