# Backend Validation: Setup Port 3100-3150

- Ngày: 29-05-2026
- Runtime: `setup.ps1` hidden mode

## Kết Quả

| Kiểm tra | Kết quả |
| --- | --- |
| `.\setup.ps1` | Pass, exit `0` |
| Docker provider containers | PostgreSQL `3132`, Redis `3139`, Qdrant `3133/3134`, nginx `3120` running |
| API health trực tiếp | `GET http://127.0.0.1:3110/health` trả HTTP `200` |
| API health qua nginx | `GET http://127.0.0.1:3120/health` trả HTTP `200` |
| Product API qua nginx | `GET http://127.0.0.1:3120/api/v1/products` trả HTTP `200` với dữ liệu catalog thật |
| Validation suite | `corepack pnpm validate` pass, 95 API tests |

## Đánh Giá

API/Web/nginx đã dùng đúng dải `3100-3150`. Lỗi `502 Bad Gateway` không còn tái hiện trên đường nginx sau setup.

dev by ambrouse
