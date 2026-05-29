# Evidence dashboard prompt và Qdrant 2026-05-26

Thư mục này lưu ảnh và kết quả kiểm tra cho thay đổi dashboard/prompt/Qdrant ngày 2026-05-26.

## Phạm vi

- Dashboard agent: kiểm tra legend không đè node đầu flow sau khi có trace thật.
- Prompt settings: kiểm tra API mới đọc prompt từ PostgreSQL.
- Search Agent: kiểm tra nhánh embedding dùng Qdrant thay cho heuristic text.

## Ảnh

| File | Ý nghĩa |
| --- | --- |
| `app/dashboard-legend-right-fixed.png` | Ảnh chụp dashboard sau khi chuyển legend sang góc phải, không che cụm node trái. |
| `app/dashboard-with-trace-legend-wait.png` | Ảnh trước khi sửa, dùng để đối chiếu lỗi legend che node. |

## Lệnh đã chạy

```bash
corepack pnpm --filter @retail-agent/web typecheck
corepack pnpm --filter @retail-agent/web test
corepack pnpm --filter @retail-agent/api db:generate
corepack pnpm --filter @retail-agent/api db:push
corepack pnpm --filter @retail-agent/api test
docker compose -f infra/docker/docker-compose.yml config --quiet
git diff --check
```

## Kết quả

- Web typecheck/test: pass.
- API test: pass 94/94.
- Prompt API trên API tạm port `7110`: `GET /api/v1/prompt-settings` trả 200 và có prompt `sales-system` từ DB.
- Dashboard screenshot thật: file `app/dashboard-legend-right-fixed.png` cho thấy legend không còn phủ lên node flow đầu.
